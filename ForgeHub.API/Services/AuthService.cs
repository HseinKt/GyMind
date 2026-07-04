using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Helpers;
using ForgeHub.API.Models;
using ForgeHub.API.Security;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Services;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAdminAsync(AdminLoginDto dto);
    Task<AuthResponseDto> LoginMemberAsync(MemberLoginDto dto);
    Task<AuthResponseDto> RefreshAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);
}

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtHelper _jwtHelper;

    public AuthService(ApplicationDbContext context, JwtHelper jwtHelper)
    {
        _context = context;
        _jwtHelper = jwtHelper;
    }

    public async Task<AuthResponseDto> LoginAdminAsync(AdminLoginDto dto)
    {
        var user = await FindUserByEmailAsync(dto.Email);
        ValidatePassword(user, dto.Password);

        if (string.Equals(user.Role!.Name, AppRoles.Member, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Members must sign in from the mobile app.");
        }

        return await IssueSessionAsync(user, user.Role!);
    }

    public async Task<AuthResponseDto> LoginMemberAsync(MemberLoginDto dto)
    {
        var identifier = !string.IsNullOrWhiteSpace(dto.Identifier)
            ? dto.Identifier.Trim()
            : (dto.Email ?? dto.Phone ?? string.Empty).Trim();
        
        if (identifier.Contains("@") && !System.Text.RegularExpressions.Regex.IsMatch(identifier, @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"))
        {
            throw new UnauthorizedAccessException("Invalid email format.");
        }

        var normalizedIdentifier = identifier.ToLowerInvariant();
        var normalizedEmail = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim().ToLowerInvariant();
        var phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();

        var user = await _context.Users
            .Include(item => item.Role)
            .Include(item => item.Gym)
            .FirstOrDefaultAsync(item =>
                (item.Email != null && item.Email.ToLower() == normalizedIdentifier) ||
                item.Phone == identifier ||
                (normalizedEmail != null && item.Email != null && item.Email.ToLower() == normalizedEmail) ||
                (phone != null && item.Phone == phone));

        ValidatePassword(user, dto.Password);
        var validUser = user!;

        if (!string.Equals(validUser.Role!.Name, AppRoles.Member, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Admin users must sign in from the admin dashboard.");
        }

        return await IssueSessionAsync(validUser, validUser.Role);
    }

    public async Task<AuthResponseDto> RefreshAsync(string refreshToken)
    {
        var session = await _context.RefreshSessions
            .FirstOrDefaultAsync(item => item.RefreshToken == refreshToken);

        if (session == null || session.RevokedAt.HasValue || session.ExpiresAt < DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");
        }

        var user = await _context.Users
            .Include(item => item.Role)
            .Include(item => item.Gym)
            .FirstOrDefaultAsync(item => item.Id == session.UserId);

        if (user?.Role == null || !user.IsActive || (user.GymId.HasValue && user.Gym != null && !user.Gym.IsActive))
        {
            throw new UnauthorizedAccessException("User session is no longer active.");
        }

        session.RevokedAt = DateTime.UtcNow;
        return await IssueSessionAsync(user, user.Role);
    }

    public async Task LogoutAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var sessions = await _context.RefreshSessions
            .Where(item => item.RefreshToken == refreshToken && item.RevokedAt == null)
            .ToListAsync();

        foreach (var session in sessions)
        {
            session.RevokedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    private async Task<User> FindUserByEmailAsync(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(item => item.Role)
            .Include(item => item.Gym)
            .FirstOrDefaultAsync(item => item.Email != null && item.Email.ToLower() == normalizedEmail);

        if (user?.Role == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        return user;
    }

    private static void ValidatePassword(User? user, string password)
    {
        if (user?.Role == null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        bool passwordMatches;
        try
        {
            passwordMatches = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
        }
        catch
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!passwordMatches)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Account is deactivated.");
        }

        if (user.GymId.HasValue && user.Gym != null && !user.Gym.IsActive)
        {
            throw new UnauthorizedAccessException("Your gym account is deactivated. Please contact support.");
        }
    }

    private async Task<AuthResponseDto> IssueSessionAsync(User user, Role role)
    {
        var refreshToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray()) + Guid.NewGuid().ToString("N");
        var expiresAt = DateTime.UtcNow.AddHours(24);
        var member = string.Equals(role.Name, AppRoles.Member, StringComparison.OrdinalIgnoreCase)
            ? await _context.Members.FirstOrDefaultAsync(item => item.UserId == user.Id)
            : null;
        var membershipStatus = member == null
            ? string.Empty
            : await _context.MemberMemberships
                .Where(item => item.MemberId == member.Id)
                .OrderByDescending(item => item.EndDate)
                .Select(item => item.Status ?? string.Empty)
                .FirstOrDefaultAsync() ?? string.Empty;

        _context.RefreshSessions.Add(new RefreshSession
        {
            UserId = user.Id,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(14),
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            AccessToken = _jwtHelper.GenerateToken(user, role),
            RefreshToken = refreshToken,
            UserId = user.Id,
            FullName = user.FullName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            ProfilePhotoUrl = user.ProfilePhotoUrl,
            Role = role.Name,
            GymId = user.GymId,
            BranchId = user.BranchId,
            MemberId = member?.Id,
            HomeBranchId = member?.HomeBranchId,
            MembershipStatus = membershipStatus,
            Permissions = BuildPermissions(role.Name),
            ExpiresAt = expiresAt,
            RequiresOtp = false,
            DeviceApproved = true
        };
    }

    private static IReadOnlyList<string> BuildPermissions(string role) => role switch
    {
        AppRoles.SuperAdmin => ["platform:*", "gyms:*", "users:*", "reports:*", "audit:read"],
        AppRoles.GymOwner => ["gym:read", "branches:*", "members:*", "users:*", "plans:*", "payments:read", "reports:read"],
        AppRoles.BranchManager => ["branch:read", "members:*", "classes:*", "attendance:*", "payments:read", "reports:read"],
        AppRoles.Staff => ["members:create", "members:read", "payments:create", "attendance:*"],
        AppRoles.Trainer => ["trainer:schedule", "trainer:members", "trainer:notes"],
        AppRoles.Member => ["member:profile", "member:membership", "member:booking", "member:attendance"],
        _ => []
    };
}
