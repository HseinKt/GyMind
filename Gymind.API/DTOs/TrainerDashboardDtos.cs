namespace Gymind.API.DTOs;

public class TrainerDashboardDto
{
    public TrainerHeaderDto Trainer { get; set; } = new();
    public TrainerKpisDto Kpis { get; set; } = new();
    public List<TrainerTodayClassDto> TodayClasses { get; set; } = [];
    public List<TrainerPersonalSessionDto> PersonalSessionsToday { get; set; } = [];
    public List<TrainerAssignedMemberDto> AssignedMembers { get; set; } = [];
    public TrainerCoachingInsightsDto CoachingInsights { get; set; } = new();
}

public class TrainerHeaderDto
{
    public string TrainerName { get; set; } = string.Empty;
    public string Role { get; set; } = "Trainer";
    public string Today { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
}

public class TrainerKpisDto
{
    public int TodaysClasses { get; set; }
    public int BookedMembersToday { get; set; }
    public int AttendanceTakenClasses { get; set; }
    public int PersonalSessionsToday { get; set; }
    public int AssignedMembers { get; set; }
}

public class TrainerTodayClassDto
{
    public long ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string Branch { get; set; } = string.Empty;
    public string Room { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public int BookedMembersCount { get; set; }
    public int AttendedMembersCount { get; set; }
    public string AttendanceStatus { get; set; } = "Pending";
}

public class TrainerPersonalSessionDto
{
    public long SessionId { get; set; }
    public long? MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string SessionType { get; set; } = string.Empty;
    public DateTime? SessionDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}

public class TrainerAssignedMemberDto
{
    public long MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Goal { get; set; } = string.Empty;
    public DateTime? LastSessionDate { get; set; }
    public string LastProgressNote { get; set; } = string.Empty;
    public int SessionsThisMonth { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class TrainerCoachingInsightsDto
{
    public List<TrainerClassAttendanceInsightDto> WeeklyClassAttendance { get; set; } = [];
    public List<TrainerAttendanceTrendDto> AttendanceTrend { get; set; } = [];
    public List<TrainerMemberActivityDto> AssignedMemberActivity { get; set; } = [];
}

public class TrainerClassAttendanceInsightDto
{
    public string ClassName { get; set; } = string.Empty;
    public int Booked { get; set; }
    public int Attended { get; set; }
    public decimal AttendancePercentage { get; set; }
}

public class TrainerAttendanceTrendDto
{
    public string Date { get; set; } = string.Empty;
    public int Classes { get; set; }
    public int BookedMembers { get; set; }
    public int AttendedMembers { get; set; }
}

public class TrainerMemberActivityDto
{
    public long MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public DateTime? LastSessionDate { get; set; }
    public int SessionsThisMonth { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class TrainerMemberProgressDto
{
    public TrainerAssignedMemberDto Member { get; set; } = new();
    public List<TrainerClassHistoryDto> RecentClasses { get; set; } = [];
    public List<TrainerPersonalSessionDto> RecentSessions { get; set; } = [];
    public List<TrainerProgressNoteDto> Notes { get; set; } = [];
}

public class TrainerClassHistoryDto
{
    public string ClassName { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public bool Attended { get; set; }
}

public class TrainerProgressNoteDto
{
    public long NoteId { get; set; }
    public string NoteType { get; set; } = string.Empty;
    public string NoteText { get; set; } = string.Empty;
    public string Reminder { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
}

public class CreateTrainerProgressNoteRequest
{
    public string NoteType { get; set; } = "Other";
    public string NoteText { get; set; } = string.Empty;
    public string? Reminder { get; set; }
}

public class CompleteTrainerSessionRequest
{
    public string WorkoutSummary { get; set; } = string.Empty;
    public string PerformanceNote { get; set; } = string.Empty;
    public string InjuryPainNote { get; set; } = string.Empty;
    public string NextSessionFocus { get; set; } = string.Empty;
}

public class BulkTrainerAttendanceRequest
{
    public List<BulkTrainerAttendanceBookingRequest> Bookings { get; set; } = [];
}

public class BulkTrainerAttendanceBookingRequest
{
    public long BookingId { get; set; }
    public long? MemberId { get; set; }
    public bool Attended { get; set; }
    public string? Note { get; set; }
}
