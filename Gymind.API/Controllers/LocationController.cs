using System.Security.Claims;
using Gymind.API.DTOs;
using Gymind.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LocationController : ControllerBase
{
    private readonly MemberExperienceService _memberExperienceService;

    public LocationController(MemberExperienceService memberExperienceService)
    {
        _memberExperienceService = memberExperienceService;
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] LocationUpdateDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        await _memberExperienceService.UpdatePresenceAsync(parsedUserId, dto);
        return Ok(new
        {
            message = dto.InsideGym ? "Location accepted. Session remains active." : "Outside gym. Logout grace period should begin on the client.",
            dto.InsideGym
        });
    }
}
