using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Gymind.API.Models;

namespace Gymind.API.Data;

public class ApplicationDbContext : DbContext
{
    private static readonly ValueConverter<DateTime?, DateTime?> NullableUtcDateTimeConverter = new(
        value => value.HasValue ? ToUtc(value.Value) : null,
        value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null);

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Gym> Gyms { get; set; }
    public DbSet<Branch> Branches { get; set; }
    public DbSet<Member> Members { get; set; }
    public DbSet<MembershipPlan> MembershipPlans { get; set; }
    public DbSet<MemberMembership> MemberMemberships { get; set; }
    public DbSet<MembershipPlanBranch> MembershipPlanBranches { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<CheckIn> CheckIns { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<GymClass> Classes { get; set; }
    public DbSet<ClassBooking> ClassBookings { get; set; }
    public DbSet<TrainerSession> TrainerSessions { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<NotificationRecipient> NotificationRecipients { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<DeviceApproval> DeviceApprovals { get; set; }
    public DbSet<OtpRecord> OtpRecords { get; set; }
    public DbSet<RefreshSession> RefreshSessions { get; set; }
    public DbSet<LocationPresence> LocationPresences { get; set; }
    public DbSet<WorkoutSession> WorkoutSessions { get; set; }
    public DbSet<MemberProfile> MemberProfiles { get; set; }
    public DbSet<GymSubscription> GymSubscriptions { get; set; }
    public DbSet<DietPlan> DietPlans { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ================= ROLES =================
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
        });

        // ================= USERS =================
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.FullName).HasColumnName("full_name");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.ProfilePhotoUrl).HasColumnName("profile_photo_url");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.RoleId);
            entity.HasIndex(e => e.GymId);
            entity.HasIndex(e => e.BranchId);

            entity.HasOne(e => e.Role)
                .WithMany()
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ================= GYMS =================
        modelBuilder.Entity<Gym>(entity =>
        {
            entity.ToTable("gyms");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.OwnerUserId).HasColumnName("owner_user_id");
            entity.Property(e => e.LogoUrl).HasColumnName("logo_url");
            entity.Property(e => e.City).HasColumnName("city");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // ================= BRANCHES =================
        modelBuilder.Entity<Branch>(entity =>
        {
            entity.ToTable("branches");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.RangeKm).HasColumnName("range_km");
            entity.Property(e => e.Capacity).HasColumnName("capacity");
            entity.Property(e => e.AreaSqm).HasColumnName("area_sqm");

            // ✅ FIXED: no more Location → use Lat/Lng directly
            entity.Property(e => e.Lat).HasColumnName("lat");
            entity.Property(e => e.Lng).HasColumnName("lng");

            entity.Property(e => e.OpenTime).HasColumnName("open_time");
            entity.Property(e => e.CloseTime).HasColumnName("close_time");
            entity.Property(e => e.QrCodeToken).HasColumnName("qr_code_token");
            entity.Property(e => e.QrCodeCreatedAt).HasColumnName("qr_code_created_at");
            entity.Property(e => e.QrCodeUpdatedAt).HasColumnName("qr_code_updated_at");
            entity.Property(e => e.QrCodeIsActive).HasColumnName("qr_code_is_active");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.HasIndex(e => e.QrCodeToken).IsUnique();
        });

        // ================= MEMBERS =================
        modelBuilder.Entity<Member>(entity =>
        {
            entity.ToTable("members");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.HomeBranchId).HasColumnName("home_branch_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.FullName).HasColumnName("full_name");
            entity.Property(e => e.Gender).HasColumnName("gender");
            entity.Property(e => e.Dob).HasColumnName("dob");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.QrCode).HasColumnName("qr_code");
            entity.Property(e => e.JoinDate).HasColumnName("join_date");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.HasIndex(e => e.GymId);
            entity.HasIndex(e => e.HomeBranchId);
            entity.HasIndex(e => e.UserId).IsUnique().HasFilter("user_id IS NOT NULL");
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ================= MEMBERSHIP PLANS =================
        modelBuilder.Entity<MembershipPlan>(entity =>
        {
            entity.ToTable("membership_plans");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Price).HasColumnName("price");
            entity.Property(e => e.DurationMonths).HasColumnName("duration_months");
            entity.Property(e => e.AccessType).HasColumnName("access_type");
            entity.Property(e => e.IncludesClasses).HasColumnName("includes_classes");
            entity.Property(e => e.IncludesPt).HasColumnName("includes_pt");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<MembershipPlanBranch>(entity =>
        {
            entity.ToTable("membership_plan_branches");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MembershipPlanId).HasColumnName("membership_plan_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(e => new { e.MembershipPlanId, e.BranchId }).IsUnique();
            entity.HasOne(e => e.MembershipPlan)
                .WithMany(e => e.PlanBranches)
                .HasForeignKey(e => e.MembershipPlanId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Branch)
                .WithMany()
                .HasForeignKey(e => e.BranchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ================= MEMBER MEMBERSHIPS =================
        modelBuilder.Entity<MemberMembership>(entity =>
        {
            entity.ToTable("member_memberships");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.FreezeDays).HasColumnName("freeze_days");
            entity.HasIndex(e => e.MemberId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.EndDate);
        });

        // ================= PAYMENTS =================
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.MembershipId).HasColumnName("membership_id");
            entity.Property(e => e.ReceivedByUserId).HasColumnName("received_by_user_id");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Method).HasColumnName("method");
            entity.Property(e => e.PaidAt).HasColumnName("paid_at");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.HasIndex(e => e.GymId);
            entity.HasIndex(e => e.BranchId);
            entity.HasIndex(e => e.PaidAt);
        });

        // ================= CHECKINS =================
        modelBuilder.Entity<CheckIn>(entity =>
        {
            entity.ToTable("check_ins");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CheckInTime).HasColumnName("check_in_time");
            entity.Property(e => e.CheckOutTime).HasColumnName("check_out_time");
            entity.Property(e => e.LastSeenAt).HasColumnName("last_seen_at");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.Method).HasColumnName("method");
            entity.Property(e => e.CheckOutMethod).HasColumnName("check_out_method");
            entity.HasIndex(e => e.MemberId);
            entity.HasIndex(e => e.BranchId);
            entity.HasIndex(e => e.CheckInTime);
            entity.HasIndex(e => e.MemberId)
                .IsUnique()
                .HasFilter("check_out_time IS NULL");
        });

        // ================= EMPLOYEES =================
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("employees");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.Position).HasColumnName("position");
            entity.Property(e => e.Salary).HasColumnName("salary");
            entity.Property(e => e.HireDate).HasColumnName("hire_date");
        });

        // ================= CLASSES =================
        modelBuilder.Entity<GymClass>(entity =>
        {
            entity.ToTable("classes");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.TrainerUserId).HasColumnName("trainer_user_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Capacity).HasColumnName("capacity");
            entity.Property(e => e.StartTime).HasColumnName("start_time").HasConversion(NullableUtcDateTimeConverter);
            entity.Property(e => e.EndTime).HasColumnName("end_time").HasConversion(NullableUtcDateTimeConverter);
            entity.HasIndex(e => e.BranchId);
            entity.HasIndex(e => e.TrainerUserId);
            entity.HasIndex(e => e.StartTime);
        });

        // ================= CLASS BOOKINGS =================
        modelBuilder.Entity<ClassBooking>(entity =>
        {
            entity.ToTable("class_bookings");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.BookedAt).HasColumnName("booked_at");
            entity.Property(e => e.Attended).HasColumnName("attended");
            entity.Property(e => e.AttendedAt).HasColumnName("attended_at").HasConversion(NullableUtcDateTimeConverter);
            entity.HasIndex(e => new { e.ClassId, e.MemberId })
                .IsUnique()
                .HasFilter("status IN ('BOOKED', 'Booked')");
        });

        // ================= TRAINER SESSIONS =================
        modelBuilder.Entity<TrainerSession>(entity =>
        {
            entity.ToTable("trainer_sessions");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.TrainerUserId).HasColumnName("trainer_user_id");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.SessionType).HasColumnName("session_type");
            entity.Property(e => e.SessionDate).HasColumnName("session_date");
            entity.Property(e => e.Notes).HasColumnName("notes");
        });

        // ================= NOTIFICATIONS =================
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.Message).HasColumnName("message");
            entity.Property(e => e.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        // ================= NOTIFICATION RECIPIENTS =================
        modelBuilder.Entity<NotificationRecipient>(entity =>
        {
            entity.ToTable("notification_recipients");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.NotificationId).HasColumnName("notification_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.IsRead).HasColumnName("is_read");
            entity.Property(e => e.ReadAt).HasColumnName("read_at");
        });

        // ================= AUDIT LOGS =================
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Action).HasColumnName("action");
            entity.Property(e => e.TableName).HasColumnName("table_name");
            entity.Property(e => e.RecordId).HasColumnName("record_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<DeviceApproval>(entity =>
        {
            entity.ToTable("device_approvals");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.DeviceId).HasColumnName("device_id");
            entity.Property(e => e.IsApproved).HasColumnName("is_approved");
            entity.Property(e => e.LastUpdatedAt).HasColumnName("last_updated_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<OtpRecord>(entity =>
        {
            entity.ToTable("otp_records");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.DeviceId).HasColumnName("device_id");
            entity.Property(e => e.OtpCode).HasColumnName("otp_code");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.IsUsed).HasColumnName("is_used");
        });

        modelBuilder.Entity<RefreshSession>(entity =>
        {
            entity.ToTable("refresh_sessions");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.RefreshToken).HasColumnName("refresh_token");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.RevokedAt).HasColumnName("revoked_at");
        });

        modelBuilder.Entity<LocationPresence>(entity =>
        {
            entity.ToTable("location_presence");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Latitude).HasColumnName("latitude");
            entity.Property(e => e.Longitude).HasColumnName("longitude");
            entity.Property(e => e.InsideGym).HasColumnName("inside_gym");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<WorkoutSession>(entity =>
        {
            entity.ToTable("workout_sessions");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.DurationSeconds).HasColumnName("duration_seconds");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<MemberProfile>(entity =>
        {
            entity.ToTable("member_profiles");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.HeightCm).HasColumnName("height_cm");
            entity.Property(e => e.WeightKg).HasColumnName("weight_kg");
            entity.Property(e => e.FitnessGoal).HasColumnName("fitness_goal");
            entity.Property(e => e.TargetWeightKg).HasColumnName("target_weight_kg");
            entity.Property(e => e.BodyFatPercentage).HasColumnName("body_fat_percentage");
            entity.Property(e => e.WaistCm).HasColumnName("waist_cm");
            entity.Property(e => e.ChestCm).HasColumnName("chest_cm");
            entity.Property(e => e.ShoulderCm).HasColumnName("shoulder_cm");
            entity.Property(e => e.HipCm).HasColumnName("hip_cm");
            entity.Property(e => e.NeckCm).HasColumnName("neck_cm");
            entity.Property(e => e.ArmCm).HasColumnName("arm_cm");
            entity.Property(e => e.ThighCm).HasColumnName("thigh_cm");
            entity.Property(e => e.ActivityLevel).HasColumnName("activity_level");
            entity.Property(e => e.TrainingExperience).HasColumnName("training_experience");
            entity.Property(e => e.FavoriteWorkoutType).HasColumnName("favorite_workout_type");
            entity.Property(e => e.PreferredTrainingDays).HasColumnName("preferred_training_days");
            entity.Property(e => e.PreferredWorkoutTime).HasColumnName("preferred_workout_time");
            entity.Property(e => e.BloodType).HasColumnName("blood_type");
            entity.Property(e => e.MedicalConditions).HasColumnName("medical_conditions");
            entity.Property(e => e.Allergies).HasColumnName("allergies");
            entity.Property(e => e.Injuries).HasColumnName("injuries");
            entity.Property(e => e.Medications).HasColumnName("medications");
            entity.Property(e => e.DoctorClearanceRequired).HasColumnName("doctor_clearance_required");
            entity.Property(e => e.HealthNotes).HasColumnName("health_notes");
            entity.Property(e => e.EmergencyContactName).HasColumnName("emergency_contact_name");
            entity.Property(e => e.EmergencyContactRelationship).HasColumnName("emergency_contact_relationship");
            entity.Property(e => e.EmergencyContactPhone).HasColumnName("emergency_contact_phone");
            entity.Property(e => e.EmergencyContactAltPhone).HasColumnName("emergency_contact_alt_phone");
            entity.Property(e => e.DailyCaloriesTarget).HasColumnName("daily_calories_target");
            entity.Property(e => e.ProteinTargetGrams).HasColumnName("protein_target_grams");
            entity.Property(e => e.CarbsTargetGrams).HasColumnName("carbs_target_grams");
            entity.Property(e => e.FatTargetGrams).HasColumnName("fat_target_grams");
            entity.Property(e => e.WaterTargetMl).HasColumnName("water_target_ml");
            entity.Property(e => e.Language).HasColumnName("language");
            entity.Property(e => e.Theme).HasColumnName("theme");
            entity.Property(e => e.MeasurementUnit).HasColumnName("measurement_unit");
            entity.Property(e => e.NotificationsEnabled).HasColumnName("notifications_enabled");
            entity.Property(e => e.ProfilePhotoUrl).HasColumnName("profile_photo_url");
            entity.Property(e => e.ProfileCompletionPercentage).HasColumnName("profile_completion_percentage");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(e => e.MemberId).IsUnique();
            entity.HasOne(e => e.Member)
                .WithOne(e => e.Profile)
                .HasForeignKey<MemberProfile>(e => e.MemberId);
        });

        modelBuilder.Entity<GymSubscription>(entity =>
        {
            entity.ToTable("gym_subscriptions");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.GymId).HasColumnName("gym_id");
            entity.Property(e => e.PlanName).HasColumnName("plan_name");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Currency).HasColumnName("currency");
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.PaidAt).HasColumnName("paid_at");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.NoticeStartedAt).HasColumnName("notice_started_at");
            entity.Property(e => e.LockedAt).HasColumnName("locked_at");
            entity.HasIndex(e => e.GymId);
            entity.HasOne(e => e.Gym)
                .WithMany()
                .HasForeignKey(e => e.GymId);
        });
    }

    private static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };
}
