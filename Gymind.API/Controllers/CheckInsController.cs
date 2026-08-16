using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Helpers;
using Gymind.API.Models;
using Gymind.API.Security;
using Gymind.API.Services;
using System.Security.Claims;
using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CheckInsController : ControllerBase
{
    private const int MinimumGeofenceRadiusMeters = 50;
    private const int MaximumGeofenceRadiusMeters = 150;
    private readonly ApplicationDbContext _context;
    private readonly ICheckInService _checkInService;
    private readonly ICurrentUser _currentUser;

    public CheckInsController(ApplicationDbContext context, ICheckInService checkInService, ICurrentUser currentUser)
    {
        _context = context;
        _checkInService = checkInService;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetCheckIns(
        [FromQuery] long? memberId,
        [FromQuery] long? branchId,
        [FromQuery] string? range,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] bool suspiciousOnly = false,
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null)
    {
        var query = ApplyScope(_context.CheckIns
            .Include(c => c.Member)
            .Include(c => c.Branch)
            .AsQueryable());

        if (memberId.HasValue)
        {
            query = query.Where(c => c.MemberId == memberId.Value);
        }

        if (branchId.HasValue)
        {
            if ((_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff)) &&
                branchId != _currentUser.BranchId)
            {
                return Forbid();
            }

            query = query.Where(c => c.BranchId == branchId.Value);
        }

        var (fromUtc, toUtc) = ResolveDateWindow(range, from, to);
        if (fromUtc.HasValue)
        {
            query = query.Where(c => c.CheckInTime >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(c => c.CheckInTime < toUtc.Value);
        }

        var totalCount = await query.CountAsync();
        var safePageSize = Math.Clamp(pageSize ?? 200, 1, 200);
        var safePage = Math.Max(page ?? 1, 1);
        var orderedQuery = query.OrderByDescending(c => c.CheckInTime);
        var checkIns = suspiciousOnly
            ? await orderedQuery.Take(500).ToListAsync()
            : page.HasValue || pageSize.HasValue
                ? await orderedQuery.Skip((safePage - 1) * safePageSize).Take(safePageSize).ToListAsync()
                : await orderedQuery.Take(200).ToListAsync();
        var scopedMemberIds = checkIns.Where(item => item.MemberId.HasValue).Select(item => item.MemberId!.Value).Distinct().ToList();
        var historyStart = fromUtc ?? DateTime.UtcNow.Date.AddDays(-30);
        var history = await ApplyScope(_context.CheckIns.AsQueryable())
            .Where(item => item.MemberId.HasValue && scopedMemberIds.Contains(item.MemberId.Value) && item.CheckInTime >= historyStart)
            .OrderBy(item => item.MemberId)
            .ThenBy(item => item.CheckInTime)
            .ToListAsync();

        var scopedDtos = checkIns.Select(item => ToAttendanceDto(item, history)).ToList();
        if (suspiciousOnly)
        {
            scopedDtos = scopedDtos.Where(item => item.IsSuspicious).ToList();
            totalCount = scopedDtos.Count;
            if (page.HasValue || pageSize.HasValue)
            {
                scopedDtos = scopedDtos
                    .Skip((safePage - 1) * safePageSize)
                    .Take(safePageSize)
                    .ToList();
            }
        }

        var items = scopedDtos;
        if (page.HasValue || pageSize.HasValue)
        {
            return Ok(new PagedResultDto<AdminAttendanceDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize,
                TotalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)safePageSize))
            });
        }

        return Ok(items);
    }

    [HttpGet("active")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> GetActiveCheckIn()
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var member = await _context.Members
            .Where(item => item.UserId == userId && item.IsActive)
            .Select(item => new { item.Id })
            .FirstOrDefaultAsync();

        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var activeCheckIn = await _context.CheckIns
            .Include(item => item.Branch)
            .Where(item => item.MemberId == member.Id && item.CheckOutTime == null)
            .OrderByDescending(item => item.CheckInTime)
            .FirstOrDefaultAsync();

        if (activeCheckIn == null)
        {
            return Ok(new { hasActiveCheckIn = false });
        }

        var checkInTimeUtc = activeCheckIn.CheckInTime?.ToUniversalTime();
        var durationMinutes = checkInTimeUtc.HasValue
            ? Math.Max(0, (int)Math.Floor((DateTime.UtcNow - checkInTimeUtc.Value).TotalMinutes))
            : 0;

        return Ok(new
        {
            hasActiveCheckIn = true,
            checkInId = activeCheckIn.Id,
            branchId = activeCheckIn.BranchId,
            branchName = activeCheckIn.Branch?.Name,
            branchLatitude = activeCheckIn.Branch?.Lat,
            branchLongitude = activeCheckIn.Branch?.Lng,
            radiusMeters = activeCheckIn.Branch?.RangeKm.HasValue == true
                ? Math.Clamp((int)Math.Round(activeCheckIn.Branch.RangeKm.Value * 1000m), MinimumGeofenceRadiusMeters, MaximumGeofenceRadiusMeters)
                : 100,
            checkInTimeUtc,
            durationMinutes,
            status = activeCheckIn.Status
        });
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AttendanceRoles)]
    public async Task<IActionResult> CreateCheckIn([FromBody] CreateCheckInRequest request)
    {
        try
        {
            return Ok(await _checkInService.ManualCheckInAsync(request));
        }
        catch (CheckInValidationException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPost("one-day-pass")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> CreateOneDayPass()
    {
        var branchId = _currentUser.BranchId;
        if (!branchId.HasValue)
        {
            return BadRequest(new { message = "A staff branch assignment is required for one-day pass check-in." });
        }

        var branch = await _context.Branches.FirstOrDefaultAsync(item => item.Id == branchId.Value && item.IsActive);
        if (branch == null)
        {
            return BadRequest(new { message = "Assigned branch does not exist or is inactive." });
        }

        if (!CanManageBranch(branch))
        {
            return Forbid();
        }

        var checkInTime = DateTime.UtcNow;
        var autoCheckOutTime = checkInTime.AddMinutes(90);
        var checkIn = new CheckIn
        {
            MemberId = null,
            BranchId = branch.Id,
            CheckInTime = checkInTime,
            LastSeenAt = checkInTime,
            CheckOutTime = autoCheckOutTime,
            Status = AppStatuses.CheckInCheckedIn,
            Method = "ONE_DAY_PASS",
            CheckOutMethod = "AUTO_ONE_DAY_PASS_90_MIN"
        };

        _context.CheckIns.Add(checkIn);
        await _context.SaveChangesAsync();

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "ONE_DAY_PASS_CHECK_IN",
            TableName = "check_ins",
            RecordId = checkIn.Id,
            CreatedAt = checkInTime
        });
        await _context.SaveChangesAsync();

        return Ok(ToAttendanceDto(checkIn, []));
    }

    [HttpPost("auto-checkout")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> AutoCheckOut([FromBody] AutoCheckOutRequest request)
    {
        try
        {
            if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            {
                return Unauthorized();
            }

            var member = await _context.Members.FirstOrDefaultAsync(item => item.UserId == userId);
            if (member == null)
            {
                return BadRequest(new { message = "Member profile not found." });
            }

            var activeCheckIn = await _context.CheckIns
                .Where(item => item.MemberId == member.Id && item.CheckOutTime == null)
                .OrderByDescending(item => item.CheckInTime)
                .FirstOrDefaultAsync();

            if (activeCheckIn == null)
            {
                return Ok(new
                {
                    message = "No active attendance session to close.",
                    checkedOut = false,
                    distanceMeters = (double?)null,
                    radiusMeters = (int?)null,
                    branchId = (long?)null,
                    branchName = (string?)null,
                    checkOutTimeUtc = (DateTime?)null
                });
            }

            var branch = activeCheckIn.BranchId.HasValue
                ? await _context.Branches.FirstOrDefaultAsync(item => item.Id == activeCheckIn.BranchId.Value && item.IsActive)
                : null;

            if (branch == null || !branch.Lat.HasValue || !branch.Lng.HasValue)
            {
                return BadRequest(new { message = "Active attendance branch is missing geofence data." });
            }

            var radiusMeters = branch.RangeKm.HasValue
                ? (int)Math.Round(branch.RangeKm.Value * 1000m)
                : 100;
            radiusMeters = Math.Clamp(radiusMeters, MinimumGeofenceRadiusMeters, MaximumGeofenceRadiusMeters);

            var distanceMeters = CalculateDistanceMeters(
                branch.Lat.Value,
                branch.Lng.Value,
                request.Latitude,
                request.Longitude);

            if (distanceMeters <= radiusMeters)
            {
                var observedAt = request.Timestamp?.ToUniversalTime() ?? DateTime.UtcNow;
                activeCheckIn.LastSeenAt = observedAt;
                _context.AuditLogs.Add(new AuditLog
                {
                    UserId = _currentUser.UserId,
                    Action = "AUTO_CHECK_OUT_STILL_INSIDE",
                    TableName = "check_ins",
                    RecordId = activeCheckIn.Id,
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                return Ok(new
                {
                    message = "Member is still inside the branch radius.",
                    checkedOut = false,
                    distanceMeters = Math.Round(distanceMeters),
                    radiusMeters,
                    branchId = branch.Id,
                    branchName = branch.Name,
                    checkOutTimeUtc = (DateTime?)null
                });
            }

            var checkOutTime = DateTime.UtcNow;
            activeCheckIn.CheckOutTime = checkOutTime;
            activeCheckIn.LastSeenAt = checkOutTime;
            activeCheckIn.Status = AppStatuses.CheckInAutoCheckedOut;
            activeCheckIn.CheckOutMethod = string.IsNullOrWhiteSpace(request.Method) ? "geofence-exit" : request.Method;

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUser.UserId,
                Action = "AUTO_CHECK_OUT",
                TableName = "check_ins",
                RecordId = activeCheckIn.Id,
                CreatedAt = checkOutTime
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Member checked out automatically after leaving the branch geofence.",
                checkedOut = true,
                distanceMeters = Math.Round(distanceMeters),
                radiusMeters,
                branchId = branch.Id,
                branchName = branch.Name,
                checkOutTimeUtc = checkOutTime
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPost("checkout")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> CheckOut()
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var member = await _context.Members.FirstOrDefaultAsync(item => item.UserId == userId);
        if (member == null)
        {
            return BadRequest(new { message = "Member profile not found." });
        }

        return Ok(await _checkInService.CheckOutAsync(member.Id, "MOBILE_CHECKOUT"));
    }

    [HttpPost("{id:long}/manual-checkout")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> ManualCheckOut(long id)
    {
        var checkIn = await _context.CheckIns
            .Include(item => item.Branch)
            .FirstOrDefaultAsync(item => item.Id == id && item.CheckOutTime == null);

        if (checkIn == null)
        {
            return NotFound(new { message = "Open check-in not found." });
        }

        if (!CanManageCheckIn(checkIn))
        {
            return Forbid();
        }

        var now = DateTime.UtcNow;
        checkIn.CheckOutTime = now;
        checkIn.LastSeenAt = now;
        checkIn.Status = AppStatuses.CheckInCheckedOut;
        checkIn.CheckOutMethod = "ADMIN_MANUAL_CHECKOUT";

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "MANUAL_CHECK_OUT",
            TableName = "check_ins",
            RecordId = checkIn.Id,
            CreatedAt = now
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Manual checkout completed.", checkedOut = true, checkOutTime = now });
    }

    private static double CalculateDistanceMeters(
        double lat1,
        double lng1,
        double lat2,
        double lng2)
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

    private IQueryable<CheckIn> ApplyScope(IQueryable<CheckIn> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.Member))
        {
            var userId = _currentUser.UserId;
            var memberIds = _context.Members.Where(item => item.UserId == userId).Select(item => item.Id);
            return query.Where(item => item.MemberId.HasValue && memberIds.Contains(item.MemberId.Value));
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager) && !_currentUser.BranchId.HasValue)
        {
            return query.Where(item => false);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        if (_currentUser.GymId.HasValue)
        {
            var branchIds = _context.Branches.Where(item => item.GymId == _currentUser.GymId.Value).Select(item => item.Id);
            return query.Where(item => item.BranchId.HasValue && branchIds.Contains(item.BranchId.Value));
        }

        return query.Where(item => false);
    }

    private static (DateTime? FromUtc, DateTime? ToUtc) ResolveDateWindow(string? range, DateTime? from, DateTime? to)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var normalized = (range ?? string.Empty).Trim().ToLowerInvariant();
        DateTime? fromUtc = normalized switch
        {
            "1d" or "1day" or "day" or "today" => today,
            "7d" or "7day" or "7days" or "week" => today.AddDays(-6),
            "1m" or "1month" or "month" => today.AddMonths(-1),
            _ => from
        };
        var toUtc = normalized switch
        {
            "1d" or "1day" or "day" or "today" => today.AddDays(1),
            "7d" or "7day" or "7days" or "week" => now,
            "1m" or "1month" or "month" => now,
            _ => to
        };

        return (NormalizeUtc(fromUtc), NormalizeUtc(toUtc));
    }

    private static DateTime? NormalizeUtc(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
        };
    }

    private bool CanManageCheckIn(CheckIn checkIn)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (checkIn.Branch == null)
        {
            return false;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId.HasValue && checkIn.Branch.GymId == _currentUser.GymId;
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff))
        {
            return _currentUser.BranchId.HasValue && checkIn.BranchId == _currentUser.BranchId;
        }

        return false;
    }

    private bool CanManageBranch(Branch branch)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId.HasValue && branch.GymId == _currentUser.GymId;
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff))
        {
            return _currentUser.BranchId.HasValue && branch.Id == _currentUser.BranchId;
        }

        return false;
    }

    private static AdminAttendanceDto ToAttendanceDto(CheckIn checkIn, IReadOnlyCollection<CheckIn> history)
    {
        var suspicion = DetectSuspicion(checkIn, history);
        var isActive = IsActiveCheckIn(checkIn, DateTime.UtcNow);
        var isOneDayPass = IsOneDayPass(checkIn);
        return new AdminAttendanceDto
        {
            Id = checkIn.Id,
            MemberId = checkIn.MemberId,
            BranchId = checkIn.BranchId,
            BranchName = checkIn.Branch?.Name ?? "Not assigned",
            MemberName = isOneDayPass ? "One Day Pass" : checkIn.Member?.FullName ?? "Member",
            Type = isOneDayPass ? "Guest" : "Member",
            Status = isActive
                ? "Checked in"
                : checkIn.CheckOutTime.HasValue
                ? (IsAutoCheckOut(checkIn) ? "Auto checked out" : "Checked out")
                : "Checked in",
            At = checkIn.CheckInTime?.ToLocalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) ?? string.Empty,
            CheckInTime = checkIn.CheckInTime,
            CheckOutTime = checkIn.CheckOutTime,
            Source = isActive
                ? checkIn.Method ?? "Front desk"
                : $"{checkIn.Method ?? "Front desk"} -> {checkIn.CheckOutMethod ?? "manual"}",
            IsSuspicious = suspicion.IsSuspicious,
            SuspicionReason = suspicion.Reason,
            SuspicionLevel = suspicion.Level,
            AlertType = suspicion.IsSuspicious ? "SUS" : string.Empty,
            AlertMessage = suspicion.IsSuspicious ? suspicion.Reason : string.Empty
        };
    }

    private static (bool IsSuspicious, string Reason, string Level) DetectSuspicion(CheckIn checkIn, IReadOnlyCollection<CheckIn> history)
    {
        if (!checkIn.MemberId.HasValue || !checkIn.CheckInTime.HasValue)
        {
            return (false, string.Empty, "none");
        }

        var memberHistory = history
            .Where(item => item.MemberId == checkIn.MemberId && item.CheckInTime.HasValue)
            .OrderBy(item => item.CheckInTime)
            .ToList();

        var previous = memberHistory.LastOrDefault(item => item.CheckInTime < checkIn.CheckInTime);
        if (previous != null && previous.CheckOutTime == null)
        {
            return (true, "Duplicate check-in", "high");
        }

        var checkInDay = checkIn.CheckInTime.Value.Date;
        var todayCount = memberHistory.Count(item => item.CheckInTime?.Date == checkInDay);
        var repeatedDailyPattern = memberHistory
            .GroupBy(item => item.CheckInTime!.Value.Date)
            .Count(group => group.Count() >= 2) >= 2;
        if (todayCount >= 2 && repeatedDailyPattern)
        {
            return (true, "Repeated daily check-in pattern", "medium");
        }

        var completedDays = memberHistory
            .Where(item => item.CheckInTime!.Value.Date < checkInDay)
            .GroupBy(item => item.CheckInTime!.Value.Date)
            .Select(group => group.Count())
            .ToList();
        if (completedDays.Count >= 5)
        {
            var average = completedDays.Average();
            if (todayCount >= 3 && todayCount >= Math.Ceiling(average * 2d))
            {
                return (true, "Possible fraud", "medium");
            }
        }

        return (false, string.Empty, "none");
    }

    private static bool IsAutoCheckOut(CheckIn checkIn) =>
        string.Equals(AppStatuses.NormalizeCheckIn(checkIn.Status), AppStatuses.CheckInAutoCheckedOut, StringComparison.Ordinal) ||
        (checkIn.CheckOutMethod?.Contains("auto", StringComparison.OrdinalIgnoreCase) == true) ||
        (checkIn.CheckOutMethod?.Contains("geofence", StringComparison.OrdinalIgnoreCase) == true);

    private static bool IsOneDayPass(CheckIn checkIn) =>
        string.Equals(checkIn.Method, "ONE_DAY_PASS", StringComparison.OrdinalIgnoreCase);

    private static bool IsActiveCheckIn(CheckIn checkIn, DateTime now) =>
        !checkIn.CheckOutTime.HasValue || checkIn.CheckOutTime.Value > now;
}
