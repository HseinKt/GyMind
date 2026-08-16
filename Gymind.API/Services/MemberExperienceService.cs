using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Helpers;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Services;

public class MemberExperienceService
{
    private readonly ApplicationDbContext _context;

    public MemberExperienceService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AuthResponseDto> CreateLoginResponseAsync(
        User user,
        Role role,
        string deviceId,
        JwtHelper jwtHelper)
    {
        // Device approval is not enforced for sign-in. QR/geofence validation is handled only
        // by attendance endpoints, so member login works from anywhere.
        return await IssueSessionAsync(user, role, jwtHelper);
    }

    public async Task<bool> ValidateOtpAsync(long userId, string otp, string deviceId)
    {
        var record = await _context.OtpRecords
            .Where(item => item.UserId == userId &&
                item.DeviceId == deviceId &&
                !item.IsUsed)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync();

        if (record == null)
        {
            return false;
        }

        if (record.ExpiresAt < DateTime.UtcNow)
        {
            return false;
        }

        return string.Equals(record.OtpCode, otp, StringComparison.Ordinal);
    }

    public async Task ApproveDeviceAsync(long userId, string deviceId)
    {
        var binding = await _context.DeviceApprovals
            .OrderByDescending(item => item.LastUpdatedAt)
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (binding == null)
        {
            binding = new DeviceApproval
            {
                UserId = userId,
                DeviceId = deviceId,
                CreatedAt = DateTime.UtcNow
            };
            _context.DeviceApprovals.Add(binding);
        }

        binding.DeviceId = deviceId;
        binding.IsApproved = true;
        binding.LastUpdatedAt = DateTime.UtcNow;

        var otpRecords = await _context.OtpRecords
            .Where(item => item.UserId == userId &&
                item.DeviceId == deviceId &&
                !item.IsUsed)
            .ToListAsync();

        foreach (var record in otpRecords)
        {
            record.IsUsed = true;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<AuthResponseDto> IssueSessionAsync(User user, Role role, JwtHelper jwtHelper)
    {
        var accessToken = jwtHelper.GenerateToken(user, role);
        var refreshToken = Guid.NewGuid().ToString("N");

        _context.RefreshSessions.Add(new RefreshSession
        {
            UserId = user.Id,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(14),
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        var deviceApproved = await _context.DeviceApprovals
            .AnyAsync(item => item.UserId == user.Id && item.IsApproved);

        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.UserId == user.Id);

        var membership = member == null
            ? null
            : await _context.MemberMemberships
                .Include(mm => mm.Plan)
                .FirstOrDefaultAsync(mm => mm.MemberId == member.Id);

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var remainingDays = membership?.EndDate is null
            ? 0
            : Math.Max(0, membership.EndDate.Value.DayNumber - now.DayNumber);

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            UserId = user.Id,
            MemberId = member?.Id,
            FullName = user.FullName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            ProfilePhotoUrl = user.ProfilePhotoUrl,
            Role = role.Name,
            GymId = user.GymId ?? member?.GymId,
            BranchId = user.BranchId,
            HomeBranchId = member?.HomeBranchId,
            MembershipActive = AppStatuses.IsActiveMembership(membership?.Status),
            MembershipPlan = membership?.Plan?.Name ?? string.Empty,
            MembershipStatus = membership?.Status ?? AppStatuses.MembershipPending,
            RemainingDays = remainingDays,
            RequiresOtp = false,
            DeviceApproved = deviceApproved,
            QrCode = member?.QrCode
        };
    }

    public async Task<long?> ReadRefreshTokenAsync(string refreshToken)
    {
        var record = await _context.RefreshSessions
            .FirstOrDefaultAsync(item => item.RefreshToken == refreshToken);

        if (record == null)
        {
            return null;
        }

        if (record.RevokedAt.HasValue || record.ExpiresAt < DateTime.UtcNow)
        {
            return null;
        }

        return record.UserId;
    }

    public async Task UpdatePresenceAsync(long userId, LocationUpdateDto dto)
    {
        var presence = await _context.LocationPresences
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (presence == null)
        {
            presence = new LocationPresence
            {
                UserId = userId,
            };
            _context.LocationPresences.Add(presence);
        }

        presence.Latitude = (decimal)dto.Latitude;
        presence.Longitude = (decimal)dto.Longitude;
        presence.InsideGym = dto.InsideGym;
        presence.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public Task<LocationPresence?> GetPresenceAsync(long userId)
    {
        return _context.LocationPresences
            .FirstOrDefaultAsync(item => item.UserId == userId);
    }

    public async Task SaveWorkoutAsync(long userId, WorkoutSessionDto dto)
    {
        _context.WorkoutSessions.Add(new WorkoutSession
        {
            UserId = userId,
            DurationSeconds = dto.DurationSeconds,
            CompletedAt = dto.CompletedAt,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<WorkoutSession>> GetWorkoutsAsync(long userId)
    {
        return await _context.WorkoutSessions
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.CompletedAt)
            .Take(20)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<ApprovalQueueItemDto>> GetApprovalQueueAsync()
    {
        var queue = await (
            from device in _context.DeviceApprovals
            join user in _context.Users on device.UserId equals user.Id
            where !device.IsApproved
            orderby device.LastUpdatedAt descending
            select new ApprovalQueueItemDto
            {
                UserId = user.Id,
                MemberName = user.FullName ?? "Member",
                Email = user.Email ?? string.Empty,
                RequestType = "otp-device-approval",
                DeviceId = device.DeviceId,
                RequestedAt = device.LastUpdatedAt,
                Status = "pending"
            })
            .ToListAsync();

        return queue;
    }

    private async Task MarkOtpRecordsUsedAsync(long userId, string deviceId)
    {
        var existingRecords = await _context.OtpRecords
            .Where(item => item.UserId == userId &&
                item.DeviceId == deviceId &&
                !item.IsUsed)
            .ToListAsync();

        foreach (var record in existingRecords)
        {
            record.IsUsed = true;
        }
    }
}
