using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Gymind.API.DTOs;

public class CreateUserRequest
{
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    [Required]
    public long RoleId { get; set; }
    [Required]
    public string FullName { get; set; } = string.Empty;
    
    private string _email = string.Empty;
    [Required]
    [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", ErrorMessage = "Invalid email format.")]
    public string Email
    {
        get => _email;
        set => _email = value?.Replace(" ", "").ToLowerInvariant() ?? string.Empty;
    }
    public string? Phone { get; set; }
    [Required]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$", ErrorMessage = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.")]
    public string Password { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class UpdateUserRequest
{
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long RoleId { get; set; }
    [Required]
    public string FullName { get; set; } = string.Empty;
    
    private string _email = string.Empty;
    [Required]
    [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", ErrorMessage = "Invalid email format.")]
    public string Email
    {
        get => _email;
        set => _email = value?.Replace(" ", "").ToLowerInvariant() ?? string.Empty;
    }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateStatusRequest
{
    [Required]
    public bool IsActive { get; set; }
}

public class CreateGymRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public long? OwnerUserId { get; set; }
    public string? LogoUrl { get; set; }
    public string? City { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateGymRequest : CreateGymRequest
{
}

public class LinkGymOwnerRequest
{
    [Required]
    public long UserId { get; set; }
}

public class UploadGymLogoRequest
{
    [Required]
    public IFormFile File { get; set; } = default!;
}

public class CreateBranchRequest
{
    public long? GymId { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public decimal? RangeKm { get; set; }
    public int? Capacity { get; set; }
    public decimal? AreaSqm { get; set; }
    public double? Lat { get; set; }
    public double? Lng { get; set; }
    public string? OpenTime { get; set; }
    public string? CloseTime { get; set; }
    public JsonElement? IsActive { get; set; }
}

public class UpdateBranchRequest : CreateBranchRequest
{
}

public class CreateMemberRequest
{
    public long? GymId { get; set; }
    public long? HomeBranchId { get; set; }
    [Required]
    public string FullName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public DateOnly? Dob { get; set; }
    public string? Phone { get; set; }
    
    private string? _email;
    [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", ErrorMessage = "Invalid email format.")]
    public string? Email
    {
        get => _email;
        set => _email = value?.Replace(" ", "").ToLowerInvariant();
    }

    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$", ErrorMessage = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.")]
    public string? Password { get; set; }
    public string? QrCode { get; set; }
    public DateOnly? JoinDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateMemberRequest : CreateMemberRequest
{
}

public class OwnerClassGivenReportPointDto
{
    public string ClassName { get; set; } = string.Empty;
    public int CompletedCount { get; set; }
}

public class OwnerReportDto
{
    public string Period { get; set; } = "1d";
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public List<OwnerClassGivenReportPointDto> GivenClassesByName { get; set; } = [];
}

public class CreateMembershipPlanRequest
{
    public long? GymId { get; set; }
    public string? Name { get; set; }
    public decimal Price { get; set; }
    public int DurationMonth { get; set; }
    public string? AccessType { get; set; }
    public bool IncludesClasses { get; set; }
    public bool IncludesPt { get; set; }
    public bool IsActive { get; set; } = true;
    public List<long> BranchIds { get; set; } = [];
}

public class UpdateMembershipPlanRequest : CreateMembershipPlanRequest
{
}

public class CreateMemberMembershipRequest
{
    public long? MemberId { get; set; }
    public long? PlanId { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Status { get; set; }
    public int? FreezeDays { get; set; }
}

public class UpdateMemberMembershipRequest : CreateMemberMembershipRequest
{
}

public class CreatePaymentRequest
{
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? MemberId { get; set; }
    public long? MembershipId { get; set; }
    public long? ReceivedByUserId { get; set; }
    public decimal? Amount { get; set; }
    public string? Method { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Notes { get; set; }
}

public class CreateCheckInRequest
{
    public long? MemberId { get; set; }
    public long? BranchId { get; set; }
    public string? Method { get; set; }
}

public class AutoCheckOutRequest
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Method { get; set; } = "geofence-exit";
    public DateTime? Timestamp { get; set; }
}

public class CreateClassRequest
{
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? TrainerUserId { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    public int? Capacity { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
}

public class UpdateClassRequest : CreateClassRequest
{
}

public class CreateClassBookingRequest
{
    public long? ClassId { get; set; }
    public long? MemberId { get; set; }
    public string? Status { get; set; }
}

public class UpdateClassBookingStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

public class TrainerClassBookingDto
{
    public long BookingId { get; set; }
    public long? ClassId { get; set; }
    public long? MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string? MemberPhone { get; set; }
    public string? MemberEmail { get; set; }
    public string? Status { get; set; }
    public DateTime? BookedAt { get; set; }
    public bool Attended { get; set; }
    public DateTime? AttendedAt { get; set; }
}

public class UpdateClassBookingAttendanceRequest
{
    public bool Attended { get; set; }
}

public class CreateTrainerSessionRequest
{
    public long? TrainerUserId { get; set; }
    public long? MemberId { get; set; }
    public long? BranchId { get; set; }
    public string? SessionType { get; set; }
    public DateTime? SessionDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTrainerSessionRequest : CreateTrainerSessionRequest
{
}

public class CreateNotificationRequest
{
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public string TargetType { get; set; } = "USER";
    public string? Role { get; set; }
    public List<long> UserIds { get; set; } = [];
    public List<long> MemberIds { get; set; } = [];
    public long? ClassId { get; set; }
    public string Priority { get; set; } = "NORMAL";
    [Required]
    public string Title { get; set; } = string.Empty;
    [Required]
    public string Message { get; set; } = string.Empty;
    public long? CreatedByUserId { get; set; }
    public List<long> RecipientUserIds { get; set; } = [];
}

public class MarkNotificationReadRequest
{
    public long? UserId { get; set; }
}

public class AdminWorkspaceDto
{
    public List<AdminGymDto> Gyms { get; set; } = [];
    public List<AdminBranchDto> Branches { get; set; } = [];
    public List<AdminMemberDto> Members { get; set; } = [];
    public List<AdminUserDto> Users { get; set; } = [];
    public List<AdminUserDto> Trainers { get; set; } = [];
    public List<AdminPlanDto> Plans { get; set; } = [];
    public List<AdminClassDto> Classes { get; set; } = [];
    public List<AdminPaymentDto> Payments { get; set; } = [];
    public List<AdminAttendanceDto> Attendance { get; set; } = [];
    public List<AdminNotificationDto> Notifications { get; set; } = [];
    public List<AdminSubscriptionDto> Subscriptions { get; set; } = [];
    public List<AdminLogDto> SystemLogs { get; set; } = [];
    public AdminDashboardDto Dashboard { get; set; } = new();
}

public class AdminMemberDto
{
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public long? TrainerId { get; set; }
    public string TrainerName { get; set; } = "Unassigned";
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string AttendanceToday { get; set; } = "Not checked in";
    public string JoinedAt { get; set; } = string.Empty;
    public string MembershipStartDate { get; set; } = string.Empty;
    public string MembershipEndDate { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class StaffMemberSearchDto
{
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? HomeBranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string AttendanceToday { get; set; } = string.Empty;
    public string JoinedAt { get; set; } = string.Empty;
    public string MembershipStartDate { get; set; } = string.Empty;
    public string MembershipEndDate { get; set; } = string.Empty;
    public DateTime? LastCheckIn { get; set; }
    public bool IsActive { get; set; }
}

public class StaffMemberDetailsDto : StaffMemberSearchDto
{
    public string Gender { get; set; } = string.Empty;
    public DateOnly? Dob { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal LastPaymentAmount { get; set; }
    public DateTime? LastPaymentAt { get; set; }
    public string LastPaymentMethod { get; set; } = string.Empty;
    public List<AdminPaymentDto> RecentPayments { get; set; } = [];
    public List<AdminAttendanceDto> RecentCheckIns { get; set; } = [];
}

public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class CreateOneDayPassDto
{
    public decimal? AmountPaid { get; set; }
    public string? PaymentMethod { get; set; }
    public string? Notes { get; set; }
}

public class OneDayPassResponseDto
{
    public long CheckInId { get; set; }
    public string DisplayName { get; set; } = "One Day Pass";
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public DateTime CheckInTime { get; set; }
    public DateTime AutoCheckOutTime { get; set; }
    public bool IsAutoCheckOut { get; set; } = true;
    public string Status { get; set; } = "Active";
}

public class AdminUserDto
{
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long RoleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Workspace { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class AdminPlanDto
{
    public long Id { get; set; }
    public long? GymId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public int? DurationMonths { get; set; }
    public string AccessType { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class AdminClassDto
{
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? TrainerId { get; set; }
    public string TrainerName { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int Capacity { get; set; }
    public int Booked { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class AdminPaymentDto
{
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? MemberId { get; set; }
    public string Member { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public decimal? AmountValue { get; set; }
    public string Amount { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string PaymentType { get; set; } = string.Empty;
    public string Cashier { get; set; } = string.Empty;
    public string Status { get; set; } = "Completed";
    public string At { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
    public string? Notes { get; set; }
}

public class AdminAttendanceDto
{
    public long Id { get; set; }
    public long? MemberId { get; set; }
    public long? BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string MemberName { get; set; } = string.Empty;
    public string Type { get; set; } = "Member";
    public string Status { get; set; } = string.Empty;
    public string At { get; set; } = string.Empty;
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string Source { get; set; } = string.Empty;
    public bool IsSuspicious { get; set; }
    public string SuspicionReason { get; set; } = string.Empty;
    public string SuspicionLevel { get; set; } = "none";
    public string AlertType { get; set; } = string.Empty;
    public string AlertMessage { get; set; } = string.Empty;
}

public class BranchOperationsReportDto
{
    public long? BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int? Capacity { get; set; }
    public int UniqueMembersLoggedToday { get; set; }
    public int TotalCheckInEventsToday { get; set; }
    public int ManualCheckOutsToday { get; set; }
    public int AutoCheckOutsToday { get; set; }
    public List<BranchCapacityHourDto> CapacityByHour { get; set; } = [];
    public List<AdminAttendanceDto> RecentCheckIns { get; set; } = [];
}

public class BranchCapacityHourDto
{
    public int Hour { get; set; }
    public string Label { get; set; } = string.Empty;
    public int ActivePeople { get; set; }
    public decimal? UtilizationPercent { get; set; }
}

public class ManagerReportDto
{
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public int? BranchCapacity { get; set; }
    public int TotalMembersLoggedToday { get; set; }
    public List<HourlyBranchCapacityDto> BranchCapacityByHour { get; set; } = [];
    public CheckInOutSummaryDto CheckInOutSummary { get; set; } = new();
    public List<CheckInUnderlyingRowDto> TodayCheckIns { get; set; } = [];
}

public class HourlyBranchCapacityDto
{
    public int Hour { get; set; }
    public string Label { get; set; } = string.Empty;
    public int ActivePeopleCount { get; set; }
    public int? BranchCapacity { get; set; }
    public decimal? UtilizationPercent { get; set; }
}

public class CheckInOutSummaryDto
{
    public int CheckIns { get; set; }
    public int ManualCheckOuts { get; set; }
    public int AutoCheckOuts { get; set; }
}

public class CheckInUnderlyingRowDto
{
    public long Id { get; set; }
    public long? MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public bool IsAutoCheckOut { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class AdminNotificationDto
{
    public long Id { get; set; }
    public string Type { get; set; } = "system";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminGymDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Branches { get; set; }
    public int Members { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class AdminBranchDto
{
    public long Id { get; set; }
    public long? GymId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? Capacity { get; set; }
    public double? Lat { get; set; }
    public double? Lng { get; set; }
    public decimal? RangeKm { get; set; }
    public int Members { get; set; }
    public decimal Revenue { get; set; }
    public int ActiveToday { get; set; }
    public string Manager { get; set; } = string.Empty;
}

public class AdminSubscriptionDto
{
    public string Id { get; set; } = string.Empty;
    public string GymName { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = "Monthly";
    public string Amount { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string RenewalDate { get; set; } = string.Empty;
}

public class AdminLogDto
{
    public long Id { get; set; }
    public string Event { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string Level { get; set; } = "Info";
    public string Time { get; set; } = string.Empty;
}

public class AdminDashboardDto
{
    public AdminDashboardRoleDto Platform { get; set; } = new();
    public AdminDashboardRoleDto Owner { get; set; } = new();
    public AdminDashboardRoleDto Manager { get; set; } = new();
    public AdminDashboardRoleDto Staff { get; set; } = new();
    public AdminDashboardRoleDto Trainer { get; set; } = new();
}

public class AdminDashboardRoleDto
{
    public string Revenue { get; set; } = "$0";
    public string Members { get; set; } = "0";
    public string ActiveToday { get; set; } = "0";
    public string Tasks { get; set; } = "0";
    public string ClassesToday { get; set; } = "0";
    public string Subscriptions { get; set; } = "0 active";
    public decimal MonthlyPlatformRevenue { get; set; }
    public decimal PendingRevenue { get; set; }
    public int LatePayments { get; set; }
    public List<AdminPlatformRevenueRowDto> MonthlyPlatformRevenueRows { get; set; } = [];
    public string Conversion { get; set; } = "0%";
    public List<int> RevenueTrend { get; set; } = [];
    public List<AdminBarPointDto> GymPerformance { get; set; } = [];
    public List<AdminBarPointDto> BranchTrend { get; set; } = [];
    public List<AdminPiePointDto> AttendanceMix { get; set; } = [];
}

public class AdminPlatformRevenueRowDto
{
    public string Id { get; set; } = string.Empty;
    public string Month { get; set; } = string.Empty;
    public int PaidGyms { get; set; }
    public decimal Revenue { get; set; }
    public decimal UnpaidAmount { get; set; }
    public int LockedGyms { get; set; }
}

public class AdminBarPointDto
{
    public string Label { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Members { get; set; }
}

public class AdminPiePointDto
{
    public string Label { get; set; } = string.Empty;
    public int Value { get; set; }
}

public class MemberOnboardingRequest
{
    [Required]
    public string FullName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public DateOnly? Dob { get; set; }
    [EmailAddress]
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? HomeBranchId { get; set; }
    public long? PlanId { get; set; }
    public long? MembershipPlanId { get; set; }
    public DateOnly? StartDate { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public string? FitnessGoal { get; set; }
    public long? TrainerUserId { get; set; }
    public string PaymentStatus { get; set; } = "PAID";
    public decimal? Amount { get; set; }
    public decimal? PaymentAmount { get; set; }
    public string PaymentMethod { get; set; } = "Card";
    public string? Notes { get; set; }
}

public class MemberOnboardingOptionsDto
{
    public List<MemberOnboardingBranchOptionDto> Branches { get; set; } = [];
    public List<MemberOnboardingPlanOptionDto> MembershipPlans { get; set; } = [];
    public List<MemberOnboardingTrainerOptionDto> Trainers { get; set; } = [];
}

public class MemberOnboardingBranchOptionDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? GymId { get; set; }
}

public class MemberOnboardingPlanOptionDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public int? DurationMonths { get; set; }
    public long? GymId { get; set; }
}

public class MemberOnboardingTrainerOptionDto
{
    public long Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public long? BranchId { get; set; }
    public long? GymId { get; set; }
}

public class NotificationTargetsDto
{
    public List<string> TargetTypes { get; set; } = [];
    public List<NotificationGymTargetDto> Gyms { get; set; } = [];
    public List<NotificationBranchTargetDto> Branches { get; set; } = [];
    public List<string> Roles { get; set; } = [];
    public List<NotificationUserTargetDto> Users { get; set; } = [];
    public List<NotificationMemberTargetDto> Members { get; set; } = [];
}

public class NotificationGymTargetDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class NotificationBranchTargetDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? GymId { get; set; }
}

public class NotificationUserTargetDto
{
    public long Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
}

public class NotificationMemberTargetDto
{
    public long Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
}

public class ProcessPaymentWorkflowRequest
{
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    [Required]
    public long MemberId { get; set; }
    public long? MembershipId { get; set; }
    public decimal? Amount { get; set; }
    public string Method { get; set; } = "Card";
    public string Status { get; set; } = "Completed";
    public string? Notes { get; set; }
}
