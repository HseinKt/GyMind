using System.Security.Claims;
using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookingController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public BookingController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetClasses()
    {
        var member = await ResolveMemberAsync();
        var bookings = member == null
            ? new List<ClassBooking>()
            : await _context.ClassBookings.Where(item => item.MemberId == member.Id).ToListAsync();

        var classes = await _context.Classes.OrderBy(item => item.StartTime).Take(8).ToListAsync();
        var response = classes.Select(item =>
        {
            var bookedCount = bookings.Count(booking => booking.ClassId == item.Id && AppStatuses.IsBooked(booking.Status));
            var totalBooked = _context.ClassBookings.Count(booking => booking.ClassId == item.Id && (booking.Status == AppStatuses.BookingBooked || booking.Status == "Booked"));
            return new BookingResponseDto
            {
                Id = item.Id,
                Title = item.Name ?? "Forge Session",
                Coach = item.TrainerUserId.HasValue ? $"Coach #{item.TrainerUserId.Value}" : "Unassigned trainer",
                StartAt = item.StartTime ?? DateTime.UtcNow.AddHours(2),
                AvailableSpots = Math.Max(0, (item.Capacity ?? 12) - totalBooked),
                Booked = bookedCount > 0
            };
        });

        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Book([FromBody] BookingActionDto dto)
    {
        var member = await ResolveMemberAsync();
        if (member == null)
        {
            return BadRequest(new { message = "Member profile not found." });
        }

        var gymClass = await _context.Classes.FirstOrDefaultAsync(item => item.Id == dto.ClassId);
        if (gymClass == null)
        {
            return NotFound(new { message = "Class not found." });
        }

        var existing = await _context.ClassBookings.FirstOrDefaultAsync(item =>
            item.ClassId == dto.ClassId && item.MemberId == member.Id && (item.Status == AppStatuses.BookingBooked || item.Status == "Booked"));

        if (existing != null)
        {
            return Ok(new { message = "Already booked." });
        }

        var activeBookings = await _context.ClassBookings.CountAsync(item =>
            item.ClassId == dto.ClassId && (item.Status == AppStatuses.BookingBooked || item.Status == "Booked"));

        if (activeBookings >= (gymClass.Capacity ?? 12))
        {
            return BadRequest(new { message = "Class is fully booked." });
        }

        _context.ClassBookings.Add(new ClassBooking
        {
            ClassId = dto.ClassId,
            MemberId = member.Id,
            Status = AppStatuses.BookingBooked,
            BookedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(new { message = "Class booked successfully." });
    }

    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel([FromBody] BookingActionDto dto)
    {
        var member = await ResolveMemberAsync();
        if (member == null)
        {
            return BadRequest(new { message = "Member profile not found." });
        }

        var booking = await _context.ClassBookings.FirstOrDefaultAsync(item =>
            item.ClassId == dto.ClassId && item.MemberId == member.Id && (item.Status == AppStatuses.BookingBooked || item.Status == "Booked"));

        if (booking == null)
        {
            return NotFound(new { message = "Booking not found." });
        }

        booking.Status = AppStatuses.BookingCancelled;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Booking cancelled." });
    }

    private async Task<Member?> ResolveMemberAsync()
    {
        var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return null;
        }

        return await _context.Members.FirstOrDefaultAsync(item => item.UserId == parsedUserId);
    }
}
