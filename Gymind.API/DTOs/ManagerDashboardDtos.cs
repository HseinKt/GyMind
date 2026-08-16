namespace Gymind.API.DTOs;

public class ManagerDashboardDto
{
    public ManagerBranchInfoDto BranchInfo { get; set; } = new();
    public ManagerDashboardKpisDto Kpis { get; set; } = new();
    public ManagerLiveStatusDto LiveStatus { get; set; } = new();
    public List<ManagerAttendanceHourDto> AttendanceByHour { get; set; } = [];
    public List<ManagerCheckInRecordDto> CheckInRecords { get; set; } = [];
    public List<ManagerCurrentlyInsideDto> CurrentlyInside { get; set; } = [];
    public ManagerPaymentsTodayDto PaymentsToday { get; set; } = new();
    public List<ManagerPaymentBucketDto> PaymentsByMethod { get; set; } = [];
    public List<ManagerPaymentBucketDto> PaymentsByPlan { get; set; } = [];
    public List<ManagerPaymentRecordDto> PaymentRecords { get; set; } = [];
    public List<ManagerExpiringMembershipDto> ExpiringMemberships { get; set; } = [];
    public List<ManagerSuspiciousCheckInDto> SuspiciousCheckIns { get; set; } = [];
    public List<ManagerClassTodayDto> ClassesToday { get; set; } = [];
    public ManagerTeamSummaryDto TeamSummary { get; set; } = new();
    public List<ManagerTeamActivityDto> TeamActivity { get; set; } = [];
    public ManagerBranchReportsDto BranchReports { get; set; } = new();
}

public class ManagerBranchInfoDto
{
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int Capacity { get; set; }
}

public class ManagerDashboardKpisDto
{
    public int CurrentlyInside { get; set; }
    public int TodaysAttendance { get; set; }
    public decimal PaymentsToday { get; set; }
    public int ClassesToday { get; set; }
    public int ExpiringMemberships { get; set; }
    public int SuspiciousCheckIns { get; set; }
}

public class ManagerLiveStatusDto
{
    public string BranchName { get; set; } = string.Empty;
    public int CurrentCheckIns { get; set; }
    public int BranchCapacity { get; set; }
    public decimal CapacityPercentage { get; set; }
    public DateTime? LastCheckInTime { get; set; }
    public string PeakHourToday { get; set; } = string.Empty;
}

public class ManagerAttendanceHourDto
{
    public string Hour { get; set; } = string.Empty;
    public int CheckIns { get; set; }
}

public class ManagerCheckInRecordDto
{
    public long CheckInId { get; set; }
    public long? MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string Duration { get; set; } = string.Empty;
    public string MembershipPlan { get; set; } = string.Empty;
    public string MembershipStatus { get; set; } = string.Empty;
    public string CheckedInBy { get; set; } = string.Empty;
    public string CheckInMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class ManagerCurrentlyInsideDto : ManagerCheckInRecordDto
{
}

public class ManagerPaymentsTodayDto
{
    public decimal TotalPaymentsToday { get; set; }
    public int PaymentCountToday { get; set; }
    public decimal CashPaymentsTotal { get; set; }
    public decimal CardPaymentsTotal { get; set; }
    public decimal DayPassRevenue { get; set; }
    public decimal MembershipRenewalRevenue { get; set; }
}

public class ManagerPaymentBucketDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Count { get; set; }
}

public class ManagerPaymentRecordDto
{
    public long PaymentId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string MembershipPlan { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public DateTime? PaymentTime { get; set; }
    public string RecordedByStaff { get; set; } = string.Empty;
}

public class ManagerExpiringMembershipDto
{
    public long MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string MembershipPlan { get; set; } = string.Empty;
    public DateOnly? ExpiryDate { get; set; }
    public int DaysLeft { get; set; }
    public DateTime? LastCheckIn { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ManagerSuspiciousCheckInDto
{
    public long CheckInId { get; set; }
    public long? MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Issue { get; set; } = string.Empty;
    public DateTime? Time { get; set; }
    public string Staff { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class ManagerClassTodayDto
{
    public long ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string TrainerName { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int Capacity { get; set; }
    public int BookedMembersCount { get; set; }
    public int AttendedMembersCount { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ManagerTeamSummaryDto
{
    public int TotalStaff { get; set; }
    public int TotalTrainers { get; set; }
    public int ActiveEmployees { get; set; }
    public int InactiveEmployees { get; set; }
}

public class ManagerTeamActivityDto
{
    public long EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int PaymentsRecordedToday { get; set; }
    public int CheckInsHandledToday { get; set; }
    public int ManualCheckOutsToday { get; set; }
}

public class ManagerBranchReportsDto
{
    public List<ManagerDailyMetricDto> AttendanceByDay { get; set; } = [];
    public List<ManagerDailyRevenueDto> RevenueByDay { get; set; } = [];
    public List<ManagerPaymentBucketDto> PaymentsByMethod { get; set; } = [];
    public List<ManagerDailyMetricDto> MembershipRenewals { get; set; } = [];
    public List<ManagerDailyMetricDto> ClassAttendance { get; set; } = [];
    public List<ManagerAttendanceHourDto> PeakHours { get; set; } = [];
}

public class ManagerDailyMetricDto
{
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ManagerDailyRevenueDto
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
}
