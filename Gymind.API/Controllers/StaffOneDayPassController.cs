using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Roles = AppRoles.Staff)]
public class StaffOneDayPassController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public StaffOneDayPassController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpPost("one-day-pass")]
    public async Task<ActionResult<OneDayPassResponseDto>> CreateOneDayPass([FromBody] CreateOneDayPassDto? dto)
    {
        if (dto?.AmountPaid is < 0)
        {
            return BadRequest(new { message = "One-day pass amount cannot be negative." });
        }

        var staffUser = await _context.Users
            .Where(user => user.Id == _currentUser.UserId && user.IsActive)
            .Select(user => new { user.Id, user.GymId, user.BranchId })
            .FirstOrDefaultAsync();

        if (staffUser == null)
        {
            return Unauthorized(new { message = "Staff user could not be resolved from the current login." });
        }

        if (!staffUser.BranchId.HasValue)
        {
            return BadRequest(new { message = "This staff account has no assigned branch. Assign a branch before creating a one-day pass." });
        }

        var branch = await _context.Branches.FirstOrDefaultAsync(item => item.Id == staffUser.BranchId.Value && item.IsActive);
        if (branch == null)
        {
            return BadRequest(new { message = "The assigned staff branch does not exist or is inactive." });
        }

        if (staffUser.GymId.HasValue && branch.GymId.HasValue && staffUser.GymId.Value != branch.GymId.Value)
        {
            return Forbid();
        }

        var checkInTime = DateTime.UtcNow;
        var autoCheckOutTime = checkInTime.AddMinutes(90);
        var checkIn = new CheckIn
        {
            MemberId = null,
            BranchId = branch.Id,
            CheckInTime = checkInTime,
            LastSeenAt = checkInTime,
            CheckOutTime = autoCheckOutTime,
            Status = AppStatuses.CheckInCheckedIn,
            Method = "ONE_DAY_PASS",
            CheckOutMethod = "AUTO_ONE_DAY_PASS_90_MIN"
        };

        _context.CheckIns.Add(checkIn);
        await _context.SaveChangesAsync();

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = staffUser.Id,
            Action = "ONE_DAY_PASS_CHECK_IN",
            TableName = "check_ins",
            RecordId = checkIn.Id,
            CreatedAt = checkInTime
        });

        if (dto?.AmountPaid is > 0)
        {
            _context.Payments.Add(new Payment
            {
                GymId = branch.GymId,
                BranchId = branch.Id,
                ReceivedByUserId = staffUser.Id,
                Amount = dto.AmountPaid,
                Method = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Cash" : dto.PaymentMethod,
                PaidAt = checkInTime,
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? "One Day Pass" : dto.Notes
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new OneDayPassResponseDto
        {
            CheckInId = checkIn.Id,
            DisplayName = "One Day Pass",
            BranchId = branch.Id,
            BranchName = branch.Name ?? string.Empty,
            CheckInTime = checkInTime,
            AutoCheckOutTime = autoCheckOutTime,
            IsAutoCheckOut = true,
            Status = "Active"
        });
    }
}
