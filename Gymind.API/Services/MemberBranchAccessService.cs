using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Gymind.API.Services;

public interface IMemberBranchAccessService
{
    Task<List<MemberBranchAccessDto>> GetAccessibleBranchesForMemberAsync(long memberUserId);
    Task<List<MemberBranchAccessDto>> GetAccessibleBranchesForMemberAsync(Member member);
    Task<HashSet<long>> GetAccessibleBranchIdsForMemberAsync(Member member);
    Task ValidateBranchAccessForCheckInAsync(Member member, Branch branch);
}

public class MemberBranchAccessService : IMemberBranchAccessService
{
    private readonly ApplicationDbContext _context;

    public MemberBranchAccessService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<MemberBranchAccessDto>> GetAccessibleBranchesForMemberAsync(long memberUserId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == memberUserId);
        var member = user == null ? null : await _context.Members.FirstOrDefaultAsync(item => item.UserId == user.Id);
        if (member == null)
        {
            return [];
        }

        return await GetAccessibleBranchesForMemberAsync(member);
    }

    public async Task<List<MemberBranchAccessDto>> GetAccessibleBranchesForMemberAsync(Member member)
    {
        var activeMembership = await GetActiveMembership(member.Id);
        if (activeMembership?.PlanId == null)
        {
            return [];
        }

        var branches = await GetAllowedBranches(member, activeMembership.PlanId.Value);
        var branchIds = branches.Select(item => item.Id).ToList();
        var now = DateTime.UtcNow;
        var occupancies = await _context.CheckIns
            .Where(item => item.BranchId.HasValue && branchIds.Contains(item.BranchId.Value) && (!item.CheckOutTime.HasValue || item.CheckOutTime.Value > now))
            .GroupBy(item => item.BranchId!.Value)
            .Select(group => new { BranchId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.BranchId, item => item.Count);

        return branches
            .OrderBy(item => item.Name)
            .Select(branch => ToDto(branch, occupancies.GetValueOrDefault(branch.Id), activeMembership != null))
            .ToList();
    }

    public async Task<HashSet<long>> GetAccessibleBranchIdsForMemberAsync(Member member)
    {
        var activeMembership = await GetActiveMembership(member.Id);
        if (activeMembership?.PlanId == null)
        {
            return [];
        }

        var branches = await GetAllowedBranches(member, activeMembership.PlanId.Value);
        return branches.Select(item => item.Id).ToHashSet();
    }

    public async Task ValidateBranchAccessForCheckInAsync(Member member, Branch branch)
    {
        var activeMembership = await GetActiveMembership(member.Id);
        if (activeMembership?.PlanId == null)
        {
            throw new CheckInValidationException("You do not have an active membership.");
        }

        var branches = await GetAllowedBranches(member, activeMembership.PlanId.Value);
        if (branches.All(item => item.Id != branch.Id))
        {
            throw new CheckInValidationException("Your membership does not include access to this branch.");
        }

        var dto = ToDto(branch, 0, true);
        if (!dto.IsOpenNow)
        {
            throw new CheckInValidationException("This branch is currently closed.");
        }
    }

    private async Task<MemberMembership?> GetActiveMembership(long memberId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return await _context.MemberMemberships
            .Where(item => item.MemberId == memberId &&
                (item.Status == AppStatuses.MembershipActive || item.Status == "Active" || item.Status == "ACTIVE") &&
                (!item.EndDate.HasValue || item.EndDate.Value >= today))
            .OrderByDescending(item => item.EndDate)
            .FirstOrDefaultAsync();
    }

    private async Task<List<Branch>> GetAllowedBranches(Member member, long planId)
    {
        var planBranchIds = new List<long>();
        try
        {
            planBranchIds = await _context.MembershipPlanBranches
                .Where(item => item.MembershipPlanId == planId)
                .Select(item => item.BranchId)
                .ToListAsync();
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            // Production databases should run sql/2026-05-03-membership-plan-branches.sql.
            // Until then, keep member branch access usable through the member's home branch.
            planBranchIds = [];
        }

        if (planBranchIds.Count > 0)
        {
            return await _context.Branches
                .Where(item => planBranchIds.Contains(item.Id))
                .ToListAsync();
        }

        if (member.HomeBranchId.HasValue)
        {
            // Compatibility fallback for older/dev databases and legacy plans with no explicit
            // membership_plan_branches rows. This intentionally grants only the member's home
            // branch, never every branch in the gym.
            return await _context.Branches
                .Where(item => item.Id == member.HomeBranchId.Value)
                .ToListAsync();
        }

        return [];
    }

    private static MemberBranchAccessDto ToDto(Branch branch, int occupancy, bool membershipAccess)
    {
        // Capacity is optional in older Gymind databases. Null means unlimited until the gym configures a cap.
        var hasCapacityLimit = branch.Capacity.HasValue && branch.Capacity.Value > 0;
        var capacity = hasCapacityLimit ? branch.Capacity!.Value : 0;
        var remaining = hasCapacityLimit ? Math.Max(capacity - occupancy, 0) : 0;
        var percentage = hasCapacityLimit ? Math.Round(occupancy / (decimal)capacity * 100m, 2) : 0m;
        var isOpenNow = branch.IsActive && IsOpenNow(branch.OpenTime, branch.CloseTime);
        var status = !isOpenNow
            ? "Closed"
            : hasCapacityLimit && occupancy >= capacity
                ? "Full"
                : percentage >= 85m
                    ? "Almost Full"
                    : "Available";

        return new MemberBranchAccessDto
        {
            BranchId = branch.Id,
            BranchName = branch.Name,
            Address = branch.Address ?? string.Empty,
            OpenTime = branch.OpenTime?.ToString("HH:mm") ?? string.Empty,
            CloseTime = branch.CloseTime?.ToString("HH:mm") ?? string.Empty,
            IsOpenNow = isOpenNow,
            Capacity = capacity,
            CurrentOccupancy = occupancy,
            RemainingSpots = remaining,
            CapacityPercentage = percentage,
            Status = status,
            MembershipAccess = membershipAccess,
            CanCheckIn = membershipAccess && isOpenNow,
            Lat = branch.Lat.HasValue ? (double)branch.Lat.Value : null,
            Lng = branch.Lng.HasValue ? (double)branch.Lng.Value : null
        };
    }

    private static bool IsOpenNow(TimeOnly? openTime, TimeOnly? closeTime)
    {
        if (!openTime.HasValue || !closeTime.HasValue)
        {
            return true;
        }

        var now = TimeOnly.FromDateTime(DateTime.Now);
        return openTime <= closeTime
            ? now >= openTime && now <= closeTime
            : now >= openTime || now <= closeTime;
    }
}
