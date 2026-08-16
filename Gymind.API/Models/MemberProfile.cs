using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("member_profiles")]
public class MemberProfile
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("member_id")]
    public long MemberId { get; set; }

    [Column("height_cm")]
    public decimal? HeightCm { get; set; }

    [Column("weight_kg")]
    public decimal? WeightKg { get; set; }

    [Column("fitness_goal")]
    public string? FitnessGoal { get; set; }

    [Column("target_weight_kg")]
    public decimal? TargetWeightKg { get; set; }

    [Column("body_fat_percentage")]
    public decimal? BodyFatPercentage { get; set; }

    [Column("waist_cm")]
    public decimal? WaistCm { get; set; }

    [Column("chest_cm")]
    public decimal? ChestCm { get; set; }

    [Column("shoulder_cm")]
    public decimal? ShoulderCm { get; set; }

    [Column("hip_cm")]
    public decimal? HipCm { get; set; }

    [Column("neck_cm")]
    public decimal? NeckCm { get; set; }

    [Column("arm_cm")]
    public decimal? ArmCm { get; set; }

    [Column("thigh_cm")]
    public decimal? ThighCm { get; set; }

    [Column("activity_level")]
    public string? ActivityLevel { get; set; }

    [Column("training_experience")]
    public string? TrainingExperience { get; set; }

    [Column("favorite_workout_type")]
    public string? FavoriteWorkoutType { get; set; }

    [Column("preferred_training_days")]
    public string? PreferredTrainingDays { get; set; }

    [Column("preferred_workout_time")]
    public string? PreferredWorkoutTime { get; set; }

    [Column("blood_type")]
    public string? BloodType { get; set; }

    [Column("medical_conditions")]
    public string? MedicalConditions { get; set; }

    [Column("allergies")]
    public string? Allergies { get; set; }

    [Column("injuries")]
    public string? Injuries { get; set; }

    [Column("medications")]
    public string? Medications { get; set; }

    [Column("doctor_clearance_required")]
    public bool DoctorClearanceRequired { get; set; }

    [Column("health_notes")]
    public string? HealthNotes { get; set; }

    [Column("emergency_contact_name")]
    public string? EmergencyContactName { get; set; }

    [Column("emergency_contact_relationship")]
    public string? EmergencyContactRelationship { get; set; }

    [Column("emergency_contact_phone")]
    public string? EmergencyContactPhone { get; set; }

    [Column("emergency_contact_alt_phone")]
    public string? EmergencyContactAltPhone { get; set; }

    [Column("daily_calories_target")]
    public decimal? DailyCaloriesTarget { get; set; }

    [Column("protein_target_grams")]
    public decimal? ProteinTargetGrams { get; set; }

    [Column("carbs_target_grams")]
    public decimal? CarbsTargetGrams { get; set; }

    [Column("fat_target_grams")]
    public decimal? FatTargetGrams { get; set; }

    [Column("water_target_ml")]
    public decimal? WaterTargetMl { get; set; }

    [Column("language")]
    public string? Language { get; set; }

    [Column("theme")]
    public string? Theme { get; set; }

    [Column("measurement_unit")]
    public string? MeasurementUnit { get; set; }

    [Column("notifications_enabled")]
    public bool NotificationsEnabled { get; set; } = true;

    [Column("profile_photo_url")]
    public string? ProfilePhotoUrl { get; set; }

    [Column("profile_completion_percentage")]
    public decimal? ProfileCompletionPercentage { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }
}
