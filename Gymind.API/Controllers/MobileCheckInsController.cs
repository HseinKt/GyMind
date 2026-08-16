using System.Security.Claims;
using Gymind.API.Data;
using Gymind.API.Security;
using Gymind.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/mobile/check-ins")]
[Authorize(Roles = AppRoles.Member)]
public class MobileCheckInsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICheckInService _checkInService;

    public MobileCheckInsController(ApplicationDbContext context, ICheckInService checkInService)
    {
        _context = context;
        _checkInService = checkInService;
    }

    [HttpGet("current")]
    public async Task<ActionResult<CurrentGymSessionDto>> GetCurrent()
    {
        var member = await GetCurrentMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var session = await BuildSessionQuery(member.Id)
            .Where(item => item.CheckOutTime == null)
            .OrderByDescending(item => item.CheckInTime)
            .FirstOrDefaultAsync();

        return Ok(session ?? CurrentGymSessionDto.Inactive(DateTime.UtcNow));
    }

    [HttpGet("last")]
    public async Task<ActionResult<CurrentGymSessionDto>> GetLast()
    {
        var member = await GetCurrentMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var session = await BuildSessionQuery(member.Id)
            .OrderByDescending(item => item.CheckInTime)
            .FirstOrDefaultAsync();

        return Ok(session ?? CurrentGymSessionDto.Inactive(DateTime.UtcNow));
    }

    [HttpPost("check-out")]
    public async Task<IActionResult> CheckOut([FromBody] MobileCheckOutRequest? request)
    {
        var member = await GetCurrentMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        return Ok(await _checkInService.CheckOutAsync(member.Id, string.IsNullOrWhiteSpace(request?.Method) ? "MOBILE_CHECKOUT" : request.Method));
    }

    [HttpPost("heartbeat")]
    public async Task<IActionResult> Heartbeat()
    {
        var member = await GetCurrentMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var activeCheckIn = await _context.CheckIns
            .Where(item => item.MemberId == member.Id && item.CheckOutTime == null)
            .OrderByDescending(item => item.CheckInTime)
            .FirstOrDefaultAsync();

        if (activeCheckIn == null)
        {
            return Ok(new { updated = false, serverTime = DateTime.UtcNow });
        }

        var now = DateTime.UtcNow;
        activeCheckIn.LastSeenAt = now;
        activeCheckIn.Status = AppStatuses.NormalizeCheckIn(activeCheckIn.Status);
        await _context.SaveChangesAsync();

        return Ok(new { updated = true, checkInId = activeCheckIn.Id, serverTime = now });
    }

    private IQueryable<CurrentGymSessionDto> BuildSessionQuery(long memberId)
    {
        var serverTime = DateTime.UtcNow;
        return _context.CheckIns
            .Where(checkIn => checkIn.MemberId == memberId)
            .Select(checkIn => new CurrentGymSessionDto
            {
                HasActiveCheckIn = checkIn.CheckOutTime == null,
                CheckInId = checkIn.Id,
                MemberId = checkIn.MemberId ?? memberId,
                BranchId = checkIn.BranchId,
                BranchName = checkIn.Branch != null ? checkIn.Branch.Name : null,
                CheckInTime = checkIn.CheckInTime,
                CheckOutTime = checkIn.CheckOutTime,
                LastSeenAt = checkIn.LastSeenAt,
                ServerTime = serverTime,
                Status = checkIn.CheckOutTime == null ? "Inside Gym" : AppStatuses.NormalizeCheckIn(checkIn.Status),
                BranchCloseTime = checkIn.Branch != null ? checkIn.Branch.CloseTime : null,
                Capacity = checkIn.Branch != null ? checkIn.Branch.Capacity : null
            });
    }

    private async Task<Models.Member?> GetCurrentMemberAsync()
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return null;
        }

        return await _context.Members.FirstOrDefaultAsync(item => item.UserId == userId && item.IsActive);
    }
}

public class MobileCheckOutRequest
{
    public string? Method { get; set; }
}

public class CurrentGymSessionDto
{
    public bool HasActiveCheckIn { get; set; }
    public long? CheckInId { get; set; }
    public long? MemberId { get; set; }
    public long? BranchId { get; set; }
    public string? BranchName { get; set; }
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public DateTime ServerTime { get; set; }
    public string Status { get; set; } = "Not Checked In";
    public TimeOnly? BranchCloseTime { get; set; }
    public int? Capacity { get; set; }

    public static CurrentGymSessionDto Inactive(DateTime serverTime) => new()
    {
        HasActiveCheckIn = false,
        ServerTime = serverTime,
        Status = "Not Checked In"
    };
}
