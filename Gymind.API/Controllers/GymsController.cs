using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Helpers;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GymsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public GymsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetGyms()
    {
        var gyms = await ApplyScope(_context.Gyms.AsQueryable())
            .OrderBy(g => g.Name)
            .ToListAsync();
        var gymIds = gyms.Select(gym => gym.Id).ToList();
        var owners = await GetOwnerCandidatesAsync();
        var branchCounts = await _context.Branches
            .Where(branch => branch.GymId.HasValue && gymIds.Contains(branch.GymId.Value))
            .GroupBy(branch => branch.GymId!.Value)
            .Select(group => new { GymId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.GymId, item => item.Count);
        var subscriptions = await _context.GymSubscriptions
            .Where(subscription => subscription.GymId.HasValue && gymIds.Contains(subscription.GymId.Value))
            .OrderByDescending(subscription => subscription.DueDate)
            .ThenByDescending(subscription => subscription.Id)
            .ToListAsync();

        return Ok(gyms.Select(gym => ToGymResponse(gym, owners, branchCounts, subscriptions)).ToList());
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetGym(long id)
    {
        var gym = await ApplyScope(_context.Gyms.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (gym == null)
        {
            return NotFound();
        }

        return Ok(ToGymResponse(gym, await GetOwnerCandidatesAsync(), await GetBranchCountsAsync([gym.Id]), await GetSubscriptionsAsync([gym.Id])));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> CreateGym([FromBody] CreateGymRequest request)
    {
        try
        {
            var gym = new Gym
            {
                Name = request.Name,
                OwnerUserId = request.OwnerUserId,
                LogoUrl = request.LogoUrl,
                City = request.City,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Gyms.Add(gym);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetGym), new { id = gym.Id }, ToGymResponse(gym, await GetOwnerCandidatesAsync(), await GetBranchCountsAsync([gym.Id]), await GetSubscriptionsAsync([gym.Id])));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.OwnerRoles)]
    public async Task<IActionResult> UpdateGym(long id, [FromBody] UpdateGymRequest request)
    {
        try
        {
            var gym = await ApplyScope(_context.Gyms.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (gym == null)
            {
                return NotFound();
            }

            gym.Name = request.Name;
            gym.OwnerUserId = request.OwnerUserId;
            gym.LogoUrl = request.LogoUrl;
            gym.City = request.City;

            if (gym.IsActive != request.IsActive)
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    await CascadeGymStatusUpdateAsync(gym, request.IsActive);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = ex.ToDetailedMessage() });
                }
            }
            else
            {
                await _context.SaveChangesAsync();
            }

            return Ok(ToGymResponse(gym, await GetOwnerCandidatesAsync(), await GetBranchCountsAsync([gym.Id]), await GetSubscriptionsAsync([gym.Id])));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPatch("{id:long}/status")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateStatusRequest request)
    {
        var gym = await ApplyScope(_context.Gyms.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (gym == null)
        {
            return NotFound();
        }

        if (gym.IsActive != request.IsActive)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                await CascadeGymStatusUpdateAsync(gym, request.IsActive);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = ex.ToDetailedMessage() });
            }
        }

        return Ok(ToGymResponse(gym, await GetOwnerCandidatesAsync(), await GetBranchCountsAsync([gym.Id]), await GetSubscriptionsAsync([gym.Id])));
    }

    private async Task CascadeGymStatusUpdateAsync(Gym gym, bool isActive)
    {
        gym.IsActive = isActive;

        // Cascade update to branches
        var branches = await _context.Branches
            .Where(b => b.GymId == gym.Id)
            .ToListAsync();
        foreach (var branch in branches)
        {
            branch.IsActive = isActive;
        }

        // Cascade update to owners (Users with GymOwner role linked to the gym)
        var ownerRoleIds = await _context.Roles
            .Where(role => role.Name == AppRoles.GymOwner)
            .Select(role => role.Id)
            .ToListAsync();
        var owners = await _context.Users
            .Where(user => ownerRoleIds.Contains(user.RoleId) && (user.GymId == gym.Id || (gym.OwnerUserId.HasValue && user.Id == gym.OwnerUserId.Value)))
            .ToListAsync();
        foreach (var owner in owners)
        {
            owner.IsActive = isActive;
        }
    }

    [HttpPost("{id:long}/owners")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> LinkOwner(long id, [FromBody] LinkGymOwnerRequest request)
    {
        var gym = await ApplyScope(_context.Gyms.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (gym == null)
        {
            return NotFound(new { message = "Gym not found." });
        }

        var ownerRoleId = await _context.Roles
            .Where(role => role.Name == AppRoles.GymOwner)
            .Select(role => role.Id)
            .FirstOrDefaultAsync();

        var owner = await _context.Users.FirstOrDefaultAsync(user => user.Id == request.UserId);
        if (owner == null)
        {
            return NotFound(new { message = "Owner user not found." });
        }

        if (owner.RoleId != ownerRoleId)
        {
            return BadRequest(new { message = "Only users with the Gym Owner role can be linked as gym owners." });
        }

        if (owner.GymId.HasValue && owner.GymId.Value != gym.Id)
        {
            return BadRequest(new { message = "This owner is already linked to another gym." });
        }

        if (owner.GymId == gym.Id)
        {
            return Ok(ToGymResponse(gym, await GetOwnerCandidatesAsync(), await GetBranchCountsAsync([gym.Id]), await GetSubscriptionsAsync([gym.Id])));
        }

        owner.GymId = gym.Id;
        owner.BranchId = null;
        if (!gym.OwnerUserId.HasValue)
        {
            gym.OwnerUserId = owner.Id;
        }

        await _context.SaveChangesAsync();
        return Ok(ToGymResponse(gym, await GetOwnerCandidatesAsync(), await GetBranchCountsAsync([gym.Id]), await GetSubscriptionsAsync([gym.Id])));
    }

    [HttpPost("upload-logo")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadLogo([FromForm] UploadGymLogoRequest request)
    {
        var file = request.File;
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Please choose a gym photo to upload." });
        }

        var allowedTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        };

        if (!allowedTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = "Gym photo must be a JPEG, PNG, WebP, or GIF image." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = file.ContentType.Equals("image/png", StringComparison.OrdinalIgnoreCase) ? ".png" :
                file.ContentType.Equals("image/webp", StringComparison.OrdinalIgnoreCase) ? ".webp" :
                file.ContentType.Equals("image/gif", StringComparison.OrdinalIgnoreCase) ? ".gif" :
                ".jpg";
        }

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var uploadRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "gyms");
        Directory.CreateDirectory(uploadRoot);
        var filePath = Path.Combine(uploadRoot, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new { logoUrl = $"/uploads/gyms/{fileName}" });
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> DeleteGym(long id)
    {
        try
        {
            var gym = await _context.Gyms.FindAsync(id);
            if (gym == null)
            {
                return NotFound();
            }

            _context.Gyms.Remove(gym);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<Gym> ApplyScope(IQueryable<Gym> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        return _currentUser.GymId.HasValue
            ? query.Where(item => item.Id == _currentUser.GymId.Value)
            : query.Where(item => false);
    }

    private async Task<List<User>> GetOwnerCandidatesAsync()
    {
        var ownerRoleIds = await _context.Roles
            .Where(role => role.Name == AppRoles.GymOwner)
            .Select(role => role.Id)
            .ToListAsync();

        return await _context.Users
            .Where(user => ownerRoleIds.Contains(user.RoleId))
            .OrderBy(user => user.FullName)
            .ToListAsync();
    }

    private async Task<Dictionary<long, int>> GetBranchCountsAsync(IReadOnlyCollection<long> gymIds)
    {
        return await _context.Branches
            .Where(branch => branch.GymId.HasValue && gymIds.Contains(branch.GymId.Value))
            .GroupBy(branch => branch.GymId!.Value)
            .Select(group => new { GymId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.GymId, item => item.Count);
    }

    private async Task<List<GymSubscription>> GetSubscriptionsAsync(IReadOnlyCollection<long> gymIds)
    {
        return await _context.GymSubscriptions
            .Where(subscription => subscription.GymId.HasValue && gymIds.Contains(subscription.GymId.Value))
            .OrderByDescending(subscription => subscription.DueDate)
            .ThenByDescending(subscription => subscription.Id)
            .ToListAsync();
    }

    private static GymResponse ToGymResponse(
        Gym gym,
        IReadOnlyCollection<User> owners,
        IReadOnlyDictionary<long, int> branchCounts,
        IReadOnlyCollection<GymSubscription> subscriptions)
    {
        var linkedOwners = owners
            .Where(user => user.GymId == gym.Id || (gym.OwnerUserId.HasValue && user.Id == gym.OwnerUserId.Value))
            .GroupBy(user => user.Id)
            .Select(group => group.First())
            .OrderBy(user => user.FullName)
            .ToList();
        var owner = gym.OwnerUserId.HasValue
            ? linkedOwners.FirstOrDefault(user => user.Id == gym.OwnerUserId.Value)
            : linkedOwners.FirstOrDefault();
        var subscription = subscriptions.FirstOrDefault(item => item.GymId == gym.Id);

        return new GymResponse
        {
            Id = gym.Id,
            Name = gym.Name,
            OwnerUserId = gym.OwnerUserId ?? owner?.Id,
            OwnerName = linkedOwners.Count == 0 ? "No owners assigned" : string.Join(", ", linkedOwners.Select(item => string.IsNullOrWhiteSpace(item.FullName) ? item.Email : item.FullName)),
            Owners = linkedOwners.Select(o => ToGymOwnerResponse(o, gym.IsActive)).ToList(),
            OwnerCount = linkedOwners.Count,
            OwnerEmails = linkedOwners.Select(item => item.Email ?? string.Empty).Where(item => !string.IsNullOrWhiteSpace(item)).ToList(),
            OwnerPhones = linkedOwners.Select(item => item.Phone ?? string.Empty).Where(item => !string.IsNullOrWhiteSpace(item)).ToList(),
            LogoUrl = gym.LogoUrl,
            City = gym.City,
            IsActive = gym.IsActive,
            Status = gym.IsActive ? "Active" : "Inactive",
            CreatedAt = gym.CreatedAt,
            Branches = branchCounts.TryGetValue(gym.Id, out var count) ? count : 0,
            SubscriptionStatus = subscription?.Status,
            SubscriptionPlan = subscription?.PlanName,
            SubscriptionDueDate = subscription?.DueDate
        };
    }

    private static GymOwnerResponse ToGymOwnerResponse(User owner, bool gymActive)
    {
        return new GymOwnerResponse
        {
            Id = owner.Id,
            Name = owner.FullName ?? string.Empty,
            Email = owner.Email ?? string.Empty,
            Phone = owner.Phone,
            IsActive = owner.IsActive && gymActive
        };
    }

    private sealed class GymResponse
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public long? OwnerUserId { get; set; }
        public string OwnerName { get; set; } = "Not assigned";
        public List<GymOwnerResponse> Owners { get; set; } = [];
        public int OwnerCount { get; set; }
        public List<string> OwnerEmails { get; set; } = [];
        public List<string> OwnerPhones { get; set; } = [];
        public string? LogoUrl { get; set; }
        public string? City { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = "Inactive";
        public DateTime? CreatedAt { get; set; }
        public int Branches { get; set; }
        public string? SubscriptionStatus { get; set; }
        public string? SubscriptionPlan { get; set; }
        public DateOnly? SubscriptionDueDate { get; set; }
    }

    private sealed class GymOwnerResponse
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public bool IsActive { get; set; }
    }
}
