using System.Security.Claims;
using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/diet-plans")]
[Authorize]
public class DietPlansController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DietPlansController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] long? memberId)
    {
        long targetMemberId;
        if (User.IsInRole(AppRoles.Member))
        {
            var member = await GetCurrentMember();
            if (member == null)
            {
                return NotFound(new { message = "Member not found." });
            }
            targetMemberId = member.Id;
        }
        else
        {
            if (!memberId.HasValue)
            {
                return BadRequest(new { message = "Member ID is required for staff." });
            }
            targetMemberId = memberId.Value;
        }

        var plans = await _context.DietPlans
            .Where(dp => dp.MemberId == targetMemberId)
            .OrderByDescending(dp => dp.CreatedAt)
            .ToListAsync();

        return Ok(plans);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDietPlanDto dto)
    {
        long targetMemberId;
        if (User.IsInRole(AppRoles.Member))
        {
            var member = await GetCurrentMember();
            if (member == null)
            {
                return NotFound(new { message = "Member not found." });
            }
            targetMemberId = member.Id;
        }
        else
        {
            if (!dto.MemberId.HasValue)
            {
                return BadRequest(new { message = "Member ID is required for staff." });
            }
            targetMemberId = dto.MemberId.Value;
        }

        var plan = new DietPlan
        {
            MemberId = targetMemberId,
            Title = dto.Title,
            Description = dto.Description,
            DailyCaloriesTarget = dto.DailyCaloriesTarget,
            ProteinGrams = dto.ProteinGrams,
            CarbsGrams = dto.CarbsGrams,
            FatGrams = dto.FatGrams,
            CreatedAt = DateTime.UtcNow
        };

        _context.DietPlans.Add(plan);
        await _context.SaveChangesAsync();

        return Ok(plan);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member not found." });
        }

        var plan = await _context.DietPlans.FirstOrDefaultAsync(dp => dp.Id == id && dp.MemberId == member.Id);
        if (plan == null)
        {
            return NotFound();
        }

        _context.DietPlans.Remove(plan);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<Member?> GetCurrentMember()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdStr, out var userId)) return null;
        return await _context.Members.FirstOrDefaultAsync(m => m.UserId == userId);
    }
}
