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
public class MemberMembershipsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public MemberMembershipsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetMemberships([FromQuery] long? memberId)
    {
        var query = ApplyScope(_context.MemberMemberships.AsQueryable());

        if (memberId.HasValue)
        {
            query = query.Where(m => m.MemberId == memberId.Value);
        }

        var memberships = await query.OrderByDescending(m => m.StartDate).ToListAsync();
        return Ok(memberships);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetMembership(long id)
    {
        var membership = await ApplyScope(_context.MemberMemberships.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return membership == null ? NotFound() : Ok(membership);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,GymOwner,BranchManager,Staff")]
    public async Task<IActionResult> CreateMembership([FromBody] CreateMemberMembershipRequest request)
    {
        try
        {
            var member = request.MemberId.HasValue
                ? await ApplyMemberScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(m => m.Id == request.MemberId.Value)
                : null;
            if (request.MemberId.HasValue && member == null)
            {
                return BadRequest(new { message = "Member not found." });
            }

            MembershipPlan? plan = null;
            if (request.PlanId.HasValue)
            {
                plan = await ApplyPlanScope(_context.MembershipPlans.AsQueryable()).FirstOrDefaultAsync(item => item.Id == request.PlanId.Value);
                if (plan == null)
                {
                    return BadRequest(new { message = "Membership plan not found in your assigned branch." });
                }
            }

            var startDate = request.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var membership = new MemberMembership
            {
                MemberId = request.MemberId,
                PlanId = request.PlanId,
                StartDate = startDate,
                EndDate = request.EndDate ?? (plan?.DurationMonths is > 0 ? startDate.AddMonths(plan.DurationMonths.Value) : null),
                Status = AppStatuses.NormalizeMembership(request.Status ?? AppStatuses.MembershipActive),
                FreezeDays = request.FreezeDays ?? 0
            };

            _context.MemberMemberships.Add(membership);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetMembership), new { id = membership.Id }, membership);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "SuperAdmin,GymOwner,BranchManager,Staff")]
    public async Task<IActionResult> UpdateMembership(long id, [FromBody] UpdateMemberMembershipRequest request)
    {
        try
        {
            var membership = await ApplyScope(_context.MemberMemberships.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (membership == null)
            {
                return NotFound();
            }

            if (request.MemberId.HasValue && !await ApplyMemberScope(_context.Members.AsQueryable()).AnyAsync(item => item.Id == request.MemberId.Value))
            {
                return BadRequest(new { message = "Member not found in your assigned branch." });
            }

            if (request.PlanId.HasValue && !await ApplyPlanScope(_context.MembershipPlans.AsQueryable()).AnyAsync(item => item.Id == request.PlanId.Value))
            {
                return BadRequest(new { message = "Membership plan not found in your assigned branch." });
            }

            membership.MemberId = request.MemberId;
            membership.PlanId = request.PlanId;
            membership.StartDate = request.StartDate;
            membership.EndDate = request.EndDate;
            membership.Status = AppStatuses.NormalizeMembership(request.Status);
            membership.FreezeDays = request.FreezeDays ?? membership.FreezeDays;

            await _context.SaveChangesAsync();
            return Ok(membership);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<MemberMembership> ApplyScope(IQueryable<MemberMembership> query)
    {
        var members = ApplyMemberScope(_context.Members.AsQueryable()).Select(item => item.Id);
        return query.Where(item => item.MemberId.HasValue && members.Contains(item.MemberId.Value));
    }

    private IQueryable<Member> ApplyMemberScope(IQueryable<Member> query)
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

        if ((_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff)) &&
            !_currentUser.BranchId.HasValue)
        {
            return query.Where(item => false);
        }

        if (_currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.HomeBranchId == _currentUser.BranchId.Value);
        }

        return query;
    }

    private IQueryable<MembershipPlan> ApplyPlanScope(IQueryable<MembershipPlan> query)
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

        query = query.Where(item => item.GymId == _currentUser.GymId.Value && item.IsActive);

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
}
