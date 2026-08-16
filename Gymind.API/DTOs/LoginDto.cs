using System.ComponentModel.DataAnnotations;

namespace Gymind.API.DTOs;

public class LoginDto
{
    private string _email = string.Empty;

    [Required]
    [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", ErrorMessage = "Invalid email format.")]
    public string Email
    {
        get => _email;
        set => _email = value?.Replace(" ", "").ToLowerInvariant() ?? string.Empty;
    }
    
    [Required]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string DeviceId { get; set; } = string.Empty;
}

public class AdminLoginDto
{
    private string _email = string.Empty;

    [Required]
    [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", ErrorMessage = "Invalid email format.")]
    public string Email
    {
        get => _email;
        set => _email = value?.Replace(" ", "").ToLowerInvariant() ?? string.Empty;
    }

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class MemberLoginDto
{
    private string _identifier = string.Empty;

    [Required]
    public string Identifier
    {
        get => _identifier;
        set
        {
            if (value != null && value.Contains("@"))
            {
                _identifier = value.Replace(" ", "").ToLowerInvariant();
            }
            else
            {
                _identifier = value?.Trim() ?? string.Empty;
            }
        }
    }

    public string? Email { get; set; }
    public string? Phone { get; set; }

    [Required]
    public string Password { get; set; } = string.Empty;

    public string DeviceId { get; set; } = "member-mobile";
}

public class LogoutDto
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class RegisterDto
{
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
    
    [Required]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$", ErrorMessage = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.")]
    public string Password { get; set; } = string.Empty;
    
    [Required]
    public string Phone { get; set; } = string.Empty;
    
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
}

public class AuthResponseDto
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public long UserId { get; set; }
    public long? MemberId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }
    public string Role { get; set; } = string.Empty;
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? HomeBranchId { get; set; }
    public string MembershipStatus { get; set; } = string.Empty;
    public IReadOnlyList<string> Permissions { get; set; } = [];
    public DateTime ExpiresAt { get; set; }
    public bool RequiresOtp { get; set; }
    public bool DeviceApproved { get; set; }
    public string OtpHint { get; set; } = string.Empty;
    public string? QrCode { get; set; }
    public bool MembershipActive { get; set; }
    public string MembershipPlan { get; set; } = string.Empty;
    public int RemainingDays { get; set; }
}

public class VerifyOtpDto
{
    [Required]
    public long UserId { get; set; }

    [Required]
    public string Otp { get; set; } = string.Empty;

    [Required]
    public string DeviceId { get; set; } = string.Empty;
}

public class RefreshSessionDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

public class ForgotPasswordRequestDto
{
    private string _identifier = string.Empty;

    [Required]
    public string Identifier
    {
        get => _identifier;
        set
        {
            if (value != null && value.Contains("@"))
            {
                _identifier = value.Replace(" ", "").ToLowerInvariant();
            }
            else
            {
                _identifier = value?.Trim() ?? string.Empty;
            }
        }
    }
}

public class ForgotPasswordVerifyDto
{
    [Required]
    public string Identifier { get; set; } = string.Empty;

    [Required]
    public string Otp { get; set; } = string.Empty;

    [Required]
    public string ResetToken { get; set; } = string.Empty;
}

public class ForgotPasswordResetDto : ForgotPasswordVerifyDto
{
    [Required]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$", ErrorMessage = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.")]
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$", ErrorMessage = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.")]
    public string NewPassword { get; set; } = string.Empty;
}

public class CurrentUserDto
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long? MemberId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? HomeBranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public bool MembershipActive { get; set; }
    public bool DeviceApproved { get; set; }
    public string MembershipPlan { get; set; } = string.Empty;
    public string MembershipStatus { get; set; } = string.Empty;
    public int RemainingDays { get; set; }
    public double GymLatitude { get; set; }
    public double GymLongitude { get; set; }
    public int GeofenceRadiusMeters { get; set; }
    public string? QrCode { get; set; }
}

public class MembershipResponseDto
{
    public string PlanName { get; set; } = string.Empty;
    public int RemainingDays { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int VisitsThisMonth { get; set; }
    public MemberMembershipItemDto? CurrentMembership { get; set; }
    public List<MemberMembershipItemDto> Memberships { get; set; } = [];
    public List<MemberBranchAccessDto> BranchAccess { get; set; } = [];
}

public class StatsResponseDto
{
    public List<int> WeeklyAttendance { get; set; } = [];
    public List<int> MonthlyAttendance { get; set; } = [];
    public List<int> CurrentMonthAttendance { get; set; } = [];
    public List<int> PreviousMonthAttendance { get; set; } = [];
    public int WorkoutFrequency { get; set; }
    public int TotalCheckIns { get; set; }
    public int CaloriesBurnedEstimate { get; set; }
    public int VisitsThisWeek { get; set; }
    public int VisitsThisMonth { get; set; }
    public int CurrentStreak { get; set; }
    public int AverageGymTimeMinutes { get; set; }
}

public class BookingResponseDto
{
    public long Id { get; set; }
    public long? BookingId { get; set; }
    public long ClassId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Coach { get; set; } = string.Empty;
    public long? BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime? EndAt { get; set; }
    public int Capacity { get; set; }
    public int AvailableSpots { get; set; }
    public bool Booked { get; set; }
}

public class MemberMembershipItemDto
{
    public long Id { get; set; }
    public long? PlanId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int RemainingDays { get; set; }
    public bool IsActive { get; set; }
    public int FreezeDays { get; set; }
    public List<MemberBranchAccessDto> Branches { get; set; } = [];
}

public class BookingActionDto
{
    [Required]
    public long ClassId { get; set; }
}

public class QrScanDto
{
    [Required]
    public string QrPayload { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    [Required]
    public double? Latitude { get; set; }

    [Required]
    public double? Longitude { get; set; }
}

public class BranchQrPayloadDto
{
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string QrPayload { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class LocationUpdateDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool InsideGym { get; set; }
}

public class WorkoutSessionDto
{
    public int DurationSeconds { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class ApprovalQueueItemDto
{
    public long UserId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class ApproveDeviceDto
{
    [Required]
    public long UserId { get; set; }

    [Required]
    public string DeviceId { get; set; } = string.Empty;
}

public class MemberProfileDto
{
    public long MemberId { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public string? FitnessGoal { get; set; }
    public decimal? TargetWeightKg { get; set; }
    public decimal? BodyFatPercentage { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? ChestCm { get; set; }
    public decimal? ShoulderCm { get; set; }
    public decimal? HipCm { get; set; }
    public decimal? NeckCm { get; set; }
    public decimal? ArmCm { get; set; }
    public decimal? ThighCm { get; set; }
    public string? ActivityLevel { get; set; }
    public string? TrainingExperience { get; set; }
    public string? FavoriteWorkoutType { get; set; }
    public string? PreferredTrainingDays { get; set; }
    public string? PreferredWorkoutTime { get; set; }
    public string? BloodType { get; set; }
    public string? MedicalConditions { get; set; }
    public string? Allergies { get; set; }
    public string? Injuries { get; set; }
    public string? Medications { get; set; }
    public bool DoctorClearanceRequired { get; set; }
    public string? HealthNotes { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactRelationship { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? EmergencyContactAltPhone { get; set; }
    public decimal? DailyCaloriesTarget { get; set; }
    public decimal? ProteinTargetGrams { get; set; }
    public decimal? CarbsTargetGrams { get; set; }
    public decimal? FatTargetGrams { get; set; }
    public decimal? WaterTargetMl { get; set; }
    public string? Language { get; set; }
    public string? Theme { get; set; }
    public string? MeasurementUnit { get; set; }
    public bool NotificationsEnabled { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public decimal? ProfileCompletionPercentage { get; set; }
    public DateOnly? Dob { get; set; }
    public string? Gender { get; set; }
    public string? QrCode { get; set; }
    public string? TrainerName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ProfileDashboardStatsDto
{
    public int TotalWorkouts { get; set; }
    public int TotalHours { get; set; }
    public int ClassesAttended { get; set; }
    public int MembershipRemainingDays { get; set; }
    public decimal? WorkoutsChangePercent { get; set; }
    public decimal? HoursChangePercent { get; set; }
    public decimal? ClassesChangePercent { get; set; }
    public string MembershipStatus { get; set; } = string.Empty;
    public int AverageTrainingMinutes { get; set; }
    public List<WeeklyActivityDto> WeeklyActivity { get; set; } = [];
}

public class WeeklyActivityDto
{
    public string Day { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public int Minutes { get; set; }
    public bool IsToday { get; set; }
}

public class UpdateMemberProfileDto
{
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public string? FitnessGoal { get; set; }
    public decimal? TargetWeightKg { get; set; }
    public decimal? BodyFatPercentage { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? ChestCm { get; set; }
    public decimal? ShoulderCm { get; set; }
    public decimal? HipCm { get; set; }
    public decimal? NeckCm { get; set; }
    public decimal? ArmCm { get; set; }
    public decimal? ThighCm { get; set; }
    public string? ActivityLevel { get; set; }
    public string? TrainingExperience { get; set; }
    public string? FavoriteWorkoutType { get; set; }
    public string? PreferredTrainingDays { get; set; }
    public string? PreferredWorkoutTime { get; set; }
    public string? BloodType { get; set; }
    public string? MedicalConditions { get; set; }
    public string? Allergies { get; set; }
    public string? Injuries { get; set; }
    public string? Medications { get; set; }
    public bool DoctorClearanceRequired { get; set; }
    public string? HealthNotes { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactRelationship { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? EmergencyContactAltPhone { get; set; }
    public decimal? DailyCaloriesTarget { get; set; }
    public decimal? ProteinTargetGrams { get; set; }
    public decimal? CarbsTargetGrams { get; set; }
    public decimal? FatTargetGrams { get; set; }
    public decimal? WaterTargetMl { get; set; }
    public string? Language { get; set; }
    public string? Theme { get; set; }
    public string? MeasurementUnit { get; set; }
    public bool NotificationsEnabled { get; set; } = true;
    public DateOnly? Dob { get; set; }
    public string? Gender { get; set; }
    public string? ProfilePhotoUrl { get; set; }
}

public class MemberHealthInfoDto
{
    public string? BloodType { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactRelationship { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? EmergencyContactAltPhone { get; set; }
    public string? MedicalConditions { get; set; }
    public string? Allergies { get; set; }
    public string? Injuries { get; set; }
    public string? Medications { get; set; }
    public bool DoctorClearanceRequired { get; set; }
    public string? HealthNotes { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class UpdateMemberHealthInfoDto : MemberHealthInfoDto
{
}

public class MemberEmergencyInfoDto : MemberHealthInfoDto
{
}

public class MemberBodyInsightsDto
{
    public decimal? Bmi { get; set; }
    public string? BmiCategory { get; set; }
    public string? IdealWeightRange { get; set; }
    public decimal? BodyFatPercentage { get; set; }
    public decimal? LeanBodyMassKg { get; set; }
    public decimal? BodyMassIndex { get; set; }
    public decimal? WeightToHeightRatio { get; set; }
    public decimal? ShoulderToWaistRatio { get; set; }
    public decimal? ChestToWaistRatio { get; set; }
    public decimal? Bmr { get; set; }
    public decimal? MaintenanceCalories { get; set; }
    public decimal? ProteinTargetGrams { get; set; }
    public decimal? CarbsTargetGrams { get; set; }
    public decimal? FatTargetGrams { get; set; }
    public decimal? WaterTargetMl { get; set; }
    public List<string> MissingFields { get; set; } = [];
}

public class UpdateMemberAssessmentDto
{
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? BodyFatPercentage { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? ChestCm { get; set; }
    public decimal? ShoulderCm { get; set; }
    public decimal? HipCm { get; set; }
    public decimal? NeckCm { get; set; }
    public decimal? ArmCm { get; set; }
    public decimal? ThighCm { get; set; }
    public string? BloodType { get; set; }
}

public class CreateDietPlanDto
{
    public long? MemberId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? DailyCaloriesTarget { get; set; }
    public int? ProteinGrams { get; set; }
    public int? CarbsGrams { get; set; }
    public int? FatGrams { get; set; }
}
