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
public class ClassBookingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public ClassBookingsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetBookings([FromQuery] long? classId, [FromQuery] long? memberId)
    {
        var query = ApplyScope(_context.ClassBookings.AsQueryable());

        if (classId.HasValue)
        {
            query = query.Where(b => b.ClassId == classId.Value);
        }

        if (memberId.HasValue)
        {
            query = query.Where(b => b.MemberId == memberId.Value);
        }

        var bookings = await query.OrderByDescending(b => b.BookedAt).ToListAsync();
        return Ok(bookings);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AttendanceRoles)]
    public async Task<IActionResult> CreateBooking([FromBody] CreateClassBookingRequest request)
    {
        try
        {
            var gymClass = await _context.Classes.FirstOrDefaultAsync(item => item.Id == request.ClassId);
            if (gymClass == null)
            {
                return BadRequest(new { message = "Class not found." });
            }

            var memberId = await ResolveBookingMemberIdAsync(request.MemberId);
            if (!memberId.HasValue)
            {
                return BadRequest(new { message = "Member is required." });
            }

            var member = await _context.Members
                .Include(item => item.User)
                .FirstOrDefaultAsync(item => item.Id == memberId.Value);
            if (member == null)
            {
                return BadRequest(new { message = "Member not found." });
            }

            if (!member.IsActive || member.User?.IsActive == false)
            {
                return BadRequest(new { message = "Member account is inactive." });
            }

            if (gymClass.GymId.HasValue)
            {
                var gymActive = await _context.Gyms
                    .Where(item => item.Id == gymClass.GymId.Value)
                    .Select(item => item.IsActive)
                    .FirstOrDefaultAsync();
                if (!gymActive)
                {
                    return BadRequest(new { message = "Gym is inactive." });
                }
            }

            if (gymClass.BranchId.HasValue)
            {
                var branchActive = await _context.Branches
                    .Where(item => item.Id == gymClass.BranchId.Value)
                    .Select(item => item.IsActive)
                    .FirstOrDefaultAsync();
                if (!branchActive)
                {
                    return BadRequest(new { message = "Branch is inactive." });
                }
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var hasActiveMembership = await _context.MemberMemberships.AnyAsync(item =>
                item.MemberId == member.Id &&
                (item.Status == AppStatuses.MembershipActive || item.Status == "Active" || item.Status == "ACTIVE") &&
                (!item.EndDate.HasValue || item.EndDate.Value >= today));
            if (!hasActiveMembership)
            {
                return BadRequest(new { message = "Member does not have an active membership." });
            }

            if (await _context.ClassBookings.AnyAsync(b => b.ClassId == request.ClassId && b.MemberId == memberId.Value && b.Status != AppStatuses.BookingCancelled && b.Status != "Cancelled"))
            {
                return BadRequest(new { message = "Member already has an active booking for this class." });
            }

            if (gymClass.Capacity.HasValue)
            {
                var activeBookings = await _context.ClassBookings.CountAsync(b => b.ClassId == request.ClassId && (b.Status == AppStatuses.BookingBooked || b.Status == "Booked"));
                if (activeBookings >= gymClass.Capacity.Value)
                {
                    return BadRequest(new { message = "Class capacity has been reached." });
                }
            }

            var booking = new ClassBooking
            {
                ClassId = request.ClassId,
                MemberId = memberId.Value,
                Status = AppStatuses.NormalizeBooking(request.Status),
                BookedAt = DateTime.UtcNow
            };

            _context.ClassBookings.Add(booking);
            await _context.SaveChangesAsync();
            return Ok(booking);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}/status")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles + "," + AppRoles.Trainer)]
    public async Task<IActionResult> UpdateBookingStatus(long id, [FromBody] UpdateClassBookingStatusRequest request)
    {
        try
        {
            var booking = await ApplyScope(_context.ClassBookings.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (booking == null)
            {
                return NotFound();
            }

            booking.Status = AppStatuses.NormalizeBooking(request.Status);
            await _context.SaveChangesAsync();
            return Ok(booking);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<ClassBooking> ApplyScope(IQueryable<ClassBooking> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.Member))
        {
            var memberIds = _context.Members.Where(item => item.UserId == _currentUser.UserId).Select(item => item.Id);
            return query.Where(item => item.MemberId.HasValue && memberIds.Contains(item.MemberId.Value));
        }

        if (_currentUser.IsInRole(AppRoles.Trainer))
        {
            var classIds = _context.Classes.Where(item => item.TrainerUserId == _currentUser.UserId).Select(item => item.Id);
            return query.Where(item => item.ClassId.HasValue && classIds.Contains(item.ClassId.Value));
        }

        if (_currentUser.BranchId.HasValue)
        {
            var classIds = _context.Classes.Where(item => item.BranchId == _currentUser.BranchId.Value).Select(item => item.Id);
            return query.Where(item => item.ClassId.HasValue && classIds.Contains(item.ClassId.Value));
        }

        if (_currentUser.GymId.HasValue)
        {
            var classIds = _context.Classes.Where(item => item.GymId == _currentUser.GymId.Value).Select(item => item.Id);
            return query.Where(item => item.ClassId.HasValue && classIds.Contains(item.ClassId.Value));
        }

        return query.Where(item => false);
    }

    private async Task<long?> ResolveBookingMemberIdAsync(long? requestedMemberId)
    {
        if (!_currentUser.IsInRole(AppRoles.Member))
        {
            return requestedMemberId;
        }

        return await _context.Members
            .Where(item => item.UserId == _currentUser.UserId)
            .Select(item => (long?)item.Id)
            .FirstOrDefaultAsync();
    }
}
