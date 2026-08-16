using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Helpers;
using Gymind.API.Models;
using Gymind.API.Security;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public NotificationsController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] long? gymId,
        [FromQuery] long? branchId,
        [FromQuery] int? page,
        [FromQuery] int? pageSize)
    {
        var query = ApplyScope(_context.Notifications.AsQueryable());

        if (gymId.HasValue)
        {
            query = query.Where(n => n.GymId == gymId.Value);
        }

        if (branchId.HasValue)
        {
            query = query.Where(n => n.BranchId == branchId.Value);
        }

        var totalCount = await query.CountAsync();
        var safePageSize = Math.Clamp(pageSize ?? 100, 1, 100);
        var safePage = Math.Max(page ?? 1, 1);
        var notifications = page.HasValue || pageSize.HasValue
            ? await query.OrderByDescending(n => n.CreatedAt).Skip((safePage - 1) * safePageSize).Take(safePageSize).ToListAsync()
            : await query.OrderByDescending(n => n.CreatedAt).ToListAsync();

        if (page.HasValue || pageSize.HasValue)
        {
            return Ok(new PagedResultDto<Notification>
            {
                Items = notifications,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize,
                TotalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)safePageSize))
            });
        }

        return Ok(notifications);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userId = _currentUser.UserId;
        if (userId == 0)
        {
            return Unauthorized();
        }

        var notifications = await _context.NotificationRecipients
            .Where(recipient => recipient.UserId == userId)
            .Join(
                _context.Notifications,
                recipient => recipient.NotificationId,
                notification => notification.Id,
                (recipient, notification) => new
                {
                    id = notification.Id,
                    title = notification.Title,
                    message = notification.Message,
                    read = recipient.IsRead,
                    readAt = recipient.ReadAt,
                    createdAt = notification.CreatedAt
                })
            .OrderByDescending(item => item.createdAt)
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpGet("recipients/{userId:long}")]
    public async Task<IActionResult> GetUserNotifications(long userId)
    {
        if (_currentUser.UserId != userId && !_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return Forbid();
        }

        var recipients = await _context.NotificationRecipients
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.ReadAt)
            .ToListAsync();

        return Ok(recipients);
    }

    [HttpGet("targets")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles + "," + AppRoles.Trainer)]
    public async Task<IActionResult> GetTargets()
    {
        var users = ApplyUserNotificationScope(_context.Users.Include(item => item.Role).Where(item => item.IsActive));
        var members = ApplyMemberNotificationScope(_context.Members.Where(item => item.IsActive));
        var branches = ApplyBranchNotificationScope(_context.Branches.Where(item => item.IsActive));
        var gyms = ApplyGymNotificationScope(_context.Gyms.Where(item => item.IsActive));

        var targetTypes = _currentUser.Role switch
        {
            AppRoles.SuperAdmin => new[] { "PLATFORM", "GYM", "BRANCH", "ROLE", "USER", "MEMBER" },
            AppRoles.GymOwner => new[] { "GYM", "BRANCH", "ROLE", "USER", "MEMBER" },
            AppRoles.BranchManager => new[] { "BRANCH", "ROLE", "USER", "MEMBER" },
            AppRoles.Staff => new[] { "MEMBER" },
            AppRoles.Trainer => new[] { "MEMBER", "CLASS" },
            _ => Array.Empty<string>()
        };

        return Ok(new NotificationTargetsDto
        {
            TargetTypes = targetTypes.ToList(),
            Gyms = await gyms.Select(item => new NotificationGymTargetDto { Id = item.Id, Name = item.Name ?? string.Empty }).ToListAsync(),
            Branches = await branches.Select(item => new NotificationBranchTargetDto { Id = item.Id, Name = item.Name, GymId = item.GymId }).ToListAsync(),
            Roles = await users.Select(item => item.Role!.Name).Distinct().OrderBy(item => item).ToListAsync(),
            Users = await users.OrderBy(item => item.FullName).Select(item => new NotificationUserTargetDto
            {
                Id = item.Id,
                FullName = item.FullName ?? string.Empty,
                Email = item.Email ?? string.Empty,
                Role = item.Role!.Name,
                GymId = item.GymId,
                BranchId = item.BranchId
            }).ToListAsync(),
            Members = await members.OrderBy(item => item.FullName).Select(item => new NotificationMemberTargetDto
            {
                Id = item.Id,
                FullName = item.FullName ?? string.Empty,
                Email = item.Email ?? string.Empty,
                GymId = item.GymId,
                BranchId = item.HomeBranchId
            }).ToListAsync()
        });
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOperatorRoles + "," + AppRoles.Trainer)]
    public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var recipients = await ResolveNotificationRecipientsAsync(request);
            if (recipients.Count == 0)
            {
                return BadRequest(new { message = "No eligible recipients found for this notification target." });
            }

            var notification = new Notification
            {
                GymId = ResolveNotificationGymId(request),
                BranchId = ResolveNotificationBranchId(request),
                Title = request.Title,
                Message = request.Message,
                CreatedByUserId = _currentUser.UserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            _context.NotificationRecipients.AddRange(recipients.Select(userId => new NotificationRecipient
            {
                NotificationId = notification.Id,
                UserId = userId,
                IsRead = false
            }));

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = _currentUser.UserId,
                Action = "NOTIFICATION_SENT",
                TableName = "notifications",
                RecordId = notification.Id,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(notification);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpGet("membership-expiring-two-days")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> GetMembershipsExpiringInTwoDays()
    {
        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var members = ApplyMemberNotificationScope(_context.Members.Where(item => item.IsActive));

        var expiring = await (
            from membership in _context.MemberMemberships
            join member in members on membership.MemberId equals member.Id
            join user in _context.Users on member.UserId equals user.Id
            join plan in _context.MembershipPlans on membership.PlanId equals plan.Id into planJoin
            from plan in planJoin.DefaultIfEmpty()
            where membership.EndDate == targetDate &&
                (membership.Status == AppStatuses.MembershipActive || membership.Status == "Active")
            orderby member.FullName
            select new
            {
                membershipId = membership.Id,
                memberId = member.Id,
                userId = user.Id,
                memberName = member.FullName ?? user.FullName,
                userEmail = user.Email,
                gymId = member.GymId,
                branchId = member.HomeBranchId,
                planName = plan != null ? plan.Name : null,
                endDate = membership.EndDate
            }).ToListAsync();

        return Ok(expiring);
    }

    [HttpPost("membership-expiring-two-days/remind")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> CreateMembershipExpiryReminders()
    {
        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var todayStart = DateTime.UtcNow.Date;
        var members = ApplyMemberNotificationScope(_context.Members.Where(item => item.IsActive));

        var expiring = await (
            from membership in _context.MemberMemberships
            join member in members on membership.MemberId equals member.Id
            join user in _context.Users on member.UserId equals user.Id
            where membership.EndDate == targetDate &&
                (membership.Status == AppStatuses.MembershipActive || membership.Status == "Active")
            select new
            {
                membership.Id,
                member.GymId,
                BranchId = member.HomeBranchId,
                UserId = user.Id,
                MemberName = member.FullName ?? user.FullName
            }).ToListAsync();

        var created = 0;
        foreach (var item in expiring)
        {
            var title = "Membership expiring soon";
            var message = "Your membership will expire in 2 days.";
            var duplicateExists = await _context.NotificationRecipients
                .Where(recipient => recipient.UserId == item.UserId)
                .Join(
                    _context.Notifications,
                    recipient => recipient.NotificationId,
                    notification => notification.Id,
                    (_, notification) => notification)
                .AnyAsync(notification =>
                    notification.CreatedAt >= todayStart &&
                    notification.Title == title &&
                    notification.Message == message);

            if (duplicateExists)
            {
                continue;
            }

            var notification = new Notification
            {
                GymId = item.GymId,
                BranchId = item.BranchId,
                Title = title,
                Message = message,
                CreatedByUserId = _currentUser.UserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
            _context.NotificationRecipients.Add(new NotificationRecipient
            {
                NotificationId = notification.Id,
                UserId = item.UserId,
                IsRead = false
            });
            created++;
        }

        if (created > 0)
        {
            await _context.SaveChangesAsync();
        }

        return Ok(new { scanned = expiring.Count, created });
    }

    [HttpPut("{notificationId:long}/read")]
    public async Task<IActionResult> MarkAsRead(long notificationId, [FromBody] MarkNotificationReadRequest request)
    {
        try
        {
            var requestedUserId = request.UserId ?? _currentUser.UserId;
            if (requestedUserId != _currentUser.UserId && !_currentUser.IsInRole(AppRoles.SuperAdmin))
            {
                return Forbid();
            }

            var recipient = await _context.NotificationRecipients
                .FirstOrDefaultAsync(r => r.NotificationId == notificationId && r.UserId == requestedUserId);

            if (recipient == null)
            {
                return NotFound();
            }

            recipient.IsRead = true;
            recipient.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(recipient);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private IQueryable<Notification> ApplyScope(IQueryable<Notification> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager))
        {
            var branchId = _currentUser.BranchId;
            return branchId.HasValue
                ? query.Where(item => item.BranchId == branchId.Value)
                : query.Where(item => false);
        }

        if (_currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value || item.GymId == null);
        }

        if (_currentUser.BranchId.HasValue &&
            !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.BranchId == _currentUser.BranchId.Value || item.BranchId == null);
        }

        return query;
    }

    private IQueryable<User> ApplyUserNotificationScope(IQueryable<User> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner) && _currentUser.GymId.HasValue)
        {
            return query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if ((_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff)) && _currentUser.BranchId.HasValue)
        {
            return query.Where(item => item.BranchId == _currentUser.BranchId.Value);
        }

        if (_currentUser.IsInRole(AppRoles.Trainer))
        {
            var memberEmails = GetTrainerMemberEmails();
            return query.Where(item => item.Email != null && memberEmails.Contains(item.Email));
        }

        return query.Where(item => false);
    }

    private IQueryable<Member> ApplyMemberNotificationScope(IQueryable<Member> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner) && _currentUser.GymId.HasValue)
        {
            return query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if ((_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff)) && _currentUser.BranchId.HasValue)
        {
            return query.Where(item => item.HomeBranchId == _currentUser.BranchId.Value);
        }

        if (_currentUser.IsInRole(AppRoles.Trainer))
        {
            var memberIds = GetTrainerMemberIds();
            return query.Where(item => memberIds.Contains(item.Id));
        }

        return query.Where(item => false);
    }

    private IQueryable<Branch> ApplyBranchNotificationScope(IQueryable<Branch> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner) && _currentUser.GymId.HasValue)
        {
            return query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue)
        {
            return query.Where(item => item.Id == _currentUser.BranchId.Value);
        }

        return query.Where(item => false);
    }

    private IQueryable<Gym> ApplyGymNotificationScope(IQueryable<Gym> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        return _currentUser.GymId.HasValue
            ? query.Where(item => item.Id == _currentUser.GymId.Value)
            : query.Where(item => false);
    }

    private async Task<List<long>> ResolveNotificationRecipientsAsync(CreateNotificationRequest request)
    {
        var targetType = (request.TargetType ?? "USER").Trim().ToUpperInvariant();
        var users = ApplyUserNotificationScope(_context.Users.Include(item => item.Role).Where(item => item.IsActive));

        users = targetType switch
        {
            "PLATFORM" when _currentUser.IsInRole(AppRoles.SuperAdmin) => users,
            "GYM" when request.GymId.HasValue => users.Where(item => item.GymId == request.GymId.Value),
            "BRANCH" when request.BranchId.HasValue => users.Where(item => item.BranchId == request.BranchId.Value),
            "ROLE" when !string.IsNullOrWhiteSpace(request.Role) => users.Where(item => item.Role != null && item.Role.Name == request.Role),
            "USER" => users.Where(item => request.UserIds.Concat(request.RecipientUserIds).Contains(item.Id)),
            "MEMBER" => users.Where(item => item.Email != null && _context.Members
                .Where(member => request.MemberIds.Contains(member.Id))
                .Select(member => member.Email)
                .Contains(item.Email)),
            "CLASS" when request.ClassId.HasValue && _currentUser.IsInRole(AppRoles.Trainer) => users.Where(item => item.Email != null && _context.ClassBookings
                .Where(booking => booking.ClassId == request.ClassId.Value && booking.MemberId.HasValue)
                .Join(_context.Members, booking => booking.MemberId!.Value, member => member.Id, (_, member) => member.Email)
                .Contains(item.Email)),
            _ => users.Where(item => false)
        };

        if (_currentUser.IsInRole(AppRoles.Staff) && targetType != "MEMBER")
        {
            return [];
        }

        if (_currentUser.IsInRole(AppRoles.Trainer) && targetType is not ("MEMBER" or "CLASS"))
        {
            return [];
        }

        return await users.Select(item => item.Id).Distinct().ToListAsync();
    }

    private long? ResolveNotificationGymId(CreateNotificationRequest request)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return request.GymId;
        }

        return _currentUser.GymId;
    }

    private long? ResolveNotificationBranchId(CreateNotificationRequest request)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin) || _currentUser.IsInRole(AppRoles.GymOwner))
        {
            return request.BranchId;
        }

        return _currentUser.BranchId;
    }

    private IQueryable<long> GetTrainerMemberIds()
    {
        var classIds = _context.Classes
            .Where(item => item.TrainerUserId == _currentUser.UserId)
            .Select(item => item.Id);

        var classMemberIds = _context.ClassBookings
            .Where(item => item.ClassId.HasValue && classIds.Contains(item.ClassId.Value) && item.MemberId.HasValue)
            .Select(item => item.MemberId!.Value);

        var sessionMemberIds = _context.TrainerSessions
            .Where(item => item.TrainerUserId == _currentUser.UserId && item.MemberId.HasValue)
            .Select(item => item.MemberId!.Value);

        return classMemberIds.Concat(sessionMemberIds).Distinct();
    }

    private IQueryable<string> GetTrainerMemberEmails()
    {
        var memberIds = GetTrainerMemberIds();
        return _context.Members
            .Where(item => memberIds.Contains(item.Id) && item.Email != null)
            .Select(item => item.Email!);
    }
}
