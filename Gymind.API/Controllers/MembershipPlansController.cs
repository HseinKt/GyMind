using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Helpers;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MembershipPlansController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;
    private static readonly HashSet<string> ValidAccessTypes = new(StringComparer.Ordinal)
    {
        "full-access",
        "DAY_PASS",
        "one_branch",
        "multi-branch"
    };

    public MembershipPlansController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetPlans([FromQuery] long? gymId)
    {
        var query = ApplyScope(_context.MembershipPlans.AsQueryable());
        if (gymId.HasValue)
        {
            query = query.Where(p => p.GymId == gymId.Value);
        }

        var plans = await query
            .OrderBy(p => p.Name)
            .ToListAsync();
        var branchIdsByPlan = await LoadPlanBranches(plans.Select(plan => plan.Id));
        return Ok(plans.Select(plan => ToResponse(plan, branchIdsByPlan.GetValueOrDefault(plan.Id, []))));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetPlan(long id)
    {
        var plan = await ApplyScope(_context.MembershipPlans.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (plan == null)
        {
            return NotFound();
        }

        var branchIdsByPlan = await LoadPlanBranches([plan.Id]);
        return Ok(ToResponse(plan, branchIdsByPlan.GetValueOrDefault(plan.Id, [])));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> CreatePlan([FromBody] CreateMembershipPlanRequest request)
    {
        try
        {
            var gymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : await ResolveOwnedGymIdAsync(request.GymId);
            var accessType = NormalizeAccessType(request.AccessType);
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Plan name is required." });
            }

            if (accessType == null)
            {
                return BadRequest(new { message = $"Select a valid access type. Received: '{request.AccessType ?? "<empty>"}'." });
            }

            if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && !gymId.HasValue)
            {
                return BadRequest(new { message = "Select one of your gyms before creating a plan." });
            }

            if (gymId.HasValue)
            {
                var branchError = await ValidatePlanBranches(gymId.Value, accessType, request.BranchIds);
                if (branchError != null)
                {
                    return BadRequest(new { message = branchError });
                }
            }

            var plan = new MembershipPlan
            {
                GymId = gymId,
                Name = request.Name!.Trim(),
                Price = request.Price,
                DurationMonths = request.DurationMonth,
                AccessType = accessType,
                IncludesClasses = request.IncludesClasses,
                IncludesPt = request.IncludesPt,
                IsActive = request.IsActive
            };

            _context.MembershipPlans.Add(plan);
            await _context.SaveChangesAsync();
            await SyncPlanBranches(plan, request.BranchIds);
            var branchesByPlan = await LoadPlanBranches([plan.Id]);
            return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, ToResponse(plan, branchesByPlan.GetValueOrDefault(plan.Id, [])));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> UpdatePlan(long id, [FromBody] UpdateMembershipPlanRequest request)
    {
        try
        {
            var plan = await ApplyScope(_context.MembershipPlans.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (plan == null)
            {
                return NotFound();
            }

            var accessType = NormalizeAccessType(request.AccessType);
            if (accessType == null)
            {
                return BadRequest(new { message = $"Select a valid access type. Received: '{request.AccessType ?? "<empty>"}'." });
            }

            var gymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : plan.GymId;
            if (!gymId.HasValue)
            {
                return BadRequest(new { message = "Select a gym before updating a plan." });
            }

            var branchError = await ValidatePlanBranches(gymId.Value, accessType, request.BranchIds);
            if (branchError != null)
            {
                return BadRequest(new { message = branchError });
            }

            plan.GymId = gymId;
            plan.Name = request.Name!.Trim();
            plan.Price = request.Price;
            plan.DurationMonths = request.DurationMonth;
            plan.AccessType = accessType;
            plan.IncludesClasses = request.IncludesClasses;
            plan.IncludesPt = request.IncludesPt;
            plan.IsActive = request.IsActive;

            await SyncPlanBranches(plan, request.BranchIds);
            await _context.SaveChangesAsync();
            var branchesByPlan = await LoadPlanBranches([plan.Id]);
            return Ok(ToResponse(plan, branchesByPlan.GetValueOrDefault(plan.Id, [])));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPatch("{id:long}/status")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateStatusRequest request)
    {
        try
        {
            var plan = await ApplyScope(_context.MembershipPlans.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (plan == null)
            {
                return NotFound();
            }

            plan.IsActive = request.IsActive;
            await _context.SaveChangesAsync();

            var branchIdsByPlan = await LoadPlanBranches([plan.Id]);
            return Ok(ToResponse(plan, branchIdsByPlan.GetValueOrDefault(plan.Id, [])));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<MembershipPlan> ApplyScope(IQueryable<MembershipPlan> query)
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
            return query.Where(item => item.GymId.HasValue && ownedGymIds.Contains(item.GymId.Value));
        }

        if (!_currentUser.GymId.HasValue)
        {
            return query.Where(item => false);
        }

        query = query.Where(item => item.GymId == _currentUser.GymId.Value);

        if ((_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff)) &&
            _currentUser.BranchId.HasValue)
        {
            var branchId = _currentUser.BranchId.Value;
            query = query.Where(item =>
                item.AccessType == "full-access" ||
                item.AccessType == "DAY_PASS" ||
                _context.MembershipPlanBranches.Any(link => link.MembershipPlanId == item.Id && link.BranchId == branchId));
        }

        return query;
    }

    private async Task<string?> ValidatePlanBranches(long gymId, string accessType, List<long>? requestedBranchIds)
    {
        var branchIds = requestedBranchIds?.Distinct().ToList() ?? [];
        if (accessType is "full-access" or "DAY_PASS")
        {
            return null;
        }

        if (accessType == "one_branch" && branchIds.Count != 1)
        {
            return "Select exactly one branch for a one-branch plan.";
        }

        if (accessType == "multi-branch" && branchIds.Count < 1)
        {
            return "Select at least one branch for a multi-branch plan.";
        }

        var validCount = await _context.Branches
            .CountAsync(branch => branch.GymId == gymId && branchIds.Contains(branch.Id));
        return validCount == branchIds.Count ? null : "Selected branches must belong to the selected gym.";
    }

    private async Task SyncPlanBranches(MembershipPlan plan, List<long> branchIds)
    {
        await EnsureMembershipPlanBranchesTableAsync();

        if (plan.AccessType is "full-access" or "DAY_PASS")
        {
            branchIds = [];
        }

        var selectedBranchIds = branchIds.Distinct().ToList();
        var existing = await _context.MembershipPlanBranches
            .Where(item => item.MembershipPlanId == plan.Id)
            .ToListAsync();
        _context.MembershipPlanBranches.RemoveRange(existing);
        foreach (var branchId in selectedBranchIds)
        {
            _context.MembershipPlanBranches.Add(new MembershipPlanBranch
            {
                MembershipPlanId = plan.Id,
                BranchId = branchId,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
    }

    private async Task<Dictionary<long, List<PlanBranchResponse>>> LoadPlanBranches(IEnumerable<long> planIds)
    {
        var ids = planIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        await EnsureMembershipPlanBranchesTableAsync();

        var rows = await _context.MembershipPlanBranches
            .Join(_context.Branches,
                link => link.BranchId,
                branch => branch.Id,
                (link, branch) => new { link.MembershipPlanId, Branch = new PlanBranchResponse(branch.Id, branch.Name ?? "Unnamed branch") })
            .Where(item => ids.Contains(item.MembershipPlanId))
            .ToListAsync();

        return rows
            .GroupBy(item => item.MembershipPlanId)
            .ToDictionary(group => group.Key, group => group.Select(item => item.Branch).ToList());
    }

    private async Task EnsureMembershipPlanBranchesTableAsync()
    {
        await _context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS public.membership_plan_branches (
                id BIGSERIAL PRIMARY KEY,
                membership_plan_id BIGINT NOT NULL REFERENCES public.membership_plans(id) ON DELETE CASCADE,
                branch_id BIGINT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT now(),
                CONSTRAINT uq_membership_plan_branches_plan_branch UNIQUE (membership_plan_id, branch_id)
            );
            CREATE INDEX IF NOT EXISTS ix_membership_plan_branches_plan_id
                ON public.membership_plan_branches(membership_plan_id);
            CREATE INDEX IF NOT EXISTS ix_membership_plan_branches_branch_id
                ON public.membership_plan_branches(branch_id);
            """);
    }

    private static object ToResponse(MembershipPlan plan, List<PlanBranchResponse>? branches = null) => new
    {
        plan.Id,
        plan.GymId,
        plan.Name,
        plan.Price,
        DurationMonth = plan.DurationMonths,
        plan.AccessType,
        plan.IncludesClasses,
        plan.IncludesPt,
        plan.IsActive,
        BranchIds = branches?.Select(branch => branch.Id).ToList() ?? [],
        Branches = branches ?? []
    };

    private sealed record PlanBranchResponse(long Id, string Name);

    private static string? NormalizeAccessType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return ValidAccessTypes.Contains(normalized) ? normalized : null;
    }

    private async Task<long?> ResolveOwnedGymIdAsync(long? requestedGymId)
    {
        if (requestedGymId is <= 0)
        {
            requestedGymId = null;
        }

        if (!_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId;
        }

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
}
