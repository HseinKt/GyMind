using System.Security.Claims;
using System.Security.Cryptography;
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
[Route("api/[controller]")]
[Authorize]
public class QrController : ControllerBase
{
    private const int MinimumGeofenceRadiusMeters = 50;
    private const int MaximumGeofenceRadiusMeters = 150;
    private static readonly TimeSpan DuplicateScanWindow = TimeSpan.FromMinutes(1);
    private readonly ApplicationDbContext _context;
    private readonly BranchQrTokenService _branchQrTokenService;
    private readonly MemberExperienceService _memberExperienceService;
    private readonly ICheckInService _checkInService;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<QrController> _logger;

    public QrController(
        ApplicationDbContext context,
        MemberExperienceService memberExperienceService,
        BranchQrTokenService branchQrTokenService,
        ICheckInService checkInService,
        ICurrentUser currentUser,
        ILogger<QrController> logger)
    {
        _context = context;
        _memberExperienceService = memberExperienceService;
        _branchQrTokenService = branchQrTokenService;
        _checkInService = checkInService;
        _currentUser = currentUser;
        _logger = logger;
    }

    [HttpGet("branch/{branchId:long}")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> GetBranchQr(long branchId)
    {
        var branch = await _context.Branches.FirstOrDefaultAsync(item => item.Id == branchId);
        if (branch == null || !CanAccessBranch(branch))
        {
            return NotFound(new { message = "Branch not found." });
        }

        await EnsureBranchQrAsync(branch);
        return Ok(ToBranchQrDto(branch));
    }

    [HttpPost("branch/{branchId:long}/regenerate")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> RegenerateBranchQr(long branchId)
    {
        var branch = await _context.Branches.FirstOrDefaultAsync(item => item.Id == branchId);
        if (branch == null || !CanAccessBranch(branch))
        {
            return NotFound(new { message = "Branch not found." });
        }

        var now = DateTime.UtcNow;
        branch.QrCodeToken = GenerateBranchQrToken();
        branch.QrCodeIsActive = true;
        branch.QrCodeCreatedAt ??= now;
        branch.QrCodeUpdatedAt = now;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "BRANCH_QR_REGENERATED",
            TableName = "branches",
            RecordId = branch.Id,
            CreatedAt = now
        });

        await _context.SaveChangesAsync();
        return Ok(ToBranchQrDto(branch));
    }

    [HttpGet("branch-token/{branchId:long}")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> GetBranchToken(long branchId)
    {
        var branch = await _context.Branches.FirstOrDefaultAsync(item => item.Id == branchId);
        if (branch == null || !CanAccessBranch(branch))
        {
            return NotFound(new { message = "Branch not found." });
        }

        await EnsureBranchQrAsync(branch);
        return Ok(ToBranchQrDto(branch));
    }

    [HttpPost("scan")]
    [Authorize(Roles = AppRoles.Member)]
    public async Task<IActionResult> Scan([FromBody] QrScanDto dto)
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        try
        {
            return Ok(await _checkInService.MobileQrCheckInAsync(userId, dto));
        }
        catch (CheckInValidationException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected QR scan failure for user {UserId}.", userId);
            return BadRequest(new { message = "Unable to validate this QR code. Please scan the latest branch QR and try again." });
        }
    }

    private async Task EnsureBranchQrAsync(Branch branch)
    {
        if (!string.IsNullOrWhiteSpace(branch.QrCodeToken))
        {
            return;
        }

        var now = DateTime.UtcNow;
        branch.QrCodeToken = GenerateBranchQrToken();
        branch.QrCodeCreatedAt = now;
        branch.QrCodeUpdatedAt = now;
        branch.QrCodeIsActive = true;
        await _context.SaveChangesAsync();
    }

    private static BranchQrPayloadDto ToBranchQrDto(Branch branch) => new()
    {
        BranchId = branch.Id,
        BranchName = branch.Name,
        QrPayload = $"GYMIND_BRANCH|{branch.Id}|{branch.QrCodeToken}",
        IsActive = branch.QrCodeIsActive,
        CreatedAtUtc = branch.QrCodeCreatedAt,
        UpdatedAtUtc = branch.QrCodeUpdatedAt
    };

    private bool CanAccessBranch(Branch branch)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId.HasValue && branch.GymId == _currentUser.GymId;
        }

        return _currentUser.BranchId.HasValue && branch.Id == _currentUser.BranchId;
    }

    private static string GenerateBranchQrToken() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

    private static double CalculateDistanceMeters(
        double lat1,
        double lng1,
        double lat2,
        double lng2)
    {
        const double earthRadiusMeters = 6371000;
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLng = DegreesToRadians(lng2 - lng1);
        var a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(DegreesToRadians(lat1)) *
            Math.Cos(DegreesToRadians(lat2)) *
            Math.Sin(dLng / 2) *
            Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusMeters * c;
    }

    private static double DegreesToRadians(double degrees) => degrees * Math.PI / 180d;
}
