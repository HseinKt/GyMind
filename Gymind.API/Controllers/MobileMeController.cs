using System.Security.Claims;
using Gymind.API.Data;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/mobile/me")]
[Authorize(Roles = AppRoles.Member)]
public class MobileMeController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MobileMeController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("activity-heatmap")]
    public async Task<ActionResult<IReadOnlyList<ActivityHeatmapDayDto>>> GetActivityHeatmap()
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

        var today = DateTime.UtcNow.Date;
        var start = today.AddDays(-83);
        var checkIns = await _context.CheckIns
            .Where(item =>
                item.MemberId == member.Id &&
                item.CheckInTime.HasValue &&
                item.CheckInTime.Value.Date >= start &&
                item.CheckInTime.Value.Date <= today)
            .Select(item => item.CheckInTime!.Value.Date)
            .ToListAsync();

        var counts = checkIns
            .GroupBy(day => day)
            .ToDictionary(group => group.Key, group => group.Count());

        var days = Enumerable.Range(0, 84)
            .Select(offset =>
            {
                var day = start.AddDays(offset);
                return new ActivityHeatmapDayDto
                {
                    Date = day.ToString("yyyy-MM-dd"),
                    Count = counts.GetValueOrDefault(day)
                };
            })
            .ToList();

        return Ok(days);
    }
}

public class ActivityHeatmapDayDto
{
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}
