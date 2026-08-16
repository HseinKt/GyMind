using System.Security.Claims;
using Gymind.API.DTOs;
using Gymind.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkoutsController : ControllerBase
{
    private readonly MemberExperienceService _memberExperienceService;

    public WorkoutsController(MemberExperienceService memberExperienceService)
    {
        _memberExperienceService = memberExperienceService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        return Ok(await _memberExperienceService.GetWorkoutsAsync(parsedUserId));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] WorkoutSessionDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        await _memberExperienceService.SaveWorkoutAsync(parsedUserId, dto);
        return Ok(new { message = "Workout session saved." });
    }
}
