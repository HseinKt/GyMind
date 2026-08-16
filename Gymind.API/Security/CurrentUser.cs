using System.Security.Claims;

namespace Gymind.API.Security;

public interface ICurrentUser
{
    long UserId { get; }
    string Role { get; }
    long? GymId { get; }
    long? BranchId { get; }
    bool IsInRole(string role);
}

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal User => _httpContextAccessor.HttpContext?.User ?? new ClaimsPrincipal();

    public long UserId => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var value) ? value : 0L;

    public string Role => User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    public long? GymId => long.TryParse(User.FindFirstValue("GymId"), out var value) ? value : null;

    public long? BranchId => long.TryParse(User.FindFirstValue("BranchId"), out var value) ? value : null;

    public bool IsInRole(string role) => string.Equals(Role, role, StringComparison.OrdinalIgnoreCase);
}
