using System.Globalization;
using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Roles = AppRoles.Staff)]
public class StaffMembersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public StaffMembersController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet("member-search")]
    [HttpGet("members/search")]
    public async Task<ActionResult<PagedResultDto<StaffMemberSearchDto>>> SearchMembers(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? attendance,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var staffUser = await _context.Users
            .Where(user => user.Id == _currentUser.UserId && user.IsActive)
            .Select(user => new { user.Id, user.GymId, user.BranchId })
            .FirstOrDefaultAsync();

        if (staffUser == null)
        {
            return Unauthorized(new { message = "Staff user could not be resolved from the current login." });
        }

        var staffBranchId = staffUser.BranchId;
        if (!staffBranchId.HasValue)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No branch assigned to this staff user." });
        }

        var branch = await _context.Branches
            .Where(item => item.Id == staffBranchId.Value && item.IsActive)
            .Select(item => new { item.Id, item.Name, item.GymId })
            .FirstOrDefaultAsync();

        if (branch == null)
        {
            return BadRequest(new { message = "The assigned staff branch does not exist or is inactive." });
        }

        if (staffUser.GymId.HasValue && branch.GymId.HasValue && staffUser.GymId.Value != branch.GymId.Value)
        {
            return Forbid();
        }

        var membersQuery = _context.Members
            .Where(member => member.HomeBranchId == staffBranchId.Value);

        if (staffUser.GymId.HasValue)
        {
            membersQuery = membersQuery.Where(member => member.GymId == staffUser.GymId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmedSearch = search.Trim().ToLowerInvariant();
            var isNumericSearch = long.TryParse(trimmedSearch, NumberStyles.Integer, CultureInfo.InvariantCulture, out var searchId);
            membersQuery = membersQuery.Where(member =>
                (member.FullName != null && member.FullName.ToLower().Contains(trimmedSearch)) ||
                (member.Email != null && member.Email.ToLower().Contains(trimmedSearch)) ||
                (member.Phone != null && member.Phone.ToLower().Contains(trimmedSearch)) ||
                (isNumericSearch && member.Id == searchId));
        }

        var members = await membersQuery
            .OrderBy(member => member.FullName)
            .ToListAsync();
        var memberIds = members.Select(member => member.Id).ToList();

        var memberships = await _context.MemberMemberships
            .Where(membership => membership.MemberId.HasValue && memberIds.Contains(membership.MemberId.Value))
            .OrderByDescending(membership => membership.StartDate)
            .ToListAsync();
        var latestMembershipByMember = memberships
            .GroupBy(membership => membership.MemberId!.Value)
            .ToDictionary(group => group.Key, group => group.First());

        var plans = await _context.MembershipPlans
            .Where(plan => !staffUser.GymId.HasValue || plan.GymId == staffUser.GymId.Value)
            .ToDictionaryAsync(plan => plan.Id, plan => plan.Name ?? string.Empty);

        var paidMemberIds = await _context.Payments
            .Where(payment => payment.MemberId.HasValue && memberIds.Contains(payment.MemberId.Value))
            .Select(payment => payment.MemberId!.Value)
            .Distinct()
            .ToListAsync();
        var paidMemberIdSet = paidMemberIds.ToHashSet();

        var todayStart = DateTime.UtcNow.Date;
        var todayEnd = todayStart.AddDays(1);
        var now = DateTime.UtcNow;
        var lastCheckInByMember = await _context.CheckIns
            .Where(checkIn =>
                checkIn.BranchId == staffBranchId.Value &&
                checkIn.MemberId.HasValue &&
                memberIds.Contains(checkIn.MemberId.Value))
            .GroupBy(checkIn => checkIn.MemberId!.Value)
            .Select(group => new { MemberId = group.Key, LastCheckIn = group.Max(item => item.CheckInTime) })
            .ToDictionaryAsync(item => item.MemberId, item => item.LastCheckIn);
        var todayMemberIds = await _context.CheckIns
            .Where(checkIn =>
                checkIn.BranchId == staffBranchId.Value &&
                checkIn.MemberId.HasValue &&
                memberIds.Contains(checkIn.MemberId.Value) &&
                checkIn.CheckInTime >= todayStart &&
                checkIn.CheckInTime < todayEnd)
            .Select(checkIn => checkIn.MemberId!.Value)
            .Distinct()
            .ToListAsync();
        var activeMemberIds = await _context.CheckIns
            .Where(checkIn =>
                checkIn.BranchId == staffBranchId.Value &&
                checkIn.MemberId.HasValue &&
                memberIds.Contains(checkIn.MemberId.Value) &&
                (!checkIn.CheckOutTime.HasValue || checkIn.CheckOutTime.Value > now))
            .Select(checkIn => checkIn.MemberId!.Value)
            .Distinct()
            .ToListAsync();
        var todayMemberIdSet = todayMemberIds.ToHashSet();
        var activeMemberIdSet = activeMemberIds.ToHashSet();

        var rows = members.Select(member =>
        {
            latestMembershipByMember.TryGetValue(member.Id, out var membership);
            var membershipStatus = membership?.Status ?? (member.IsActive ? AppStatuses.MembershipActive : "INACTIVE");
            return new StaffMemberSearchDto
            {
                Id = member.Id,
                GymId = member.GymId,
                BranchId = member.HomeBranchId,
                HomeBranchId = member.HomeBranchId,
                BranchName = branch.Name ?? string.Empty,
                Name = member.FullName ?? string.Empty,
                FullName = member.FullName ?? string.Empty,
                Email = member.Email ?? string.Empty,
                Phone = member.Phone ?? string.Empty,
                PlanId = membership?.PlanId is long planId && plans.TryGetValue(planId, out var planName) && !string.IsNullOrWhiteSpace(planName)
                    ? planName
                    : "Unassigned",
                Status = membershipStatus,
                PaymentStatus = paidMemberIdSet.Contains(member.Id) ? AppStatuses.PaymentPaid : AppStatuses.PaymentPending,
                AttendanceToday = activeMemberIdSet.Contains(member.Id)
                    ? "Currently checked in"
                    : todayMemberIdSet.Contains(member.Id)
                        ? "Checked in today"
                        : "Not checked in today",
                JoinedAt = member.JoinDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                MembershipStartDate = membership?.StartDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                MembershipEndDate = membership?.EndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                LastCheckIn = lastCheckInByMember.GetValueOrDefault(member.Id),
                IsActive = member.IsActive
            };
        });

        if (!IsAllFilter(status))
        {
            var normalizedStatus = AppStatuses.Normalize(status);
            rows = rows.Where(member => AppStatuses.Normalize(member.Status) == normalizedStatus);
        }

        if (!IsAllFilter(attendance))
        {
            var normalizedAttendance = AppStatuses.Normalize(attendance);
            rows = normalizedAttendance switch
            {
                "CURRENT" or "CHECKED_IN" or "CURRENTLYCHECKEDIN" or "CURRENTLY_CHECKED_IN" => rows.Where(member => activeMemberIdSet.Contains(member.Id)),
                "TODAY" or "CHECKEDINTODAY" or "CHECKED_IN_TODAY" => rows.Where(member => todayMemberIdSet.Contains(member.Id)),
                "NOTTODAY" or "NOT_TODAY" or "NOTCHECKEDINTODAY" or "NOT_CHECKED_IN_TODAY" => rows.Where(member => !todayMemberIdSet.Contains(member.Id)),
                _ => rows
            };
        }

        var filteredRows = rows.ToList();
        var safePageSize = Math.Clamp(pageSize, 1, 100);
        var safePage = Math.Max(page, 1);
        var totalCount = filteredRows.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)safePageSize));
        var items = filteredRows
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToList();

        return Ok(new PagedResultDto<StaffMemberSearchDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = safePage,
            PageSize = safePageSize,
            TotalPages = totalPages
        });
    }

    [HttpGet("members/{id:long}")]
    public async Task<ActionResult<StaffMemberDetailsDto>> GetMemberDetails(long id)
    {
        var scope = await ResolveStaffScopeAsync();
        if (scope.Error != null)
        {
            return scope.Error;
        }

        var member = await _context.Members
            .FirstOrDefaultAsync(item =>
                item.Id == id &&
                item.HomeBranchId == scope.BranchId &&
                (!scope.GymId.HasValue || item.GymId == scope.GymId.Value));

        if (member == null)
        {
            return NotFound(new { message = "Member not found in your assigned branch." });
        }

        var memberships = await _context.MemberMemberships
            .Include(item => item.Plan)
            .Where(item => item.MemberId == member.Id)
            .OrderByDescending(item => item.StartDate)
            .ToListAsync();
        var latestMembership = memberships.FirstOrDefault();

        var payments = await _context.Payments
            .Include(item => item.Membership)
                .ThenInclude(item => item!.Plan)
            .Where(item => item.BranchId == scope.BranchId && item.MemberId == member.Id)
            .OrderByDescending(item => item.PaidAt)
            .Take(10)
            .Select(item => new AdminPaymentDto
            {
                Id = item.Id,
                GymId = item.GymId,
                BranchId = item.BranchId,
                MemberId = item.MemberId,
                Member = member.FullName ?? "Member",
                Branch = scope.BranchName,
                Plan = item.Membership != null && item.Membership.Plan != null ? item.Membership.Plan.Name ?? "Membership" : "No data",
                AmountValue = item.Amount,
                Amount = item.Amount.HasValue ? $"${item.Amount.Value:0.##}" : "$0",
                Method = item.Method ?? "No data",
                Status = AppStatuses.PaymentPaid,
                At = item.PaidAt.HasValue ? item.PaidAt.Value.ToLocalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) : string.Empty,
                PaidAt = item.PaidAt,
                Notes = item.Notes
            })
            .ToListAsync();

        var checkIns = await _context.CheckIns
            .Where(item => item.BranchId == scope.BranchId && item.MemberId == member.Id)
            .OrderByDescending(item => item.CheckInTime)
            .Take(10)
            .Select(item => new AdminAttendanceDto
            {
                Id = item.Id,
                MemberId = item.MemberId,
                BranchId = item.BranchId,
                BranchName = scope.BranchName,
                MemberName = member.FullName ?? "Member",
                Type = "Member",
                Status = item.CheckOutTime.HasValue ? "Checked out" : "Checked in",
                At = item.CheckInTime.HasValue ? item.CheckInTime.Value.ToLocalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) : string.Empty,
                CheckInTime = item.CheckInTime,
                CheckOutTime = item.CheckOutTime,
                Source = item.Method ?? "Front desk"
            })
            .ToListAsync();

        var lastPayment = payments.FirstOrDefault();
        return Ok(new StaffMemberDetailsDto
        {
            Id = member.Id,
            GymId = member.GymId,
            BranchId = member.HomeBranchId,
            HomeBranchId = member.HomeBranchId,
            BranchName = scope.BranchName,
            Name = member.FullName ?? string.Empty,
            FullName = member.FullName ?? string.Empty,
            Email = member.Email ?? string.Empty,
            Phone = member.Phone ?? string.Empty,
            Gender = member.Gender ?? string.Empty,
            Dob = member.Dob,
            PlanId = latestMembership?.Plan?.Name ?? "Not assigned",
            Status = latestMembership?.Status ?? (member.IsActive ? AppStatuses.MembershipActive : "INACTIVE"),
            PaymentStatus = payments.Count > 0 ? AppStatuses.PaymentPaid : AppStatuses.PaymentPending,
            AttendanceToday = checkIns.Any(item => !item.CheckOutTime.HasValue) ? "Currently checked in" : "No data",
            JoinedAt = member.JoinDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
            MembershipStartDate = latestMembership?.StartDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
            MembershipEndDate = latestMembership?.EndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
            LastCheckIn = checkIns.FirstOrDefault()?.CheckInTime,
            IsActive = member.IsActive,
            TotalPaid = payments.Sum(item => item.AmountValue ?? 0m),
            LastPaymentAmount = lastPayment?.AmountValue ?? 0m,
            LastPaymentAt = lastPayment?.PaidAt,
            LastPaymentMethod = lastPayment?.Method ?? "No data",
            RecentPayments = payments,
            RecentCheckIns = checkIns
        });
    }

    private async Task<(long BranchId, long? GymId, string BranchName, ActionResult? Error)> ResolveStaffScopeAsync()
    {
        var staffUser = await _context.Users
            .Where(user => user.Id == _currentUser.UserId && user.IsActive)
            .Select(user => new { user.GymId, user.BranchId })
            .FirstOrDefaultAsync();

        if (staffUser == null)
        {
            return (0, null, string.Empty, Unauthorized(new { message = "Staff user could not be resolved from the current login." }));
        }

        if (!staffUser.BranchId.HasValue)
        {
            return (0, null, string.Empty, StatusCode(StatusCodes.Status403Forbidden, new { message = "No branch assigned to this staff user." }));
        }

        var branch = await _context.Branches
            .Where(item => item.Id == staffUser.BranchId.Value && item.IsActive)
            .Select(item => new { item.Id, item.Name, item.GymId })
            .FirstOrDefaultAsync();

        if (branch == null)
        {
            return (0, null, string.Empty, BadRequest(new { message = "The assigned staff branch does not exist or is inactive." }));
        }

        if (staffUser.GymId.HasValue && branch.GymId.HasValue && staffUser.GymId.Value != branch.GymId.Value)
        {
            return (0, null, string.Empty, Forbid());
        }

        return (branch.Id, staffUser.GymId, branch.Name ?? "Not assigned", null);
    }

    private static bool IsAllFilter(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        var normalized = AppStatuses.Normalize(value);
        return normalized is "ALL" or "ANY";
    }
}
