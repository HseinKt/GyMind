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
[Route("api/admin/member-app")]
[Authorize(Roles = AppRoles.AdminRoles)]
public class MemberAppAdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly MemberExperienceService _memberExperienceService;

    public MemberAppAdminController(ApplicationDbContext context, MemberExperienceService memberExperienceService)
    {
        _context = context;
        _memberExperienceService = memberExperienceService;
    }

    [HttpGet("approval-queue")]
    public async Task<IActionResult> GetQueue()
    {
        return Ok(await _memberExperienceService.GetApprovalQueueAsync());
    }

    [HttpPost("approve-device")]
    public async Task<IActionResult> ApproveDevice([FromBody] ApproveDeviceDto dto)
    {
        await _memberExperienceService.ApproveDeviceAsync(dto.UserId, dto.DeviceId);
        return Ok(new { message = "Device approved and OTP flow can complete." });
    }

    [HttpPost("backfill-profiles")]
    public async Task<IActionResult> BackfillProfiles()
    {
        var membersWithoutProfiles = await _context.Members
            .Where(member => !_context.MemberProfiles.Any(profile => profile.MemberId == member.Id))
            .ToListAsync();

        if (membersWithoutProfiles.Count == 0)
        {
            return Ok(new
            {
                message = "No missing member profiles found.",
                created = 0
            });
        }

        var now = DateTime.UtcNow;
        foreach (var member in membersWithoutProfiles)
        {
            _context.MemberProfiles.Add(new MemberProfile
            {
                MemberId = member.Id,
                HeightCm = 176m,
                WeightKg = 74m,
                FitnessGoal = "Build strength and improve conditioning",
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Missing member profiles created successfully.",
            created = membersWithoutProfiles.Count
        });
    }
}
