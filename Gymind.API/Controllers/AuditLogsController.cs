using Gymind.API.Data;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = AppRoles.SuperAdmin + "," + AppRoles.GymOwner + "," + AppRoles.BranchManager)]
public class AuditLogsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public AuditLogsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] long? userId,
        [FromQuery] string? actor,
        [FromQuery] string? action,
        [FromQuery] string? tableName,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query =
            from log in _context.AuditLogs
            join user in _context.Users on log.UserId equals user.Id into users
            from user in users.DefaultIfEmpty()
            select new
            {
                log.Id,
                log.UserId,
                UserName = user == null
                    ? (log.UserId.HasValue ? log.UserId.Value.ToString() : "Unknown Actor")
                    : (user.FullName != null && user.FullName != ""
                        ? user.FullName
                        : (user.Email != null && user.Email != "" ? user.Email : user.Id.ToString())),
                UserEmail = user == null ? null : user.Email,
                UserGymId = user == null ? null : user.GymId,
                UserBranchId = user == null ? null : user.BranchId,
                log.Action,
                log.TableName,
                log.RecordId,
                log.CreatedAt
            };

        if (!_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            if (_currentUser.GymId.HasValue)
            {
                query = query.Where(item => item.UserGymId == _currentUser.GymId.Value || item.UserId == _currentUser.UserId);
            }

            if (_currentUser.BranchId.HasValue && !_currentUser.IsInRole(AppRoles.GymOwner))
            {
                query = query.Where(item => item.UserBranchId == _currentUser.BranchId.Value || item.UserId == _currentUser.UserId);
            }
        }

        if (userId.HasValue)
        {
            query = query.Where(item => item.UserId == userId.Value);
        }

        if (!string.IsNullOrWhiteSpace(actor))
        {
            var actorFilter = actor.Trim();
            query = query.Where(item =>
                item.UserName.Contains(actorFilter) ||
                (item.UserEmail != null && item.UserEmail.Contains(actorFilter)) ||
                (item.UserId.HasValue && item.UserId.Value.ToString().Contains(actorFilter)));
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(item => item.Action != null && item.Action.Contains(action));
        }

        if (!string.IsNullOrWhiteSpace(tableName))
        {
            query = query.Where(item => item.TableName == tableName);
        }

        if (from.HasValue)
        {
            query = query.Where(item => item.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(item => item.CreatedAt <= to.Value);
        }

        return Ok(await query
            .OrderByDescending(item => item.CreatedAt)
            .Take(250)
            .ToListAsync());
    }

    [HttpGet("actor-actions")]
    [Authorize(Roles = AppRoles.SuperAdmin)]
    public async Task<IActionResult> GetActorActionCounts(
        [FromQuery] string? actor,
        [FromQuery] string? action,
        [FromQuery] string? tableName,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query =
            from log in _context.AuditLogs
            join user in _context.Users on log.UserId equals user.Id into users
            from user in users.DefaultIfEmpty()
            select new
            {
                Actor = user == null
                    ? (log.UserId.HasValue ? log.UserId.Value.ToString() : "Unknown Actor")
                    : (user.FullName != null && user.FullName != ""
                        ? user.FullName
                        : (user.Email != null && user.Email != "" ? user.Email : user.Id.ToString())),
                ActorEmail = user == null ? null : user.Email,
                log.Action,
                log.TableName,
                log.CreatedAt
            };

        if (!string.IsNullOrWhiteSpace(actor))
        {
            var actorFilter = actor.Trim();
            query = query.Where(item =>
                item.Actor.Contains(actorFilter) ||
                (item.ActorEmail != null && item.ActorEmail.Contains(actorFilter)));
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(item => item.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(tableName))
        {
            query = query.Where(item => item.TableName == tableName);
        }

        if (from.HasValue)
        {
            query = query.Where(item => item.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(item => item.CreatedAt <= to.Value);
        }

        var rows = await query
            .GroupBy(item => new
            {
                Actor = item.Actor == "" ? "Unknown Actor" : item.Actor,
                Action = item.Action == null || item.Action == "" ? "Unknown Action" : item.Action
            })
            .Select(group => new
            {
                group.Key.Actor,
                group.Key.Action,
                Count = group.Count()
            })
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Actor)
            .ThenBy(item => item.Action)
            .Take(100)
            .ToListAsync();

        return Ok(rows);
    }
}
