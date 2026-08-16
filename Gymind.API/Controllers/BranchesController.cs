using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Helpers;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BranchesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public BranchesController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    // ================= GET ALL =================
    [HttpGet]
    public async Task<IActionResult> GetBranches([FromQuery] long? gymId)
    {
        var query = ApplyScope(_context.Branches.AsQueryable());

        if (gymId.HasValue)
        {
            query = query.Where(b => b.GymId == gymId.Value);
        }

        var branches = await query
            .OrderBy(b => b.Name)
            .ToListAsync();

        return Ok(branches);
    }

    // ================= GET BY ID =================
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetBranch(long id)
    {
        var branch = await ApplyScope(_context.Branches.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return branch == null ? NotFound() : Ok(branch);
    }

    // ================= CREATE =================
    [HttpPost]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> CreateBranch([FromBody] CreateBranchRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Invalid branch data." });
            }
            if (!TryParseBranchTime(request.OpenTime, out var openTime, out var timeError) ||
                !TryParseBranchTime(request.CloseTime, out var closeTime, out timeError))
            {
                return BadRequest(new { message = timeError });
            }
            if (!TryParseBranchIsActive(request.IsActive, out var isActive, out var activeError))
            {
                return BadRequest(new { message = activeError });
            }

            var gymId = _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.GymId
                : await ResolveOwnedGymIdAsync(request.GymId);
            if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && !gymId.HasValue)
            {
                return BadRequest(new { message = "Select one of your gyms before creating a branch." });
            }

            if (gymId.HasValue)
            {
                var gymExists = await _context.Gyms.AnyAsync(g => g.Id == gymId.Value &&
                    (_currentUser.IsInRole(AppRoles.SuperAdmin) || g.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && g.Id == _currentUser.GymId.Value)));
                if (!gymExists)
                {
                    return BadRequest(new { message = "Gym not found." });
                }
            }

            var branch = new Branch
            {
                GymId = gymId,
                Name = request.Name,
                Address = request.Address,
                Phone = request.Phone,
                OpenTime = openTime,
                CloseTime = closeTime,
                IsActive = isActive,

                // ✅ Lat/Lng instead of Location
                RangeKm = request.RangeKm,
                Capacity = request.Capacity,
                AreaSqm = request.AreaSqm,
                Lat = request.Lat,
                Lng = request.Lng
            };

            _context.Branches.Add(branch);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetBranch), new { id = branch.Id }, branch);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    // ================= UPDATE =================
    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.AdminRoles)]
    public async Task<IActionResult> UpdateBranch(long id, [FromBody] UpdateBranchRequest request)
    {
        try
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Invalid branch data." });
            }
            if (!TryParseBranchTime(request.OpenTime, out var openTime, out var timeError) ||
                !TryParseBranchTime(request.CloseTime, out var closeTime, out timeError))
            {
                return BadRequest(new { message = timeError });
            }
            if (!TryParseBranchIsActive(request.IsActive, out var isActive, out var activeError))
            {
                return BadRequest(new { message = activeError });
            }

            var branch = await ApplyScope(_context.Branches.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (branch == null)
            {
                return NotFound();
            }

            var gymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : branch.GymId;

            if (gymId.HasValue)
            {
                var gymExists = await _context.Gyms.AnyAsync(g => g.Id == gymId.Value &&
                    (_currentUser.IsInRole(AppRoles.SuperAdmin) || g.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && g.Id == _currentUser.GymId.Value)));
                if (!gymExists)
                {
                    return BadRequest(new { message = "Gym not found." });
                }
            }

            branch.GymId = gymId;
            branch.Name = request.Name;
            branch.Address = request.Address;
            branch.Phone = request.Phone;
            branch.OpenTime = openTime;
            branch.CloseTime = closeTime;
            branch.IsActive = isActive;

            // ✅ Lat/Lng fields
            branch.RangeKm = request.RangeKm;
            branch.Capacity = request.Capacity;
            branch.AreaSqm = request.AreaSqm;
            branch.Lat = request.Lat;
            branch.Lng = request.Lng;

            await _context.SaveChangesAsync();

            return Ok(branch);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<Branch> ApplyScope(IQueryable<Branch> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            var ownedGymIds = _context.Gyms
                .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
                .Select(gym => gym.Id);
            return query.Where(item => item.GymId.HasValue && ownedGymIds.Contains(item.GymId.Value));
        }

        if (_currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue &&
            !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.Id == _currentUser.BranchId.Value);
        }

        return query;
    }

    private async Task<long?> ResolveOwnedGymIdAsync(long? requestedGymId)
    {
        if (!_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId;
        }

        var ownedGymIds = await _context.Gyms
            .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
            .Select(gym => gym.Id)
            .ToListAsync();

        if (requestedGymId.HasValue)
        {
            return ownedGymIds.Contains(requestedGymId.Value) ? requestedGymId.Value : null;
        }

        if (_currentUser.GymId.HasValue && ownedGymIds.Contains(_currentUser.GymId.Value))
        {
            return _currentUser.GymId.Value;
        }

        return ownedGymIds.Count == 1 ? ownedGymIds[0] : null;
    }

    private static bool TryParseBranchTime(string? value, out TimeOnly? time, out string error)
    {
        time = null;
        error = string.Empty;

        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        if (TimeOnly.TryParse(value, out var parsed))
        {
            time = parsed;
            return true;
        }

        error = "Branch time must use HH:mm format.";
        return false;
    }

    private static bool TryParseBranchIsActive(JsonElement? value, out bool isActive, out string error)
    {
        isActive = true;
        error = string.Empty;

        if (!value.HasValue || value.Value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return true;
        }

        if (value.Value.ValueKind == JsonValueKind.True)
        {
            isActive = true;
            return true;
        }

        if (value.Value.ValueKind == JsonValueKind.False)
        {
            isActive = false;
            return true;
        }

        if (value.Value.ValueKind == JsonValueKind.String)
        {
            var text = value.Value.GetString();
            if (string.IsNullOrWhiteSpace(text))
            {
                return true;
            }

            if (bool.TryParse(text, out var parsed))
            {
                isActive = parsed;
                return true;
            }

            if (string.Equals(text, "on", StringComparison.OrdinalIgnoreCase))
            {
                isActive = true;
                return true;
            }
        }

        error = "Branch active status must be true or false.";
        return false;
    }
}
