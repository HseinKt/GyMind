using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/trainer")]
[Authorize(Roles = AppRoles.Trainer)]
public class TrainerClassBookingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public TrainerClassBookingsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet("classes/{classId:long}/bookings")]
    public async Task<IActionResult> GetClassBookings(long classId)
    {
        if (!await TrainerOwnsClassAsync(classId))
        {
            return NotFound(new { message = "Class not found." });
        }

        var bookings = await (
            from booking in _context.ClassBookings
            join member in _context.Members on booking.MemberId equals member.Id
            where booking.ClassId == classId &&
                (booking.Status == null ||
                 booking.Status == AppStatuses.BookingBooked ||
                 booking.Status == "Booked" ||
                 booking.Status == "booked")
            orderby member.FullName, booking.BookedAt
            select new TrainerClassBookingDto
            {
                BookingId = booking.Id,
                ClassId = booking.ClassId,
                MemberId = booking.MemberId,
                MemberName = member.FullName ?? "Member",
                MemberPhone = member.Phone,
                MemberEmail = member.Email,
                Status = booking.Status,
                BookedAt = booking.BookedAt,
                Attended = booking.Attended,
                AttendedAt = booking.AttendedAt
            }).ToListAsync();

        return Ok(bookings);
    }

    [HttpPatch("class-bookings/{bookingId:long}/attendance")]
    public async Task<IActionResult> UpdateAttendance(long bookingId, [FromBody] UpdateClassBookingAttendanceRequest request)
    {
        var booking = await _context.ClassBookings.FirstOrDefaultAsync(item => item.Id == bookingId);
        if (booking == null || !booking.ClassId.HasValue)
        {
            return NotFound(new { message = "Booking not found." });
        }

        if (!await TrainerOwnsClassAsync(booking.ClassId.Value))
        {
            return NotFound(new { message = "Booking not found." });
        }

        booking.Attended = request.Attended;
        booking.AttendedAt = request.Attended ? DateTime.UtcNow : null;
        await _context.SaveChangesAsync();

        var dto = await BuildBookingDtoAsync(booking.Id);
        return dto == null ? NotFound(new { message = "Booking not found." }) : Ok(dto);
    }

    [HttpPut("classes/{classId:long}/attendance")]
    public async Task<IActionResult> SaveClassAttendance(long classId, [FromBody] BulkTrainerAttendanceRequest request)
    {
        if (!await TrainerOwnsClassAsync(classId))
        {
            return NotFound(new { message = "Class not found." });
        }

        var bookingIds = request.Bookings.Select(item => item.BookingId).ToHashSet();
        var bookings = await _context.ClassBookings
            .Where(item => item.ClassId == classId && bookingIds.Contains(item.Id))
            .ToListAsync();

        foreach (var item in request.Bookings)
        {
            var booking = bookings.FirstOrDefault(row => row.Id == item.BookingId && (!item.MemberId.HasValue || row.MemberId == item.MemberId));
            if (booking == null)
            {
                return NotFound(new { message = "Booking not found." });
            }

            booking.Attended = item.Attended;
            booking.AttendedAt = item.Attended ? DateTime.UtcNow : null;
        }

        await _context.SaveChangesAsync();
        var updated = await BuildBookingDtosForClassAsync(classId);
        return Ok(updated);
    }

    private Task<bool> TrainerOwnsClassAsync(long classId)
    {
        return _context.Classes.AnyAsync(item => item.Id == classId && item.TrainerUserId == _currentUser.UserId);
    }

    private Task<TrainerClassBookingDto?> BuildBookingDtoAsync(long bookingId)
    {
        return (
            from booking in _context.ClassBookings
            join member in _context.Members on booking.MemberId equals member.Id
            where booking.Id == bookingId
            select new TrainerClassBookingDto
            {
                BookingId = booking.Id,
                ClassId = booking.ClassId,
                MemberId = booking.MemberId,
                MemberName = member.FullName ?? "Member",
                MemberPhone = member.Phone,
                MemberEmail = member.Email,
                Status = booking.Status,
                BookedAt = booking.BookedAt,
                Attended = booking.Attended,
                AttendedAt = booking.AttendedAt
            }).FirstOrDefaultAsync();
    }

    private Task<List<TrainerClassBookingDto>> BuildBookingDtosForClassAsync(long classId)
    {
        return (
            from booking in _context.ClassBookings
            join member in _context.Members on booking.MemberId equals member.Id
            where booking.ClassId == classId
            orderby member.FullName, booking.BookedAt
            select new TrainerClassBookingDto
            {
                BookingId = booking.Id,
                ClassId = booking.ClassId,
                MemberId = booking.MemberId,
                MemberName = member.FullName ?? "Member",
                MemberPhone = member.Phone,
                MemberEmail = member.Email,
                Status = booking.Status,
                BookedAt = booking.BookedAt,
                Attended = booking.Attended,
                AttendedAt = booking.AttendedAt
            }).ToListAsync();
    }
}
