using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using System.Collections.Concurrent;
using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Gymind.API.Services;

public class CheckInValidationException : InvalidOperationException
{
    public CheckInValidationException(string message, int statusCode = StatusCodes.Status400BadRequest)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public int StatusCode { get; }
}

public interface ICheckInService
{
    Task<object> MobileQrCheckInAsync(long userId, QrScanDto dto);
    Task<object> ManualCheckInAsync(CreateCheckInRequest request);
    Task<object> CheckOutAsync(long memberId, string method);
}

public class CheckInService : ICheckInService
{
    private const int MinimumGeofenceRadiusMeters = 50;
    private const int MaximumGeofenceRadiusMeters = 150;
    private const string StaticQrPrefix = "GYMIND_BRANCH";
    private static readonly TimeSpan FailedScanWindow = TimeSpan.FromMinutes(1);
    private static readonly ConcurrentDictionary<long, Queue<DateTime>> FailedScanAttempts = new();
    private readonly ApplicationDbContext _context;
    private readonly BranchQrTokenService _qrTokenService;
    private readonly ICurrentUser _currentUser;
    private readonly IMemberBranchAccessService _memberBranchAccessService;
    private readonly ILogger<CheckInService> _logger;

    public CheckInService(
        ApplicationDbContext context,
        BranchQrTokenService qrTokenService,
        ICurrentUser currentUser,
        IMemberBranchAccessService memberBranchAccessService,
        ILogger<CheckInService> logger)
    {
        _context = context;
        _qrTokenService = qrTokenService;
        _currentUser = currentUser;
        _memberBranchAccessService = memberBranchAccessService;
        _logger = logger;
    }

    public async Task<object> MobileQrCheckInAsync(long userId, QrScanDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == userId);
        var member = user == null
            ? null
            : await _context.Members.FirstOrDefaultAsync(item => item.UserId == user.Id);

        if (member == null)
        {
            throw new CheckInValidationException("Member profile not found.");
        }

        if (!user!.IsActive)
        {
            throw new CheckInValidationException("User account is inactive.", StatusCodes.Status401Unauthorized);
        }

        if (IsRateLimited(member.Id))
        {
            throw new CheckInValidationException("Too many failed QR attempts. Please wait a moment and try again.", StatusCodes.Status429TooManyRequests);
        }

        long? parsedBranchId = null;
        try
        {
            var qr = ParseBranchQr(dto.QrPayload);
            parsedBranchId = qr.BranchId;

            var branch = await _context.Branches.FirstOrDefaultAsync(item => item.Id == qr.BranchId);
            if (branch == null)
            {
                throw new CheckInValidationException("Invalid QR code.");
            }

            if (!branch.QrCodeIsActive)
            {
                throw new CheckInValidationException("This branch QR is no longer valid. Please scan the latest printed QR.");
            }

            if (!string.IsNullOrWhiteSpace(qr.Token) &&
                (string.IsNullOrWhiteSpace(branch.QrCodeToken) ||
                 !string.Equals(branch.QrCodeToken, qr.Token, StringComparison.Ordinal)))
            {
                _logger.LogWarning("QR token mismatch for branch {BranchId}.", branch.Id);
                throw new CheckInValidationException("This branch QR is no longer valid. Please scan the latest printed QR.");
            }

            if (!branch.IsActive)
            {
                throw new CheckInValidationException("This branch is not currently active.");
            }

            if (!dto.Latitude.HasValue || !dto.Longitude.HasValue)
            {
                throw new CheckInValidationException("Location is required for QR check-in.");
            }

            await ValidateMemberCanAttendAsync(member, branch);

            if (!branch.Lat.HasValue || !branch.Lng.HasValue)
            {
                throw new CheckInValidationException("Branch location is not configured. Please contact staff.");
            }

            var radiusMeters = GetRadiusMeters(branch);
            var distanceMeters = CalculateDistanceMeters(branch.Lat.Value, branch.Lng.Value, dto.Latitude.Value, dto.Longitude.Value);
            if (distanceMeters > radiusMeters)
            {
                throw new CheckInValidationException("You are outside this branch check-in range.");
            }

            var checkInTime = DateTime.UtcNow;
            CheckIn checkIn;
            var existingOpenSession = await _context.CheckIns
                .Where(item => item.MemberId == member.Id && item.CheckOutTime == null)
                .OrderByDescending(item => item.CheckInTime)
                .FirstOrDefaultAsync();

            if (existingOpenSession != null)
            {
                _context.AuditLogs.Add(new AuditLog
                {
                    UserId = userId,
                    Action = "QR_CHECK_IN_DUPLICATE_ACTIVE",
                    TableName = "check_ins",
                    RecordId = existingOpenSession.Id,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                return BuildActiveCheckInResult(existingOpenSession, branch);
            }

            await using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                checkIn = new CheckIn
                {
                    MemberId = member.Id,
                    BranchId = branch.Id,
                    CheckInTime = checkInTime,
                    LastSeenAt = checkInTime,
                    Status = AppStatuses.CheckInCheckedIn,
                    Method = "QR_GEOFENCE"
                };

                _context.CheckIns.Add(checkIn);
                try
                {
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch (DbUpdateException ex) when (IsUniqueActiveCheckInViolation(ex))
                {
                    await transaction.RollbackAsync();
                    _context.Entry(checkIn).State = EntityState.Detached;
                    var activeSession = await _context.CheckIns
                        .Where(item => item.MemberId == member.Id && item.CheckOutTime == null)
                        .OrderByDescending(item => item.CheckInTime)
                        .FirstOrDefaultAsync();

                    if (activeSession != null)
                    {
                        return BuildActiveCheckInResult(activeSession, branch);
                    }

                    throw new CheckInValidationException("You already have an active check-in. Please check out first.", StatusCodes.Status409Conflict);
                }
            }

            var currentOccupancy = await _context.CheckIns.CountAsync(item => item.BranchId == branch.Id && (!item.CheckOutTime.HasValue || item.CheckOutTime.Value > DateTime.UtcNow));
            _context.AuditLogs.Add(new AuditLog
            {
                UserId = userId,
                Action = "QR_CHECK_IN_SUCCESS",
                TableName = "check_ins",
                RecordId = checkIn.Id,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            return new
            {
                success = true,
                message = "Check-in successful.",
                branchId = branch.Id,
                branchName = branch.Name,
                checkInTimeUtc = checkInTime,
                currentOccupancy,
                capacity = branch.Capacity
            };
        }
        catch (CheckInValidationException ex)
        {
            if (!IsDuplicateActiveCheckIn(ex))
            {
                RegisterFailedScan(member.Id);
            }

            await TryLogFailedQrScan(userId, member.Id, parsedBranchId, ex.Message, dto, IsDuplicateActiveCheckIn(ex));
            throw;
        }
    }

    public async Task<object> ManualCheckInAsync(CreateCheckInRequest request)
    {
        if (!request.MemberId.HasValue)
        {
            throw new CheckInValidationException("Member is required.");
        }

        var member = await _context.Members.FirstOrDefaultAsync(item => item.Id == request.MemberId.Value);
        if (member == null)
        {
            throw new CheckInValidationException("Member not found.");
        }

        if ((_currentUser.IsInRole(AppRoles.Staff) || _currentUser.IsInRole(AppRoles.BranchManager)) &&
            !_currentUser.BranchId.HasValue)
        {
            throw new CheckInValidationException("No branch assigned to this user.", StatusCodes.Status403Forbidden);
        }

        if ((_currentUser.IsInRole(AppRoles.Staff) || _currentUser.IsInRole(AppRoles.BranchManager)) &&
            request.BranchId.HasValue &&
            request.BranchId.Value != _currentUser.BranchId!.Value)
        {
            throw new CheckInValidationException("Cannot check in members outside your assigned branch.", StatusCodes.Status403Forbidden);
        }

        var branchId = (_currentUser.IsInRole(AppRoles.Staff) || _currentUser.IsInRole(AppRoles.BranchManager))
            ? _currentUser.BranchId
            : request.BranchId ?? _currentUser.BranchId ?? member.HomeBranchId;
        var branch = branchId.HasValue
            ? await _context.Branches.FirstOrDefaultAsync(item => item.Id == branchId.Value && item.IsActive)
            : null;

        if (branch == null)
        {
            throw new CheckInValidationException("Active branch is required.");
        }

        await ValidateMemberCanAttendAsync(member, branch);

        var openSession = await _context.CheckIns
            .Where(item => item.MemberId == member.Id && item.CheckOutTime == null)
            .OrderByDescending(item => item.CheckInTime)
            .FirstOrDefaultAsync();

        if (openSession != null)
        {
            throw new CheckInValidationException("Member already has an active attendance session.", StatusCodes.Status409Conflict);
        }

        var checkIn = new CheckIn
        {
            MemberId = member.Id,
            BranchId = branch.Id,
            Method = request.Method ?? "STAFF_MANUAL",
            CheckInTime = DateTime.UtcNow,
            LastSeenAt = DateTime.UtcNow,
            Status = AppStatuses.CheckInCheckedIn
        };

        _context.CheckIns.Add(checkIn);
        await _context.SaveChangesAsync();

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "MANUAL_CHECK_IN",
            TableName = "check_ins",
            RecordId = checkIn.Id,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new
        {
            message = "Check-in recorded successfully.",
            checkIn
        };
    }

    public async Task<object> CheckOutAsync(long memberId, string method)
    {
        var activeCheckIn = await _context.CheckIns
            .Where(item => item.MemberId == memberId && item.CheckOutTime == null)
            .OrderByDescending(item => item.CheckInTime)
            .FirstOrDefaultAsync();

        if (activeCheckIn == null)
        {
            return new { message = "No active attendance session to close.", checkedOut = false };
        }

        var now = DateTime.UtcNow;
        activeCheckIn.CheckOutTime = now;
        activeCheckIn.LastSeenAt = now;
        activeCheckIn.Status = AppStatuses.CheckInCheckedOut;
        activeCheckIn.CheckOutMethod = string.IsNullOrWhiteSpace(method) ? "manual" : method;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId == 0 ? null : _currentUser.UserId,
            Action = "CHECK_OUT",
            TableName = "check_ins",
            RecordId = activeCheckIn.Id,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return new { message = "Checked out successfully.", checkedOut = true, checkOutTime = now };
    }

    private async Task ValidateMemberCanAttendAsync(Member member, Branch branch)
    {
        if (!member.IsActive)
        {
            throw new CheckInValidationException("Member is inactive.");
        }

        if (member.UserId.HasValue)
        {
            var userActive = await _context.Users
                .Where(item => item.Id == member.UserId.Value)
                .Select(item => item.IsActive)
                .FirstOrDefaultAsync();
            if (!userActive)
            {
                throw new CheckInValidationException("User account is inactive.", StatusCodes.Status401Unauthorized);
            }
        }

        if (member.GymId != branch.GymId)
        {
            throw new CheckInValidationException("Member does not belong to this gym.");
        }

        if (branch.GymId.HasValue)
        {
            var gymActive = await _context.Gyms
                .Where(item => item.Id == branch.GymId.Value)
                .Select(item => item.IsActive)
                .FirstOrDefaultAsync();
            if (!gymActive)
            {
                throw new CheckInValidationException("Gym is inactive.");
            }
        }

        await _memberBranchAccessService.ValidateBranchAccessForCheckInAsync(member, branch);
    }

    private static int GetRadiusMeters(Branch branch)
    {
        var radiusMeters = branch.RangeKm.HasValue ? (int)Math.Round(branch.RangeKm.Value * 1000m) : 100;
        return Math.Clamp(radiusMeters, MinimumGeofenceRadiusMeters, MaximumGeofenceRadiusMeters);
    }

    private static double CalculateDistanceMeters(double lat1, double lng1, double lat2, double lng2)
    {
        const double earthRadiusMeters = 6371000;
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLng = DegreesToRadians(lng2 - lng1);
        var a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(DegreesToRadians(lat1)) *
            Math.Cos(DegreesToRadians(lat2)) *
            Math.Sin(dLng / 2) *
            Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusMeters * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;

    private (long BranchId, string? Token) ParseBranchQr(string qrPayload)
    {
        var payload = NormalizeQrPayload(qrPayload);
        if (string.IsNullOrWhiteSpace(payload))
        {
            throw new CheckInValidationException("Invalid QR code.");
        }

        if (payload.StartsWith("FHQR|", StringComparison.Ordinal))
        {
            if (_qrTokenService.TryValidateStaticBranch(payload, out var signedBranchId, out _))
            {
                return (signedBranchId, null);
            }

            throw new CheckInValidationException("Invalid QR code.");
        }

        var parts = payload.Split('|', StringSplitOptions.TrimEntries);
        if (parts.Length != 3 || !string.Equals(parts[0], StaticQrPrefix, StringComparison.Ordinal))
        {
            throw new CheckInValidationException("Invalid QR code.");
        }

        if (!long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var branchId) ||
            branchId <= 0 ||
            string.IsNullOrWhiteSpace(parts[2]))
        {
            throw new CheckInValidationException("Invalid QR code.");
        }

        return (branchId, parts[2]);
    }

    private static object BuildActiveCheckInResult(CheckIn activeSession, Branch branch)
    {
        return new
        {
            success = true,
            alreadyCheckedIn = true,
            message = "You are already checked in.",
            branchId = activeSession.BranchId ?? branch.Id,
            branchName = branch.Name,
            checkInId = activeSession.Id,
            checkInTimeUtc = activeSession.CheckInTime?.ToUniversalTime()
        };
    }

    private static string NormalizeQrPayload(string qrPayload)
    {
        var payload = (qrPayload ?? string.Empty).Trim();
        if (payload.Length == 0)
        {
            return string.Empty;
        }

        payload = Uri.UnescapeDataString(payload);
        var staticIndex = payload.IndexOf(StaticQrPrefix, StringComparison.Ordinal);
        if (staticIndex >= 0)
        {
            return payload[staticIndex..].Trim();
        }

        var legacyIndex = payload.IndexOf("FHQR|", StringComparison.Ordinal);
        if (legacyIndex >= 0)
        {
            return payload[legacyIndex..].Trim();
        }

        return payload;
    }

    private static bool IsRateLimited(long memberId)
    {
        var now = DateTime.UtcNow;
        var queue = FailedScanAttempts.GetOrAdd(memberId, _ => new Queue<DateTime>());
        lock (queue)
        {
            while (queue.Count > 0 && now - queue.Peek() > FailedScanWindow)
            {
                queue.Dequeue();
            }

            return queue.Count >= 5;
        }
    }

    private static void RegisterFailedScan(long memberId)
    {
        var now = DateTime.UtcNow;
        var queue = FailedScanAttempts.GetOrAdd(memberId, _ => new Queue<DateTime>());
        lock (queue)
        {
            while (queue.Count > 0 && now - queue.Peek() > FailedScanWindow)
            {
                queue.Dequeue();
            }

            queue.Enqueue(now);
        }
    }

    private static bool IsDuplicateActiveCheckIn(CheckInValidationException ex) =>
        ex.StatusCode == StatusCodes.Status409Conflict &&
        ex.Message.Contains("active check-in", StringComparison.OrdinalIgnoreCase);

    private static bool IsUniqueActiveCheckInViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException postgres &&
        postgres.SqlState == PostgresErrorCodes.UniqueViolation;

    private async Task LogFailedQrScan(long userId, long memberId, long? branchId, string reason, QrScanDto dto, bool duplicateActiveCheckIn)
    {
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = userId == 0 ? null : userId,
            Action = duplicateActiveCheckIn ? "QR_CHECK_IN_DUPLICATE_ACTIVE" : "QR_SCAN_FAILED",
            TableName = "check_ins",
            RecordId = branchId ?? memberId,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    private async Task TryLogFailedQrScan(long userId, long memberId, long? branchId, string reason, QrScanDto dto, bool duplicateActiveCheckIn)
    {
        try
        {
            await LogFailedQrScan(userId, memberId, branchId, reason, dto, duplicateActiveCheckIn);
        }
        catch
        {
            // A failed audit write must not turn a normal QR validation error into HTTP 500.
        }
    }
}
