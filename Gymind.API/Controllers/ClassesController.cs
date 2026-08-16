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
public class ClassesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public ClassesController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetClasses([FromQuery] long? gymId, [FromQuery] long? branchId, [FromQuery] bool activeOnly = false)
    {
        var query = ApplyScope(_context.Classes.AsQueryable());

        if (gymId.HasValue)
        {
            query = query.Where(c => c.GymId == gymId.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(c => c.BranchId == branchId.Value);
        }

        if (activeOnly)
        {
            var now = DateTime.UtcNow;
            query = query.Where(c => !c.EndTime.HasValue || c.EndTime >= now);
        }

        var classes = await query.OrderBy(c => c.StartTime).ToListAsync();
        return Ok(await BuildClassDtosAsync(classes));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetClass(long id)
    {
        var gymClass = await ApplyScope(_context.Classes.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return gymClass == null ? NotFound() : Ok(gymClass);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.SchedulingRoles)]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
    {
        try
        {
            var scopedBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.BranchId
                : _currentUser.BranchId;
            var scopedGymId = _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.GymId
                : await ResolveClassGymIdAsync(request.GymId, scopedBranchId);

            var validation = await ValidateClassRequestAsync(request, scopedGymId, scopedBranchId);
            if (validation != null)
            {
                return validation;
            }

            var gymClass = new GymClass
            {
                GymId = scopedGymId,
                BranchId = scopedBranchId,
                TrainerUserId = _currentUser.IsInRole(AppRoles.Trainer) ? _currentUser.UserId : request.TrainerUserId,
                Name = request.Name.Trim(),
                Capacity = request.Capacity,
                StartTime = NormalizeUtc(request.StartTime),
                EndTime = NormalizeUtc(request.EndTime)
            };

            _context.Classes.Add(gymClass);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetClass), new { id = gymClass.Id }, await BuildClassDtoAsync(gymClass.Id));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.SchedulingRoles)]
    public async Task<IActionResult> UpdateClass(long id, [FromBody] UpdateClassRequest request)
    {
        try
        {
            var gymClass = await ApplyScope(_context.Classes.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (gymClass == null)
            {
                return NotFound();
            }

            var nextBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.BranchId
                : gymClass.BranchId;
            var nextGymId = _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.GymId
                : await ResolveClassGymIdAsync(gymClass.GymId, nextBranchId);
            var validation = await ValidateClassRequestAsync(request, nextGymId, nextBranchId);
            if (validation != null)
            {
                return validation;
            }

            gymClass.GymId = nextGymId;
            gymClass.BranchId = nextBranchId;
            gymClass.TrainerUserId = _currentUser.IsInRole(AppRoles.Trainer) ? _currentUser.UserId : request.TrainerUserId;
            gymClass.Name = request.Name.Trim();
            gymClass.Capacity = request.Capacity;
            gymClass.StartTime = NormalizeUtc(request.StartTime);
            gymClass.EndTime = NormalizeUtc(request.EndTime);

            await _context.SaveChangesAsync();
            return Ok(await BuildClassDtoAsync(gymClass.Id));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPost("{id:long}/cancel")]
    [Authorize(Roles = AppRoles.SchedulingRoles)]
    public async Task<IActionResult> CancelClass(long id)
    {
        try
        {
            var gymClass = await ApplyScope(_context.Classes.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (gymClass == null)
            {
                return NotFound();
            }

            var now = DateTime.UtcNow;
            if (!gymClass.StartTime.HasValue || gymClass.StartTime.Value > now)
            {
                gymClass.StartTime = now;
            }

            gymClass.EndTime = now;
            await _context.SaveChangesAsync();
            return Ok(await BuildClassDtoAsync(gymClass.Id));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<GymClass> ApplyScope(IQueryable<GymClass> query)
    {
        if (_currentUser.IsInRole(AppRoles.Trainer))
        {
            return query.Where(item => item.TrainerUserId == _currentUser.UserId);
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager) && !_currentUser.BranchId.HasValue)
        {
            return query.Where(item => false);
        }

        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && _currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        return query;
    }

    private async Task<IActionResult?> ValidateClassRequestAsync(CreateClassRequest request, long? gymId, long? branchId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Class name is required." });
        }

        if (!branchId.HasValue)
        {
            return BadRequest(new { message = "Branch is required." });
        }

        if (!gymId.HasValue)
        {
            return BadRequest(new { message = "Gym is required." });
        }

        if (request.Capacity.HasValue && request.Capacity.Value <= 0)
        {
            return BadRequest(new { message = "Capacity must be greater than zero." });
        }

        var start = NormalizeUtc(request.StartTime);
        var end = NormalizeUtc(request.EndTime);
        if (!start.HasValue || !end.HasValue)
        {
            return BadRequest(new { message = "Start and end time are required." });
        }

        if (end.Value <= start.Value)
        {
            return BadRequest(new { message = "End time must be after start time." });
        }

        if (!await IsValidClassScopeAsync(gymId, branchId))
        {
            return BadRequest(new { message = "Invalid gym or branch scope." });
        }

        if (request.TrainerUserId.HasValue)
        {
            var trainer = await _context.Users.Include(user => user.Role).FirstOrDefaultAsync(user => user.Id == request.TrainerUserId.Value);
            if (trainer == null || trainer.Role?.Name != AppRoles.Trainer || trainer.BranchId != branchId || trainer.GymId != gymId)
            {
                return BadRequest(new { message = "Trainer must be assigned to the selected branch." });
            }
        }

        return null;
    }

    private async Task<bool> IsValidClassScopeAsync(long? gymId, long? branchId)
    {
        if (_currentUser.IsInRole(AppRoles.BranchManager))
        {
            return branchId == _currentUser.BranchId && gymId == _currentUser.GymId;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return gymId.HasValue &&
                await _context.Gyms.AnyAsync(gym => gym.Id == gymId.Value && (gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))) &&
                branchId.HasValue &&
                await _context.Branches.AnyAsync(branch => branch.Id == branchId.Value && branch.GymId == gymId.Value);
        }

        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return gymId.HasValue &&
                branchId.HasValue &&
                await _context.Branches.AnyAsync(branch => branch.Id == branchId.Value && branch.GymId == gymId.Value);
        }

        if (_currentUser.IsInRole(AppRoles.Trainer))
        {
            return branchId == _currentUser.BranchId && gymId == _currentUser.GymId;
        }

        return false;
    }

    private async Task<long?> ResolveClassGymIdAsync(long? requestedGymId, long? branchId)
    {
        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            if (requestedGymId.HasValue)
            {
                return requestedGymId;
            }

            return branchId.HasValue
                ? await _context.Branches.Where(branch => branch.Id == branchId.Value).Select(branch => branch.GymId).FirstOrDefaultAsync()
                : _currentUser.GymId;
        }

        return _currentUser.GymId;
    }

    private async Task<AdminClassDto?> BuildClassDtoAsync(long id)
    {
        var classes = await ApplyScope(_context.Classes.AsQueryable()).Where(item => item.Id == id).ToListAsync();
        return (await BuildClassDtosAsync(classes)).FirstOrDefault();
    }

    private async Task<List<AdminClassDto>> BuildClassDtosAsync(IReadOnlyCollection<GymClass> classes)
    {
        var trainerIds = classes.Where(item => item.TrainerUserId.HasValue).Select(item => item.TrainerUserId!.Value).Distinct().ToList();
        var classIds = classes.Select(item => item.Id).ToList();
        var trainers = await _context.Users
            .Where(user => trainerIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => user.FullName ?? string.Empty);
        var bookedCounts = await _context.ClassBookings
            .Where(booking => booking.ClassId.HasValue && classIds.Contains(booking.ClassId.Value) && (booking.Status == null || booking.Status == AppStatuses.BookingBooked || booking.Status == "Booked"))
            .GroupBy(booking => booking.ClassId!.Value)
            .Select(group => new { ClassId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ClassId, item => item.Count);

        return classes.Select(item =>
        {
            var start = item.StartTime;
            var end = item.EndTime;
            var status = end.HasValue && end.Value < DateTime.UtcNow ? "COMPLETED" : "ACTIVE";
            return new AdminClassDto
            {
                Id = item.Id,
                GymId = item.GymId,
                BranchId = item.BranchId,
                Name = item.Name ?? string.Empty,
                TrainerId = item.TrainerUserId,
                TrainerName = item.TrainerUserId.HasValue && trainers.TryGetValue(item.TrainerUserId.Value, out var trainerName) && !string.IsNullOrWhiteSpace(trainerName) ? trainerName : "Not assigned",
                Time = FormatTimeRange(start, end),
                StartTime = start,
                EndTime = end,
                Capacity = item.Capacity ?? 0,
                Booked = bookedCounts.TryGetValue(item.Id, out var count) ? count : 0,
                Status = status
            };
        }).ToList();
    }

    private static string FormatTimeRange(DateTime? start, DateTime? end)
    {
        if (!start.HasValue && !end.HasValue)
        {
            return "No data";
        }

        if (!start.HasValue || !end.HasValue)
        {
            return (start ?? end)!.Value.ToLocalTime().ToString("yyyy-MM-dd HH:mm");
        }

        return $"{start.Value.ToLocalTime():yyyy-MM-dd HH:mm} - {end.Value.ToLocalTime():HH:mm}";
    }

    private static DateTime? NormalizeUtc(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
        };
    }
}
