using System.Security.Claims;
using System.Security.Cryptography;
using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Helpers;
using ForgeHub.API.Models;
using ForgeHub.API.Security;
using ForgeHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly JwtHelper _jwtHelper;
    private readonly MemberExperienceService _memberExperienceService;
    private readonly IAuthService _authService;

    public AuthController(
        ApplicationDbContext context,
        JwtHelper jwtHelper,
        MemberExperienceService memberExperienceService,
        IAuthService authService)
    {
        _context = context;
        _jwtHelper = jwtHelper;
        _memberExperienceService = memberExperienceService;
        _authService = authService;
    }

    [HttpPost("admin/login")]
    [AllowAnonymous]
    public async Task<IActionResult> AdminLogin([FromBody] AdminLoginDto dto)
    {
        try
        {
            var session = await _authService.LoginAdminAsync(dto);
            return Ok(session);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("member/login")]
    [AllowAnonymous]
    public async Task<IActionResult> MemberLogin([FromBody] MemberLoginDto dto)
    {
        try
        {
            var session = await _authService.LoginMemberAsync(dto);
            return Ok(session);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("member/forgot-password/request")]
    [AllowAnonymous]
    public async Task<IActionResult> RequestForgotPasswordOtp([FromBody] ForgotPasswordRequestDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Identifier))
        {
            return BadRequest(new { message = "Enter the phone, WhatsApp number, or email linked to your account." });
        }

        if (dto.Identifier.Contains("@") && !System.Text.RegularExpressions.Regex.IsMatch(dto.Identifier, @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"))
        {
            return BadRequest(new { message = "Invalid email format." });
        }

        var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        var user = await FindMemberUserByIdentifier(dto.Identifier);
        if (user != null)
        {
            var otp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            _context.OtpRecords.Add(new OtpRecord
            {
                UserId = user.Id,
                DeviceId = PasswordResetDeviceId(resetToken),
                OtpCode = otp,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            if (HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment())
            {
                Console.WriteLine($"ForgeHub password reset OTP for user {user.Id}: {otp}");
            }
        }

        return Ok(new
        {
            resetToken,
            message = "If the account exists, a password reset OTP has been sent. The code expires in 10 minutes."
        });
    }

    [HttpPost("member/forgot-password/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyForgotPasswordOtp([FromBody] ForgotPasswordVerifyDto dto)
    {
        var record = await GetValidPasswordResetRecord(dto);
        if (record == null)
        {
            return BadRequest(new { message = "Invalid or expired OTP." });
        }

        return Ok(new { resetToken = dto.ResetToken, message = "OTP verified. Enter a new password." });
    }

    [HttpPost("member/forgot-password/reset")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetForgottenPassword([FromBody] ForgotPasswordResetDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.NewPassword) || !ForgeHub.API.Helpers.PasswordValidator.IsStrongPassword(dto.NewPassword))
        {
            return BadRequest(new { message = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." });
        }

        var record = await GetValidPasswordResetRecord(dto);
        if (record == null)
        {
            return BadRequest(new { message = "Invalid or expired OTP." });
        }

        var user = record.User;
        if (user == null)
        {
            return BadRequest(new { message = "Invalid or expired OTP." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        record.IsUsed = true;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Password reset successfully. You can now sign in." });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshSessionDto dto)
    {
        try
        {
            return Ok(await _authService.RefreshAsync(dto.RefreshToken));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    private async Task<User?> FindMemberUserByIdentifier(string identifier)
    {
        var normalized = identifier.Trim().ToLowerInvariant();
        return await _context.Users
            .Include(user => user.Role)
            .Where(user => user.IsActive && user.Role != null && user.Role.Name == AppRoles.Member)
            .FirstOrDefaultAsync(user =>
                (user.Email != null && user.Email.ToLower() == normalized) ||
                (user.Phone != null && user.Phone == identifier.Trim()));
    }

    private async Task<OtpRecord?> GetValidPasswordResetRecord(ForgotPasswordVerifyDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Identifier) || string.IsNullOrWhiteSpace(dto.Otp) || string.IsNullOrWhiteSpace(dto.ResetToken))
        {
            return null;
        }

        var user = await FindMemberUserByIdentifier(dto.Identifier);
        if (user == null)
        {
            return null;
        }

        return await _context.OtpRecords
            .Include(record => record.User)
            .Where(record => record.UserId == user.Id &&
                record.DeviceId == PasswordResetDeviceId(dto.ResetToken) &&
                record.OtpCode == dto.Otp.Trim() &&
                !record.IsUsed &&
                record.ExpiresAt >= DateTime.UtcNow)
            .OrderByDescending(record => record.CreatedAt)
            .FirstOrDefaultAsync();
    }

    private static string PasswordResetDeviceId(string resetToken) => $"password-reset:{resetToken.Trim()}";

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutDto dto)
    {
        await _authService.LogoutAsync(dto.RefreshToken);
        return NoContent();
    }

    [HttpPost("member/change-password")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> ChangeMemberPassword([FromBody] ChangePasswordDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword) || !ForgeHub.API.Helpers.PasswordValidator.IsStrongPassword(dto.NewPassword))
        {
            return BadRequest(new { message = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." });
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == parsedUserId && item.IsActive);
        if (user == null || string.IsNullOrWhiteSpace(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Password changed successfully." });
    }

    // ================= REGISTER =================
    [HttpPost("register")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Invalid registration data." });

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            return BadRequest(new { message = "Email already exists." });

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == AppRoles.Member);
        if (role == null)
        {
            role = new Role { Name = AppRoles.Member };
            _context.Roles.Add(role);
            await _context.SaveChangesAsync();
        }

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            GymId = dto.GymId,
            BranchId = dto.BranchId,
            RoleId = role.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);

        var member = new Member
        {
            GymId = dto.GymId,
            HomeBranchId = dto.BranchId,
            FullName = dto.FullName,
            Phone = dto.Phone,
            Email = dto.Email,
            JoinDate = DateOnly.FromDateTime(DateTime.UtcNow),
            QrCode = $"FH-{Guid.NewGuid():N}"[..14],
            IsActive = true
        };

        _context.Members.Add(member);
        await _context.SaveChangesAsync();
        member.UserId = user.Id;
        await _context.SaveChangesAsync();

        if (!await _context.MemberProfiles.AnyAsync(profile => profile.MemberId == member.Id))
        {
            _context.MemberProfiles.Add(new MemberProfile
            {
                MemberId = member.Id,
                HeightCm = 176m,
                WeightKg = 74m,
                FitnessGoal = "Build strength and improve conditioning",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        var savedUser = await _context.Users
            .Include(u => u.Role)
            .FirstAsync(u => u.Id == user.Id);

        return Ok(await _memberExperienceService.CreateLoginResponseAsync(
            savedUser,
            savedUser.Role!,
            Guid.NewGuid().ToString("N"),
            _jwtHelper));
    }

    // ================= LOGIN =================
    [HttpPost("login")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid login data." });

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || string.IsNullOrWhiteSpace(user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Account is deactivated." });

        if (user.Role == null)
            return StatusCode(500, new { message = "User role not found." });

        if (!string.Equals(user.Role.Name, AppRoles.Member, StringComparison.OrdinalIgnoreCase))
        {
            return Ok(await _memberExperienceService.IssueSessionAsync(user, user.Role, _jwtHelper));
        }

        return Ok(await _memberExperienceService.CreateLoginResponseAsync(
            user,
            user.Role,
            dto.DeviceId,
            _jwtHelper));
    }

    // ================= VERIFY OTP =================
    [HttpPost("verify-otp")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request." });

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == dto.UserId);

        if (user == null || user.Role == null)
            return NotFound(new { message = "User not found." });

        var valid = await _memberExperienceService.ValidateOtpAsync(dto.UserId, dto.Otp, dto.DeviceId);
        if (!valid)
            return BadRequest(new { message = "Invalid or expired OTP." });

        await _memberExperienceService.ApproveDeviceAsync(dto.UserId, dto.DeviceId);

        return Ok(await _memberExperienceService.IssueSessionAsync(user, user.Role, _jwtHelper));
    }

    // ================= REFRESH SESSION =================
    [HttpPost("device-verify")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> RefreshSession([FromBody] RefreshSessionDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request." });

        var userId = await _memberExperienceService.ReadRefreshTokenAsync(dto.RefreshToken);
        if (!userId.HasValue)
            return Unauthorized(new { message = "Invalid or expired refresh token." });

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user == null || user.Role == null)
            return Unauthorized(new { message = "User not found." });

        return Ok(await _memberExperienceService.IssueSessionAsync(user, user.Role, _jwtHelper));
    }

    // ================= CURRENT USER =================
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!long.TryParse(userId, out var parsedUserId))
            return Unauthorized();

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == parsedUserId);

        if (user == null)
            return NotFound();

        var member = await _context.Members
            .FirstOrDefaultAsync(m => m.UserId == user.Id);

        var membership = member == null
            ? null
            : await _context.MemberMemberships
                .Include(mm => mm.Plan)
                .FirstOrDefaultAsync(mm => mm.MemberId == member.Id);

        var branchId = user.BranchId ?? member?.HomeBranchId;
        var branch = branchId.HasValue
            ? await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId.Value)
            : null;

        if (string.Equals(user.Role?.Name, AppRoles.Member, StringComparison.OrdinalIgnoreCase) &&
            (branch == null || !branch.Lat.HasValue || !branch.Lng.HasValue || !branch.RangeKm.HasValue))
        {
            return Conflict(new { message = "Member branch location is not configured. Check-in is unavailable until branch geofence data is set." });
        }

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var remainingDays = membership?.EndDate is null
            ? 0
            : Math.Max(0, membership.EndDate.Value.DayNumber - now.DayNumber);

        var deviceApproved = await _context.DeviceApprovals
            .AnyAsync(item => item.UserId == user.Id && item.IsApproved);

        return Ok(new CurrentUserDto
        {
            Id = user.Id,
            UserId = user.Id,
            MemberId = member?.Id,
            Email = user.Email ?? string.Empty,
            ProfilePhotoUrl = user.ProfilePhotoUrl,
            FullName = user.FullName ?? "ForgeHub Member",
            Role = user.Role?.Name ?? AppRoles.Member,
            GymId = user.GymId ?? member?.GymId,
            BranchId = user.BranchId,
            HomeBranchId = member?.HomeBranchId,
            BranchName = branch?.Name ?? string.Empty,
            MembershipActive = AppStatuses.IsActiveMembership(membership?.Status),
            DeviceApproved = deviceApproved,
            MembershipPlan = membership?.Plan?.Name ?? string.Empty,
            MembershipStatus = membership?.Status ?? AppStatuses.MembershipPending,
            RemainingDays = remainingDays,
            GymLatitude = branch?.Lat ?? 0,
            GymLongitude = branch?.Lng ?? 0,
            GeofenceRadiusMeters = (int)Math.Round(((branch?.RangeKm ?? 0m) * 1000m)),
            QrCode = member?.QrCode
        });
    }
}
