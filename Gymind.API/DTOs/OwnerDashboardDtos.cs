namespace Gymind.API.DTOs;

public class OwnerDashboardDto
{
    public decimal RevenueToday { get; set; }
    public decimal RevenueLast7Days { get; set; }
    public decimal RevenueThisMonth { get; set; }
    public int ActiveMembers { get; set; }
    public int ExpiredMembers { get; set; }
    public int NewMembersThisMonth { get; set; }
    public List<OwnerRevenueTrendDto> RevenueTrend { get; set; } = [];
    public List<OwnerPaymentRecordDto> PaymentRecords { get; set; } = [];
    public List<OwnerBranchPerformanceDto> BranchPerformance { get; set; } = [];
    public List<OwnerMembersByBranchDto> MembersByBranch { get; set; } = [];
    public OwnerActiveVsExpiredDto ActiveVsExpired { get; set; } = new();
    public List<OwnerBranchCapacityDto> BranchCapacity { get; set; } = [];
    public List<OwnerExpiredMemberDto> ExpiredMemberRecords { get; set; } = [];
    public OwnerPaymentsOverviewDto PaymentsOverview { get; set; } = new();
    public List<OwnerPlanPerformanceDto> PlanPerformance { get; set; } = [];
    public OwnerTeamSummaryDto TeamSummary { get; set; } = new();
    public List<OwnerAttentionItemDto> AttentionItems { get; set; } = [];
}

public class OwnerRevenueTrendDto
{
    public string Date { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int PaymentCount { get; set; }
}

public class OwnerPaymentRecordDto
{
    public long PaymentId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string MembershipPlan { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
    public string RecordedByStaff { get; set; } = string.Empty;
}

public class OwnerBranchPerformanceDto
{
    public long BranchId { get; set; }
    public string Branch { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int ActiveMembers { get; set; }
    public int ExpiredMembers { get; set; }
    public int CheckInsToday { get; set; }
    public int Capacity { get; set; }
    public int CurrentCheckIns { get; set; }
    public decimal CapacityPercent { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class OwnerMembersByBranchDto
{
    public long BranchId { get; set; }
    public string Branch { get; set; } = string.Empty;
    public int TotalMembers { get; set; }
    public int ActiveMembers { get; set; }
    public int ExpiredMembers { get; set; }
    public int NewMembersThisMonth { get; set; }
}

public class OwnerActiveVsExpiredDto
{
    public int ActiveMembers { get; set; }
    public int ExpiredMembers { get; set; }
}

public class OwnerBranchCapacityDto
{
    public long BranchId { get; set; }
    public string Branch { get; set; } = string.Empty;
    public int CurrentCheckIns { get; set; }
    public int Capacity { get; set; }
    public decimal CapacityPercent { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class OwnerPaymentsOverviewDto
{
    public List<OwnerRevenueBucketDto> RevenueByPaymentMethod { get; set; } = [];
    public List<OwnerRevenueBucketDto> RevenueByMembershipPlan { get; set; } = [];
    public List<OwnerPaymentCountTrendDto> PaymentCountOverTime { get; set; } = [];
}

public class OwnerRevenueBucketDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Count { get; set; }
}

public class OwnerPaymentCountTrendDto
{
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class OwnerPlanPerformanceDto
{
    public long PlanId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int SalesCount { get; set; }
    public decimal TotalRevenue { get; set; }
    public int ActiveMembersUsingPlan { get; set; }
}

public class OwnerTeamSummaryDto
{
    public int TotalManagers { get; set; }
    public int TotalStaff { get; set; }
    public int TotalTrainers { get; set; }
    public int ActiveEmployees { get; set; }
    public int InactiveEmployees { get; set; }
    public List<OwnerEmployeeSummaryDto> Employees { get; set; } = [];
}

public class OwnerEmployeeSummaryDto
{
    public long EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int PaymentsRecorded { get; set; }
    public int CheckInsHandled { get; set; }
}

public class OwnerAttentionItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public int Count { get; set; }
}

public class OwnerExpiredMemberDto
{
    public long MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string MembershipPlan { get; set; } = string.Empty;
    public DateOnly? ExpiryDate { get; set; }
    public int DaysExpired { get; set; }
    public DateTime? LastCheckIn { get; set; }
}
