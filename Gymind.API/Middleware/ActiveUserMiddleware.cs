using System.Security.Claims;
using Gymind.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Middleware;

public class ActiveUserMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IWebHostEnvironment _environment;

    public ActiveUserMiddleware(RequestDelegate next, IWebHostEnvironment environment)
    {
        _next = next;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
    {
        if (ShouldSkip(context))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated == true &&
            long.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            var userState = await dbContext.Users
                .Where(user => user.Id == userId)
                .Select(user => new { user.IsActive, GymActive = user.Gym == null || user.Gym.IsActive })
                .FirstOrDefaultAsync();

            if (userState == null || !userState.IsActive || !userState.GymActive)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "User account or gym is inactive." });
                return;
            }
        }

        await _next(context);
    }

    private bool ShouldSkip(HttpContext context)
    {
        var path = context.Request.Path;
        if (path.StartsWithSegments("/health"))
        {
            return true;
        }

        if (_environment.IsDevelopment() &&
            (path.StartsWithSegments("/swagger") || path.StartsWithSegments("/openapi")))
        {
            return true;
        }

        return path.StartsWithSegments("/api/auth");
    }
}
