using System.Security.Claims;
using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Gymind.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/member")]
[Authorize(Roles = AppRoles.Member)]
public class MemberClassesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMemberBranchAccessService _branchAccessService;

    public MemberClassesController(ApplicationDbContext context, IMemberBranchAccessService branchAccessService)
    {
        _context = context;
        _branchAccessService = branchAccessService;
    }

    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses()
    {
        var member = await ResolveMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var branchIds = await _branchAccessService.GetAccessibleBranchIdsForMemberAsync(member);
        if (branchIds.Count == 0)
        {
            return Ok(Array.Empty<BookingResponseDto>());
        }

        var now = DateTime.UtcNow;
        var classes = await _context.Classes
            .Where(item => item.StartTime.HasValue && item.StartTime.Value >= now)
            .Where(item => item.BranchId.HasValue && branchIds.Contains(item.BranchId.Value))
            .OrderBy(item => item.StartTime)
            .Take(50)
            .ToListAsync();

        return Ok(await ToClassDtos(member.Id, classes));
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings()
    {
        var member = await ResolveMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var now = DateTime.UtcNow;
        var bookings = await _context.ClassBookings
            .Where(item => item.MemberId == member.Id &&
                (item.Status == AppStatuses.BookingBooked || item.Status == "Booked" || item.Status == "BOOKED"))
            .ToListAsync();
        var classIds = bookings.Where(item => item.ClassId.HasValue).Select(item => item.ClassId!.Value).ToList();
        var classes = await _context.Classes
            .Where(item => classIds.Contains(item.Id) && (!item.StartTime.HasValue || item.StartTime.Value >= now))
            .OrderBy(item => item.StartTime)
            .ToListAsync();

        return Ok(await ToClassDtos(member.Id, classes));
    }

    [HttpPost("classes/{classId:long}/book")]
    public async Task<IActionResult> Book(long classId)
    {
        var member = await ResolveMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var gymClass = await _context.Classes.FirstOrDefaultAsync(item => item.Id == classId);
        if (gymClass == null)
        {
            return NotFound(new { message = "Class not found." });
        }

        if (!gymClass.StartTime.HasValue || gymClass.StartTime.Value <= DateTime.UtcNow)
        {
            return BadRequest(new { message = "Past classes cannot be booked." });
        }

        if (!gymClass.BranchId.HasValue)
        {
            return BadRequest(new { message = "Class branch is not configured." });
        }

        var branchIds = await _branchAccessService.GetAccessibleBranchIdsForMemberAsync(member);
        if (branchIds.Count == 0)
        {
            return BadRequest(new { message = "You do not have an active membership." });
        }

        if (!branchIds.Contains(gymClass.BranchId.Value))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Your membership does not include access to this branch." });
        }

        var existing = await _context.ClassBookings.FirstOrDefaultAsync(item =>
            item.ClassId == classId &&
            item.MemberId == member.Id &&
            (item.Status == AppStatuses.BookingBooked || item.Status == "Booked" || item.Status == "BOOKED"));
        if (existing != null)
        {
            return Conflict(new { message = "You already have an active booking for this class.", bookingId = existing.Id });
        }

        if (gymClass.Capacity.HasValue && gymClass.Capacity.Value > 0)
        {
            var activeBookings = await _context.ClassBookings.CountAsync(item =>
                item.ClassId == classId &&
                (item.Status == AppStatuses.BookingBooked || item.Status == "Booked" || item.Status == "BOOKED"));
            if (activeBookings >= gymClass.Capacity.Value)
            {
                return BadRequest(new { message = "Class capacity has been reached." });
            }
        }

        var booking = new ClassBooking
        {
            ClassId = classId,
            MemberId = member.Id,
            Status = AppStatuses.BookingBooked,
            BookedAt = DateTime.UtcNow
        };
        _context.ClassBookings.Add(booking);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException postgres && postgres.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            _context.Entry(booking).State = EntityState.Detached;
            return Conflict(new { message = "You already have an active booking for this class." });
        }

        return Ok(new { message = "Class booked successfully.", bookingId = booking.Id, classId });
    }

    [HttpPost("bookings/{bookingId:long}/cancel")]
    public async Task<IActionResult> CancelBooking(long bookingId)
    {
        var member = await ResolveMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var booking = await _context.ClassBookings.FirstOrDefaultAsync(item => item.Id == bookingId && item.MemberId == member.Id);
        if (booking == null)
        {
            return NotFound(new { message = "Booking not found." });
        }

        if (AppStatuses.NormalizeBooking(booking.Status) == AppStatuses.BookingCancelled)
        {
            return Ok(new { message = "Booking was already cancelled.", bookingId = booking.Id, classId = booking.ClassId });
        }

        booking.Status = AppStatuses.BookingCancelled;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Booking cancelled.", bookingId = booking.Id, classId = booking.ClassId });
    }

    [HttpPost("classes/{classId:long}/cancel")]
    public async Task<IActionResult> CancelClass(long classId)
    {
        var member = await ResolveMemberAsync();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var booking = await _context.ClassBookings.FirstOrDefaultAsync(item =>
            item.ClassId == classId &&
            item.MemberId == member.Id &&
            (item.Status == AppStatuses.BookingBooked || item.Status == "Booked" || item.Status == "BOOKED"));
        if (booking == null)
        {
            return Ok(new { message = "No active booking found for this class.", classId });
        }

        booking.Status = AppStatuses.BookingCancelled;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Booking cancelled.", bookingId = booking.Id, classId });
    }

    private async Task<List<BookingResponseDto>> ToClassDtos(long memberId, List<GymClass> classes)
    {
        var classIds = classes.Select(item => item.Id).ToList();
        var branchIds = classes.Where(item => item.BranchId.HasValue).Select(item => item.BranchId!.Value).Distinct().ToList();
        var trainerIds = classes.Where(item => item.TrainerUserId.HasValue).Select(item => item.TrainerUserId!.Value).Distinct().ToList();
        var branches = await _context.Branches.Where(item => branchIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id);
        var trainers = await _context.Users.Where(item => trainerIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id);
        var activeBookings = await _context.ClassBookings
            .Where(item => item.ClassId.HasValue &&
                classIds.Contains(item.ClassId.Value) &&
                (item.Status == AppStatuses.BookingBooked || item.Status == "Booked" || item.Status == "BOOKED"))
            .ToListAsync();

        return classes.Select(gymClass =>
        {
            var booking = activeBookings.FirstOrDefault(item => item.ClassId == gymClass.Id && item.MemberId == memberId);
            var bookedCount = activeBookings.Count(item => item.ClassId == gymClass.Id);
            var capacity = gymClass.Capacity is > 0 ? gymClass.Capacity.Value : 0;
            var trainer = gymClass.TrainerUserId.HasValue && trainers.TryGetValue(gymClass.TrainerUserId.Value, out var trainerUser)
                ? trainerUser.FullName ?? string.Empty
                : string.Empty;
            var branchName = gymClass.BranchId.HasValue && branches.TryGetValue(gymClass.BranchId.Value, out var branch)
                ? branch.Name
                : string.Empty;

            return new BookingResponseDto
            {
                Id = gymClass.Id,
                ClassId = gymClass.Id,
                BookingId = booking?.Id,
                Title = gymClass.Name ?? "Class",
                Coach = trainer,
                BranchId = gymClass.BranchId,
                BranchName = branchName,
                StartAt = gymClass.StartTime ?? DateTime.UtcNow,
                EndAt = gymClass.EndTime,
                Capacity = capacity,
                AvailableSpots = capacity > 0 ? Math.Max(capacity - bookedCount, 0) : 0,
                Booked = booking != null
            };
        }).ToList();
    }

    private async Task<Member?> ResolveMemberAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return null;
        }

        return await _context.Members.FirstOrDefaultAsync(item => item.UserId == parsedUserId && item.IsActive);
    }
}
