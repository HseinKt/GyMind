using System.Security.Claims;
using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Gymind.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MembershipController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMemberBranchAccessService _branchAccessService;

    public MembershipController(ApplicationDbContext context, IMemberBranchAccessService branchAccessService)
    {
        _context = context;
        _branchAccessService = branchAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMembership()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        var member = await _context.Members.FirstOrDefaultAsync(m => m.UserId == parsedUserId);
        if (member == null)
        {
            return Ok(new MembershipResponseDto
            {
                PlanName = "Pending",
                RemainingDays = 0,
                Status = AppStatuses.MembershipPending,
                IsActive = false,
                VisitsThisMonth = 0
            });
        }

        var memberships = await _context.MemberMemberships
            .Include(item => item.Plan)
            .Where(item => item.MemberId == member.Id)
            .ToListAsync();

        var currentDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var currentMembership = memberships
            .Where(item => AppStatuses.IsActiveMembership(item.Status) && (!item.EndDate.HasValue || item.EndDate.Value >= currentDate))
            .OrderByDescending(item => item.EndDate ?? DateOnly.MaxValue)
            .ThenByDescending(item => item.StartDate ?? DateOnly.MinValue)
            .FirstOrDefault();

        var branches = currentMembership == null
            ? new List<MemberBranchAccessDto>()
            : await _branchAccessService.GetAccessibleBranchesForMemberAsync(member);
        var membershipItems = memberships
            .OrderByDescending(item => item.EndDate ?? DateOnly.MinValue)
            .ThenByDescending(item => item.StartDate ?? DateOnly.MinValue)
            .Select(item => ToMembershipItem(item, currentDate, item.Id == currentMembership?.Id ? branches : []))
            .ToList();
        var currentItem = currentMembership == null
            ? null
            : membershipItems.FirstOrDefault(item => item.Id == currentMembership.Id);
        var visitsThisMonth = await _context.CheckIns.CountAsync(item =>
            item.MemberId == member.Id &&
            item.CheckInTime.HasValue &&
            item.CheckInTime.Value.Year == DateTime.UtcNow.Year &&
            item.CheckInTime.Value.Month == DateTime.UtcNow.Month);

        return Ok(new MembershipResponseDto
        {
            PlanName = currentItem?.PlanName ?? string.Empty,
            RemainingDays = currentItem?.RemainingDays ?? 0,
            Status = currentItem?.Status ?? AppStatuses.MembershipPending,
            IsActive = currentItem?.IsActive ?? false,
            VisitsThisMonth = visitsThisMonth,
            CurrentMembership = currentItem,
            Memberships = membershipItems,
            BranchAccess = branches
        });
    }

    private static MemberMembershipItemDto ToMembershipItem(MemberMembership membership, DateOnly today, List<MemberBranchAccessDto> branches)
    {
        var status = AppStatuses.NormalizeMembership(membership.Status);
        var remainingDays = membership.EndDate is null ? 0 : Math.Max(0, membership.EndDate.Value.DayNumber - today.DayNumber);
        var active = status == AppStatuses.MembershipActive && (!membership.EndDate.HasValue || membership.EndDate.Value >= today);
        return new MemberMembershipItemDto
        {
            Id = membership.Id,
            PlanId = membership.PlanId,
            PlanName = membership.Plan?.Name ?? "Membership",
            Status = status,
            StartDate = membership.StartDate,
            EndDate = membership.EndDate,
            RemainingDays = remainingDays,
            IsActive = active,
            FreezeDays = membership.FreezeDays ?? 0,
            Branches = branches
        };
    }
}
