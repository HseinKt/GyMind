using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public ReportsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet("manager")]
    [Authorize(Roles = AppRoles.BranchManager)]
    [ProducesResponseType(typeof(ManagerReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ManagerReportDto>> GetManagerReport()
    {
        if (!_currentUser.BranchId.HasValue)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No branch assigned to this manager." });
        }

        var branch = await _context.Branches
            .FirstOrDefaultAsync(item => item.Id == _currentUser.BranchId.Value && item.IsActive);
        if (branch == null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No branch assigned to this manager." });
        }

        return Ok(await BuildManagerReportAsync(branch));
    }

    [HttpGet("branch/operations")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    [ProducesResponseType(typeof(BranchOperationsReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<BranchOperationsReportDto>> GetBranchOperationsReport()
    {
        var branchQuery = ApplyBranchScope(_context.Branches.AsQueryable());
        var branch = await branchQuery.OrderBy(item => item.Name).FirstOrDefaultAsync();
        if (branch == null)
        {
            return NotFound(new { message = "Assigned branch not found." });
        }

        var managerReport = await BuildManagerReportAsync(branch);
        return Ok(new BranchOperationsReportDto
        {
            BranchId = managerReport.BranchId,
            BranchName = managerReport.BranchName,
            Capacity = managerReport.BranchCapacity,
            UniqueMembersLoggedToday = managerReport.TotalMembersLoggedToday,
            TotalCheckInEventsToday = managerReport.CheckInOutSummary.CheckIns,
            ManualCheckOutsToday = managerReport.CheckInOutSummary.ManualCheckOuts,
            AutoCheckOutsToday = managerReport.CheckInOutSummary.AutoCheckOuts,
            CapacityByHour = managerReport.BranchCapacityByHour.Select(item => new BranchCapacityHourDto
            {
                Hour = item.Hour,
                Label = item.Label,
                ActivePeople = item.ActivePeopleCount,
                UtilizationPercent = item.UtilizationPercent
            }).ToList(),
            RecentCheckIns = managerReport.TodayCheckIns.Select(item => new AdminAttendanceDto
            {
                Id = item.Id,
                MemberId = item.MemberId,
                BranchId = managerReport.BranchId,
                MemberName = item.MemberName,
                Status = item.Status,
                At = item.CheckInTime?.ToLocalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) ?? string.Empty,
                CheckInTime = item.CheckInTime,
                CheckOutTime = item.CheckOutTime,
                Source = item.IsAutoCheckOut ? "Auto checkout" : "Attendance",
                IsSuspicious = false,
                SuspicionLevel = "none"
            }).ToList()
        });
    }

    [HttpGet("owner")]
    [Authorize(Roles = AppRoles.GymOwner)]
    [ProducesResponseType(typeof(OwnerReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<OwnerReportDto>> GetOwnerReport(
        [FromQuery] long? gymId,
        [FromQuery] long? branchId,
        [FromQuery] string? period)
    {
        var scopedGymId = await ResolveOwnedGymIdAsync(gymId);
        if (!scopedGymId.HasValue)
        {
            return BadRequest(new { message = "Select one of your gyms to view reports." });
        }

        if (branchId.HasValue && !await _context.Branches.AnyAsync(branch => branch.Id == branchId.Value && branch.GymId == scopedGymId.Value))
        {
            return BadRequest(new { message = "Selected branch does not belong to this gym." });
        }

        var normalizedPeriod = NormalizePeriod(period);
        var to = DateTime.UtcNow;
        var from = normalizedPeriod switch
        {
            "7d" => to.Date.AddDays(-6),
            "1m" => to.Date.AddMonths(-1),
            _ => to.Date
        };

        var completedStatuses = new[] { "COMPLETED", "Completed", "completed", "DONE", "Done", "done", "ATTENDED", "Attended", "attended" };
        var classQuery = _context.Classes
            .Where(item =>
                item.GymId == scopedGymId.Value &&
                (!branchId.HasValue || item.BranchId == branchId.Value) &&
                item.StartTime >= from &&
                item.StartTime <= to);

        var classIds = classQuery.Select(item => item.Id);
        var givenByName = await _context.ClassBookings
            .Where(booking => booking.ClassId.HasValue &&
                classIds.Contains(booking.ClassId.Value) &&
                booking.Status != null &&
                completedStatuses.Contains(booking.Status))
            .Join(classQuery, booking => booking.ClassId, gymClass => gymClass.Id, (booking, gymClass) => gymClass)
            .GroupBy(gymClass => gymClass.Name ?? "Unnamed class")
            .Select(group => new OwnerClassGivenReportPointDto
            {
                ClassName = group.Key,
                CompletedCount = group.Count()
            })
            .OrderByDescending(item => item.CompletedCount)
            .ToListAsync();

        return Ok(new OwnerReportDto
        {
            Period = normalizedPeriod,
            From = from,
            To = to,
            GymId = scopedGymId,
            BranchId = branchId,
            GivenClassesByName = givenByName
        });
    }

    private async Task<ManagerReportDto> BuildManagerReportAsync(Branch branch)
    {
        var todayStart = DateTime.UtcNow.Date;
        var todayEnd = todayStart.AddDays(1);

        var checkIns = await ApplyCheckInScope(_context.CheckIns
                .Include(item => item.Member)
                .AsQueryable())
            .Where(item =>
                item.BranchId == branch.Id &&
                ((item.CheckInTime.HasValue && item.CheckInTime.Value < todayEnd) ||
                 (item.CheckOutTime.HasValue && item.CheckOutTime.Value >= todayStart)))
            .OrderByDescending(item => item.CheckInTime)
            .ToListAsync();

        var todayCheckIns = checkIns
            .Where(item => item.CheckInTime >= todayStart && item.CheckInTime < todayEnd)
            .ToList();
        var todayCheckOuts = checkIns
            .Where(item => item.CheckOutTime >= todayStart && item.CheckOutTime < todayEnd)
            .ToList();

        var capacityByHour = Enumerable.Range(0, 24)
            .Select(hour =>
            {
                var hourStart = todayStart.AddHours(hour);
                var hourEnd = hourStart.AddHours(1);
                var activePeople = checkIns.Count(item =>
                    item.CheckInTime.HasValue &&
                    item.CheckInTime.Value <= hourEnd &&
                    (!item.CheckOutTime.HasValue || item.CheckOutTime.Value >= hourStart));
                return new HourlyBranchCapacityDto
                {
                    Hour = hour,
                    Label = hourStart.ToString("HH:mm", CultureInfo.InvariantCulture),
                    ActivePeopleCount = activePeople,
                    BranchCapacity = branch.Capacity,
                    UtilizationPercent = branch.Capacity.HasValue && branch.Capacity.Value > 0
                        ? Math.Round((decimal)activePeople / branch.Capacity.Value * 100m, 1)
                        : null
                };
            })
            .ToList();

        return new ManagerReportDto
        {
            BranchId = branch.Id,
            BranchName = branch.Name,
            BranchCapacity = branch.Capacity,
            TotalMembersLoggedToday = todayCheckIns
                .Where(item => item.MemberId.HasValue)
                .Select(item => item.MemberId!.Value)
                .Distinct()
                .Count(),
            BranchCapacityByHour = capacityByHour,
            CheckInOutSummary = new CheckInOutSummaryDto
            {
                CheckIns = todayCheckIns.Count,
                ManualCheckOuts = todayCheckOuts.Count(item => !IsAutoCheckOut(item)),
                AutoCheckOuts = todayCheckOuts.Count(IsAutoCheckOut)
            },
            TodayCheckIns = todayCheckIns
                .OrderByDescending(item => item.CheckInTime)
                .Select(item => new CheckInUnderlyingRowDto
                {
                    Id = item.Id,
                    MemberId = item.MemberId,
                    MemberName = item.Member?.FullName ?? "Member",
                    BranchName = branch.Name,
                    CheckInTime = item.CheckInTime,
                    CheckOutTime = item.CheckOutTime,
                    IsAutoCheckOut = IsAutoCheckOut(item),
                    Status = item.CheckOutTime.HasValue
                        ? (IsAutoCheckOut(item) ? "Auto checked out" : "Checked out")
                        : "Checked in"
                })
                .ToList()
        };
    }

    [HttpGet("gym/{gymId:long}/summary")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> GetGymSummary(long gymId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var response = new
        {
            gymId,
            totalMembers = await _context.Members.CountAsync(m => m.GymId == gymId),
            activeMemberships = await _context.MemberMemberships.CountAsync(m => (m.Status == AppStatuses.MembershipActive || m.Status == "Active") && (!m.EndDate.HasValue || m.EndDate >= today)),
            monthlyRevenue = await _context.Payments.Where(p => p.GymId == gymId && p.PaidAt >= monthStart).SumAsync(p => (decimal?)p.Amount) ?? 0m,
            totalBranches = await _context.Branches.CountAsync(b => b.GymId == gymId),
            todayCheckIns = await _context.CheckIns
                .Join(_context.Members, c => c.MemberId, m => m.Id, (c, m) => new { CheckIn = c, Member = m })
                .CountAsync(x => x.Member.GymId == gymId && x.CheckIn.CheckInTime >= DateTime.UtcNow.Date)
        };

        return Ok(response);
    }

    [HttpGet("branch/{branchId:long}/summary")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> GetBranchSummary(long branchId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var response = new
        {
            branchId,
            members = await _context.Members.CountAsync(m => m.HomeBranchId == branchId),
            activeMemberships = await _context.MemberMemberships
                .Join(_context.Members, mm => mm.MemberId, m => m.Id, (mm, m) => new { Membership = mm, Member = m })
                .CountAsync(x => x.Member.HomeBranchId == branchId && (x.Membership.Status == AppStatuses.MembershipActive || x.Membership.Status == "Active") && (!x.Membership.EndDate.HasValue || x.Membership.EndDate >= today)),
            todayRevenue = await _context.Payments.Where(p => p.BranchId == branchId && p.PaidAt >= DateTime.UtcNow.Date).SumAsync(p => (decimal?)p.Amount) ?? 0m,
            todayCheckIns = await _context.CheckIns.CountAsync(c => c.BranchId == branchId && c.CheckInTime >= DateTime.UtcNow.Date),
            upcomingClasses = await _context.Classes.CountAsync(c => c.BranchId == branchId && c.StartTime >= DateTime.UtcNow)
        };

        return Ok(response);
    }

    private IQueryable<Branch> ApplyBranchScope(IQueryable<Branch> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            var ownedGymIds = _context.Gyms
                .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
                .Select(gym => gym.Id);
            query = query.Where(item => item.GymId.HasValue && ownedGymIds.Contains(item.GymId.Value));
        }
        else if (_currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.Id == _currentUser.BranchId.Value);
        }

        return query;
    }

    private IQueryable<CheckIn> ApplyCheckInScope(IQueryable<CheckIn> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            var ownedGymIds = _context.Gyms
                .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
                .Select(gym => gym.Id);
            var branchIds = _context.Branches.Where(item => item.GymId.HasValue && ownedGymIds.Contains(item.GymId.Value)).Select(item => item.Id);
            return query.Where(item => item.BranchId.HasValue && branchIds.Contains(item.BranchId.Value));
        }

        if (_currentUser.GymId.HasValue)
        {
            var branchIds = _context.Branches.Where(item => item.GymId == _currentUser.GymId.Value).Select(item => item.Id);
            return query.Where(item => item.BranchId.HasValue && branchIds.Contains(item.BranchId.Value));
        }

        return query.Where(item => false);
    }

    private static AdminAttendanceDto ToAttendanceDto(CheckIn checkIn, IReadOnlyCollection<CheckIn> history)
    {
        var suspicion = DetectSuspicion(checkIn, history);
        return new AdminAttendanceDto
        {
            Id = checkIn.Id,
            MemberId = checkIn.MemberId,
            BranchId = checkIn.BranchId,
            MemberName = checkIn.Member?.FullName ?? "Member",
            Type = "Member",
            Status = checkIn.CheckOutTime.HasValue
                ? (IsAutoCheckOut(checkIn) ? "Auto checked out" : "Checked out")
                : "Checked in",
            At = checkIn.CheckInTime?.ToLocalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) ?? string.Empty,
            CheckInTime = checkIn.CheckInTime,
            CheckOutTime = checkIn.CheckOutTime,
            Source = checkIn.CheckOutTime.HasValue
                ? $"{checkIn.Method ?? "Front desk"} -> {checkIn.CheckOutMethod ?? "manual"}"
                : checkIn.Method ?? "Front desk",
            IsSuspicious = suspicion.IsSuspicious,
            SuspicionReason = suspicion.Reason,
            SuspicionLevel = suspicion.Level
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

    private async Task<long?> ResolveOwnedGymIdAsync(long? requestedGymId)
    {
        var ownedGymIds = await _context.Gyms
            .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
            .Select(gym => gym.Id)
            .ToListAsync();

        if (requestedGymId.HasValue)
        {
            return ownedGymIds.Contains(requestedGymId.Value) ? requestedGymId.Value : null;
        }

        if (_currentUser.GymId.HasValue && ownedGymIds.Contains(_currentUser.GymId.Value))
        {
            return _currentUser.GymId.Value;
        }

        return ownedGymIds.Count == 1 ? ownedGymIds[0] : null;
    }

    private static string NormalizePeriod(string? period)
    {
        return period?.Trim().ToLowerInvariant() switch
        {
            "7d" or "7days" or "7-days" => "7d",
            "1m" or "month" or "1month" or "1-month" => "1m",
            _ => "1d"
        };
    }
}
