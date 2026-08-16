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
public class TrainerSessionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public TrainerSessionsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetSessions([FromQuery] long? trainerUserId, [FromQuery] long? memberId)
    {
        var query = ApplyScope(_context.TrainerSessions.AsQueryable());

        if (trainerUserId.HasValue)
        {
            query = query.Where(s => s.TrainerUserId == trainerUserId.Value);
        }

        if (memberId.HasValue)
        {
            query = query.Where(s => s.MemberId == memberId.Value);
        }

        var sessions = await query.OrderByDescending(s => s.SessionDate).ToListAsync();
        return Ok(sessions);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetSession(long id)
    {
        var session = await ApplyScope(_context.TrainerSessions.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return session == null ? NotFound() : Ok(session);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.SchedulingRoles)]
    public async Task<IActionResult> CreateSession([FromBody] CreateTrainerSessionRequest request)
    {
        try
        {
            var session = new TrainerSession
            {
                TrainerUserId = _currentUser.IsInRole(AppRoles.Trainer) ? _currentUser.UserId : request.TrainerUserId,
                MemberId = request.MemberId,
                BranchId = _currentUser.IsInRole(AppRoles.SuperAdmin) || _currentUser.IsInRole(AppRoles.GymOwner)
                    ? request.BranchId
                    : _currentUser.BranchId,
                SessionType = request.SessionType,
                SessionDate = request.SessionDate ?? DateTime.UtcNow,
                Notes = request.Notes
            };

            _context.TrainerSessions.Add(session);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetSession), new { id = session.Id }, session);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.SchedulingRoles)]
    public async Task<IActionResult> UpdateSession(long id, [FromBody] UpdateTrainerSessionRequest request)
    {
        try
        {
            var session = await ApplyScope(_context.TrainerSessions.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (session == null)
            {
                return NotFound();
            }

            session.TrainerUserId = _currentUser.IsInRole(AppRoles.Trainer) ? _currentUser.UserId : request.TrainerUserId;
            session.MemberId = request.MemberId;
            session.BranchId = _currentUser.IsInRole(AppRoles.SuperAdmin) || _currentUser.IsInRole(AppRoles.GymOwner)
                ? request.BranchId
                : session.BranchId;
            session.SessionType = request.SessionType;
            session.SessionDate = request.SessionDate;
            session.Notes = request.Notes;

            await _context.SaveChangesAsync();
            return Ok(session);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<TrainerSession> ApplyScope(IQueryable<TrainerSession> query)
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
            return query.Where(item => item.TrainerUserId == _currentUser.UserId);
        }

        if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        if (_currentUser.GymId.HasValue)
        {
            var branchIds = _context.Branches.Where(item => item.GymId == _currentUser.GymId.Value).Select(item => item.Id);
            return query.Where(item => item.BranchId.HasValue && branchIds.Contains(item.BranchId.Value));
        }

        return query.Where(item => false);
    }
}
