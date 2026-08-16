using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/trainer")]
[Authorize(Roles = AppRoles.Trainer)]
public class TrainerDashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public TrainerDashboardController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<TrainerDashboardDto>> GetDashboard()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var tomorrowStart = todayStart.AddDays(1);
        var weekStart = todayStart.AddDays(-6);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var trainer = await _context.Users.Include(user => user.Branch).AsNoTracking().FirstOrDefaultAsync(user => user.Id == _currentUser.UserId);
        var classes = await _context.Classes
            .Where(item => item.TrainerUserId == _currentUser.UserId && item.StartTime >= weekStart && item.StartTime < tomorrowStart)
            .AsNoTracking()
            .ToListAsync();
        var classIds = classes.Select(item => item.Id).ToHashSet();
        var bookings = await _context.ClassBookings
            .Where(item => item.ClassId.HasValue &&
                classIds.Contains(item.ClassId.Value) &&
                item.Status != AppStatuses.BookingCancelled &&
                item.Status != "Cancelled" &&
                item.Status != "cancelled" &&
                item.Status != "CANCELLED")
            .AsNoTracking()
            .ToListAsync();
        var todayClasses = classes.Where(item => item.StartTime >= todayStart && item.StartTime < tomorrowStart).OrderBy(item => item.StartTime).ToList();

        var sessions = await _context.TrainerSessions
            .Where(item => item.TrainerUserId == _currentUser.UserId)
            .AsNoTracking()
            .ToListAsync();
        var assignedMemberIds = sessions.Where(item => item.MemberId.HasValue).Select(item => item.MemberId!.Value).ToHashSet();

        var members = await _context.Members
            .Where(member => assignedMemberIds.Contains(member.Id))
            .AsNoTracking()
            .ToListAsync();
        var memberById = members.ToDictionary(member => member.Id);
        var branches = await _context.Branches.AsNoTracking().ToDictionaryAsync(branch => branch.Id, branch => branch.Name);

        var todaySessions = sessions
            .Where(item => item.SessionDate >= todayStart && item.SessionDate < tomorrowStart && !IsProgressNote(item))
            .OrderBy(item => item.SessionDate)
            .Select(item => ToSessionDto(item, memberById))
            .ToList();

        var assignedMembers = members
            .OrderBy(member => member.FullName)
            .Select(member => ToAssignedMember(member, sessions, monthStart))
            .ToList();

        var todayClassDtos = todayClasses.Select(item =>
        {
            var classBookings = bookings.Where(booking => booking.ClassId == item.Id).ToList();
            var attended = classBookings.Count(booking => booking.Attended);
            return new TrainerTodayClassDto
            {
                ClassId = item.Id,
                ClassName = item.Name ?? "Class",
                StartTime = item.StartTime,
                EndTime = item.EndTime,
                Branch = item.BranchId.HasValue && branches.TryGetValue(item.BranchId.Value, out var branchName) ? branchName : "Assigned branch",
                Room = "Main floor",
                Capacity = item.Capacity ?? 0,
                BookedMembersCount = classBookings.Count,
                AttendedMembersCount = attended,
                AttendanceStatus = classBookings.Count > 0 && attended == classBookings.Count ? "Taken" : "Pending"
            };
        }).ToList();

        return Ok(new TrainerDashboardDto
        {
            Trainer = new TrainerHeaderDto
            {
                TrainerName = trainer?.FullName ?? "Trainer",
                Today = todayStart.ToString("yyyy-MM-dd"),
                BranchName = trainer?.Branch?.Name ?? "Assigned branch"
            },
            Kpis = new TrainerKpisDto
            {
                TodaysClasses = todayClassDtos.Count,
                BookedMembersToday = todayClassDtos.Sum(item => item.BookedMembersCount),
                AttendanceTakenClasses = todayClassDtos.Count(item => item.AttendanceStatus == "Taken"),
                PersonalSessionsToday = todaySessions.Count,
                AssignedMembers = assignedMembers.Count
            },
            TodayClasses = todayClassDtos,
            PersonalSessionsToday = todaySessions,
            AssignedMembers = assignedMembers,
            CoachingInsights = BuildInsights(classes, bookings, sessions, members, weekStart, todayStart, monthStart)
        });
    }

    [HttpGet("assigned-members")]
    public async Task<ActionResult<List<TrainerAssignedMemberDto>>> GetAssignedMembers()
    {
        var sessions = await _context.TrainerSessions.Where(item => item.TrainerUserId == _currentUser.UserId).AsNoTracking().ToListAsync();
        var memberIds = sessions.Where(item => item.MemberId.HasValue).Select(item => item.MemberId!.Value).Distinct().ToList();
        var members = await _context.Members.Where(item => memberIds.Contains(item.Id)).AsNoTracking().ToListAsync();
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return Ok(members.Select(member => ToAssignedMember(member, sessions, monthStart)).ToList());
    }

    [HttpGet("members/{memberId:long}/progress")]
    public async Task<ActionResult<TrainerMemberProgressDto>> GetMemberProgress(long memberId)
    {
        var sessions = await _context.TrainerSessions
            .Where(item => item.TrainerUserId == _currentUser.UserId && item.MemberId == memberId)
            .AsNoTracking()
            .ToListAsync();
        if (sessions.Count == 0)
        {
            return NotFound(new { message = "Member not found." });
        }

        var member = await _context.Members.AsNoTracking().FirstOrDefaultAsync(item => item.Id == memberId);
        if (member == null)
        {
            return NotFound(new { message = "Member not found." });
        }

        var trainerClassIds = _context.Classes.Where(item => item.TrainerUserId == _currentUser.UserId).Select(item => item.Id);
        var classHistory = await (
            from booking in _context.ClassBookings
            join gymClass in _context.Classes on booking.ClassId equals gymClass.Id
            where booking.MemberId == memberId && booking.ClassId.HasValue && trainerClassIds.Contains(booking.ClassId.Value)
            orderby gymClass.StartTime descending
            select new TrainerClassHistoryDto
            {
                ClassName = gymClass.Name ?? "Class",
                StartTime = gymClass.StartTime,
                Attended = booking.Attended
            }).Take(10).ToListAsync();

        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return Ok(new TrainerMemberProgressDto
        {
            Member = ToAssignedMember(member, sessions, monthStart),
            RecentClasses = classHistory,
            RecentSessions = sessions.Where(item => !IsProgressNote(item)).OrderByDescending(item => item.SessionDate).Take(10).Select(item => ToSessionDto(item, new Dictionary<long, Member> { [member.Id] = member })).ToList(),
            Notes = sessions.Where(IsProgressNote).OrderByDescending(item => item.SessionDate).Select(ToProgressNote).ToList()
        });
    }

    [HttpPost("members/{memberId:long}/progress-notes")]
    public async Task<ActionResult<TrainerProgressNoteDto>> AddProgressNote(long memberId, [FromBody] CreateTrainerProgressNoteRequest request)
    {
        var hasMember = await _context.TrainerSessions.AnyAsync(item => item.TrainerUserId == _currentUser.UserId && item.MemberId == memberId);
        if (!hasMember)
        {
            return NotFound(new { message = "Member not found." });
        }

        var session = new TrainerSession
        {
            TrainerUserId = _currentUser.UserId,
            MemberId = memberId,
            BranchId = _currentUser.BranchId,
            SessionType = $"Progress:{request.NoteType}",
            SessionDate = DateTime.UtcNow,
            Notes = string.IsNullOrWhiteSpace(request.Reminder)
                ? request.NoteText
                : $"{request.NoteText}\nReminder: {request.Reminder}"
        };
        _context.TrainerSessions.Add(session);
        await _context.SaveChangesAsync();
        return Ok(ToProgressNote(session));
    }

    [HttpPut("personal-sessions/{sessionId:long}/complete")]
    public async Task<IActionResult> CompleteSession(long sessionId, [FromBody] CompleteTrainerSessionRequest request)
    {
        var session = await _context.TrainerSessions.FirstOrDefaultAsync(item => item.Id == sessionId && item.TrainerUserId == _currentUser.UserId);
        if (session == null)
        {
            return NotFound(new { message = "Session not found." });
        }

        session.SessionType = "Completed";
        session.Notes = string.Join("\n", new[]
        {
            request.WorkoutSummary,
            request.PerformanceNote,
            string.IsNullOrWhiteSpace(request.InjuryPainNote) ? "" : $"Injury/Pain: {request.InjuryPainNote}",
            string.IsNullOrWhiteSpace(request.NextSessionFocus) ? "" : $"Next focus: {request.NextSessionFocus}"
        }.Where(item => !string.IsNullOrWhiteSpace(item)));
        await _context.SaveChangesAsync();
        return Ok(new { message = "Session completed." });
    }

    private static TrainerPersonalSessionDto ToSessionDto(TrainerSession session, Dictionary<long, Member> members)
    {
        var member = session.MemberId.HasValue && members.TryGetValue(session.MemberId.Value, out var found) ? found : null;
        return new TrainerPersonalSessionDto
        {
            SessionId = session.Id,
            MemberId = session.MemberId,
            MemberName = member?.FullName ?? "Member",
            SessionType = session.SessionType ?? "Private Session",
            SessionDate = session.SessionDate,
            Status = SessionStatus(session),
            Notes = session.Notes ?? string.Empty
        };
    }

    private static TrainerAssignedMemberDto ToAssignedMember(Member member, List<TrainerSession> sessions, DateTime monthStart)
    {
        var memberSessions = sessions.Where(item => item.MemberId == member.Id && !IsProgressNote(item)).ToList();
        var lastSession = memberSessions.OrderByDescending(item => item.SessionDate).FirstOrDefault();
        var lastNote = sessions.Where(item => item.MemberId == member.Id && !string.IsNullOrWhiteSpace(item.Notes)).OrderByDescending(item => item.SessionDate).FirstOrDefault();
        return new TrainerAssignedMemberDto
        {
            MemberId = member.Id,
            MemberName = member.FullName ?? "Member",
            Phone = member.Phone ?? string.Empty,
            Goal = "Not set",
            LastSessionDate = lastSession?.SessionDate,
            LastProgressNote = lastNote?.Notes ?? string.Empty,
            SessionsThisMonth = memberSessions.Count(item => item.SessionDate >= monthStart),
            Status = lastSession?.SessionDate < DateTime.UtcNow.AddDays(-14) ? "Needs Follow-up" : "Active"
        };
    }

    private static TrainerCoachingInsightsDto BuildInsights(List<GymClass> classes, List<ClassBooking> bookings, List<TrainerSession> sessions, List<Member> members, DateTime weekStart, DateTime todayStart, DateTime monthStart)
    {
        return new TrainerCoachingInsightsDto
        {
            WeeklyClassAttendance = classes
                .Where(item => item.StartTime >= weekStart)
                .GroupBy(item => item.Name ?? "Class")
                .Select(group =>
                {
                    var ids = group.Select(item => item.Id).ToHashSet();
                    var classBookings = bookings.Where(item => item.ClassId.HasValue && ids.Contains(item.ClassId.Value)).ToList();
                    return new TrainerClassAttendanceInsightDto
                    {
                        ClassName = group.Key,
                        Booked = classBookings.Count,
                        Attended = classBookings.Count(item => item.Attended),
                        AttendancePercentage = classBookings.Count == 0 ? 0 : Math.Round(classBookings.Count(item => item.Attended) * 100m / classBookings.Count, 1)
                    };
                }).ToList(),
            AttendanceTrend = Enumerable.Range(0, 7).Select(offset =>
            {
                var day = todayStart.AddDays(-6 + offset);
                var next = day.AddDays(1);
                var dayClasses = classes.Where(item => item.StartTime >= day && item.StartTime < next).ToList();
                var ids = dayClasses.Select(item => item.Id).ToHashSet();
                var dayBookings = bookings.Where(item => item.ClassId.HasValue && ids.Contains(item.ClassId.Value)).ToList();
                return new TrainerAttendanceTrendDto { Date = day.ToString("yyyy-MM-dd"), Classes = dayClasses.Count, BookedMembers = dayBookings.Count, AttendedMembers = dayBookings.Count(item => item.Attended) };
            }).ToList(),
            AssignedMemberActivity = members.Select(member =>
            {
                var memberSessions = sessions.Where(item => item.MemberId == member.Id && !IsProgressNote(item)).ToList();
                var last = memberSessions.OrderByDescending(item => item.SessionDate).FirstOrDefault();
                return new TrainerMemberActivityDto { MemberId = member.Id, MemberName = member.FullName ?? "Member", LastSessionDate = last?.SessionDate, SessionsThisMonth = memberSessions.Count(item => item.SessionDate >= monthStart), Status = last?.SessionDate < DateTime.UtcNow.AddDays(-14) ? "Needs Follow-up" : "Active" };
            }).ToList()
        };
    }

    private static TrainerProgressNoteDto ToProgressNote(TrainerSession session)
    {
        var noteType = (session.SessionType ?? "Progress:Other").Replace("Progress:", string.Empty, StringComparison.OrdinalIgnoreCase);
        var notes = session.Notes ?? string.Empty;
        var parts = notes.Split("\nReminder:", 2, StringSplitOptions.None);
        return new TrainerProgressNoteDto { NoteId = session.Id, NoteType = noteType, NoteText = parts[0].Trim(), Reminder = parts.Length > 1 ? parts[1].Trim() : string.Empty, CreatedAt = session.SessionDate };
    }

    private static string SessionStatus(TrainerSession session)
    {
        var type = session.SessionType ?? string.Empty;
        if (type.Contains("complete", StringComparison.OrdinalIgnoreCase)) return "Completed";
        if (session.SessionDate < DateTime.UtcNow) return "Missed";
        return "Upcoming";
    }

    private static bool IsProgressNote(TrainerSession session) => session.SessionType?.StartsWith("Progress:", StringComparison.OrdinalIgnoreCase) == true;
    private static bool IsCancelled(string? status) => status?.Contains("cancel", StringComparison.OrdinalIgnoreCase) == true;
}
