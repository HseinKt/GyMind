using System.Security.Claims;
using System.Text.RegularExpressions;
using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/member-profile")]
[Authorize]
public class MemberProfileController : ControllerBase
{
    private static readonly HashSet<string> BloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    private static readonly HashSet<string> AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".heic", ".webp"];
    private readonly ApplicationDbContext _context;

    public MemberProfileController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var profile = await GetOrCreateProfile(member.Id);
        var trainerName = await GetTrainerNameAsync(member.Id);
        return Ok(ToDto(profile, member, trainerName));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateMemberProfileDto dto, [FromQuery] string? tab = null)
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var profile = await GetOrCreateProfile(member.Id);

        // Self-heal/populate missing fields from existing records to support tab-by-tab saving
        if (string.IsNullOrEmpty(tab) || tab == "preferences")
        {
            if (!dto.Dob.HasValue)
            {
                dto.Dob = member.Dob ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-25));
            }
            if (string.IsNullOrWhiteSpace(dto.FitnessGoal))
            {
                dto.FitnessGoal = profile.FitnessGoal ?? "General Fitness";
            }
        }

        var validation = ValidateProfile(dto, tab);
        if (validation.Count > 0)
        {
            return BadRequest(new { message = "Profile validation failed.", errors = validation });
        }

        ApplyUpdate(profile, member, dto, tab);
        await _context.SaveChangesAsync();

        var trainerName = await GetTrainerNameAsync(member.Id);
        return Ok(ToDto(profile, member, trainerName));
    }

    [HttpPost("photo")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> UploadPhoto(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Please choose a profile photo to upload." });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Profile photo must be JPG, PNG, HEIC, or WEBP." });
        }

        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var uploadRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "members");
        Directory.CreateDirectory(uploadRoot);
        var fileName = $"{member.Id}-{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadRoot, fileName);
        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        var profile = await GetOrCreateProfile(member.Id);
        profile.ProfilePhotoUrl = $"/uploads/members/{fileName}";
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var trainerName = await GetTrainerNameAsync(member.Id);
        return Ok(ToDto(profile, member, trainerName));
    }

    [HttpDelete("photo")]
    public async Task<IActionResult> RemovePhoto()
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var profile = await GetOrCreateProfile(member.Id);
        profile.ProfilePhotoUrl = null;
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        var trainerName = await GetTrainerNameAsync(member.Id);
        return Ok(ToDto(profile, member, trainerName));
    }

    [HttpGet("insights")]
    public async Task<IActionResult> Insights()
    {
        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var profile = await GetOrCreateProfile(member.Id);
        return Ok(CalculateInsights(member, profile));
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        var member = await GetCurrentMember();
        if (member == null)
        {
            return NotFound(new { message = "Member profile not found." });
        }

        var today = DateTime.UtcNow.Date;
        var currentWeekMonday = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var nextWeekMonday = currentWeekMonday.AddDays(7);
        var previousWeekMonday = currentWeekMonday.AddDays(-7);
        var currentDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var checkIns = await _context.CheckIns
            .Where(item => item.MemberId == member.Id)
            .ToListAsync();
        var workouts = await _context.WorkoutSessions
            .Where(item => item.UserId == parsedUserId)
            .ToListAsync();
        var attendedBookings = await _context.ClassBookings
            .Where(item => item.MemberId == member.Id && (item.Attended || item.AttendedAt.HasValue))
            .ToListAsync();
        var memberships = await _context.MemberMemberships
            .Where(item => item.MemberId == member.Id)
            .ToListAsync();
        var currentMembership = memberships
            .Where(item => AppStatuses.IsActiveMembership(item.Status) && (!item.EndDate.HasValue || item.EndDate.Value >= currentDate))
            .OrderByDescending(item => item.EndDate ?? DateOnly.MaxValue)
            .ThenByDescending(item => item.StartDate ?? DateOnly.MinValue)
            .FirstOrDefault();

        var totalMinutes = checkIns.Sum(CheckInMinutes) + workouts.Sum(item => Math.Max(0, item.DurationSeconds / 60));
        var currentWeekMinutes = TrainingMinutesBetween(checkIns, workouts, currentWeekMonday, nextWeekMonday);
        var previousWeekMinutes = TrainingMinutesBetween(checkIns, workouts, previousWeekMonday, currentWeekMonday);
        var currentWeekWorkouts = CountWorkoutsBetween(checkIns, workouts, currentWeekMonday, nextWeekMonday);
        var previousWeekWorkouts = CountWorkoutsBetween(checkIns, workouts, previousWeekMonday, currentWeekMonday);
        var currentWeekClasses = attendedBookings.Count(item => item.AttendedAt.HasValue && item.AttendedAt.Value.Date >= currentWeekMonday && item.AttendedAt.Value.Date < nextWeekMonday);
        var previousWeekClasses = attendedBookings.Count(item => item.AttendedAt.HasValue && item.AttendedAt.Value.Date >= previousWeekMonday && item.AttendedAt.Value.Date < currentWeekMonday);
        var weeklyActivity = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var day = currentWeekMonday.AddDays(offset);
                return new WeeklyActivityDto
                {
                    Day = day.ToString("ddd"),
                    Date = DateOnly.FromDateTime(day),
                    Minutes = TrainingMinutesForDate(checkIns, workouts, day),
                    IsToday = day == today
                };
            })
            .ToList();

        return Ok(new ProfileDashboardStatsDto
        {
            TotalWorkouts = Math.Max(checkIns.Count, workouts.Count),
            TotalHours = Math.Max(0, (int)Math.Round(totalMinutes / 60m)),
            ClassesAttended = attendedBookings.Count,
            MembershipRemainingDays = currentMembership?.EndDate is null ? 0 : Math.Max(0, currentMembership.EndDate.Value.DayNumber - currentDate.DayNumber),
            WorkoutsChangePercent = PercentChange(previousWeekWorkouts, currentWeekWorkouts),
            HoursChangePercent = PercentChange(previousWeekMinutes, currentWeekMinutes),
            ClassesChangePercent = PercentChange(previousWeekClasses, currentWeekClasses),
            MembershipStatus = currentMembership?.Status ?? AppStatuses.MembershipPending,
            AverageTrainingMinutes = weeklyActivity.Count == 0 ? 0 : (int)Math.Round(weeklyActivity.Average(item => item.Minutes)),
            WeeklyActivity = weeklyActivity
        });
    }

    private async Task<Member?> GetCurrentMember()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userId, out var parsedUserId))
        {
            return null;
        }

        return await _context.Members.FirstOrDefaultAsync(item => item.UserId == parsedUserId);
    }

    private async Task<string?> GetTrainerNameAsync(long memberId)
    {
        var trainerSession = await _context.TrainerSessions
            .Where(item => item.MemberId == memberId && item.TrainerUserId.HasValue)
            .OrderByDescending(item => item.SessionDate ?? DateTime.MinValue)
            .FirstOrDefaultAsync();

        if (trainerSession?.TrainerUserId != null)
        {
            var trainerUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == trainerSession.TrainerUserId.Value);
            return trainerUser?.FullName;
        }
        return null;
    }

    private async Task<MemberProfile> GetOrCreateProfile(long memberId)
    {
        var profile = await _context.MemberProfiles.FirstOrDefaultAsync(item => item.MemberId == memberId);
        if (profile != null)
        {
            return profile;
        }

        profile = new MemberProfile
        {
            MemberId = memberId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.MemberProfiles.Add(profile);
        await _context.SaveChangesAsync();
        return profile;
    }

    private static MemberProfileDto ToDto(MemberProfile profile, Member? member = null, string? trainerName = null) => new()
    {
        MemberId = profile.MemberId,
        HeightCm = profile.HeightCm,
        WeightKg = profile.WeightKg,
        FitnessGoal = profile.FitnessGoal,
        TargetWeightKg = profile.TargetWeightKg,
        BodyFatPercentage = profile.BodyFatPercentage,
        WaistCm = profile.WaistCm,
        ChestCm = profile.ChestCm,
        ShoulderCm = profile.ShoulderCm,
        HipCm = profile.HipCm,
        NeckCm = profile.NeckCm,
        ArmCm = profile.ArmCm,
        ThighCm = profile.ThighCm,
        ActivityLevel = profile.ActivityLevel,
        TrainingExperience = profile.TrainingExperience,
        FavoriteWorkoutType = profile.FavoriteWorkoutType,
        PreferredTrainingDays = profile.PreferredTrainingDays,
        PreferredWorkoutTime = profile.PreferredWorkoutTime,
        BloodType = profile.BloodType,
        MedicalConditions = profile.MedicalConditions,
        Allergies = profile.Allergies,
        Injuries = profile.Injuries,
        Medications = profile.Medications,
        DoctorClearanceRequired = profile.DoctorClearanceRequired,
        HealthNotes = profile.HealthNotes,
        EmergencyContactName = profile.EmergencyContactName,
        EmergencyContactRelationship = profile.EmergencyContactRelationship,
        EmergencyContactPhone = profile.EmergencyContactPhone,
        EmergencyContactAltPhone = profile.EmergencyContactAltPhone,
        DailyCaloriesTarget = profile.DailyCaloriesTarget,
        ProteinTargetGrams = profile.ProteinTargetGrams,
        CarbsTargetGrams = profile.CarbsTargetGrams,
        FatTargetGrams = profile.FatTargetGrams,
        WaterTargetMl = profile.WaterTargetMl,
        Language = profile.Language,
        Theme = profile.Theme,
        MeasurementUnit = profile.MeasurementUnit,
        NotificationsEnabled = profile.NotificationsEnabled,
        ProfilePhotoUrl = profile.ProfilePhotoUrl,
        ProfileCompletionPercentage = profile.ProfileCompletionPercentage,
        Dob = member?.Dob,
        Gender = member?.Gender,
        QrCode = member?.QrCode,
        TrainerName = trainerName,
        CreatedAt = profile.CreatedAt,
        UpdatedAt = profile.UpdatedAt
    };

    private static void ApplyUpdate(MemberProfile profile, Member member, UpdateMemberProfileDto dto, string? tab)
    {
        if (string.IsNullOrEmpty(tab) || tab == "measurements")
        {
            profile.HeightCm = dto.HeightCm;
            profile.WeightKg = dto.WeightKg;
            profile.TargetWeightKg = dto.TargetWeightKg;
            profile.DailyCaloriesTarget = dto.DailyCaloriesTarget;
            profile.ProteinTargetGrams = dto.ProteinTargetGrams;
            profile.CarbsTargetGrams = dto.CarbsTargetGrams;
            profile.FatTargetGrams = dto.FatTargetGrams;
            profile.WaterTargetMl = dto.WaterTargetMl;
            
            // Non-tab specific fields like unit/theme/language can be updated anytime if sent
            if (dto.MeasurementUnit != null) profile.MeasurementUnit = Trim(dto.MeasurementUnit);
            if (dto.Theme != null) profile.Theme = Trim(dto.Theme);
            if (dto.Language != null) profile.Language = Trim(dto.Language);
        }

        if (string.IsNullOrEmpty(tab) || tab == "preferences")
        {
            profile.FitnessGoal = Trim(dto.FitnessGoal);
            profile.ActivityLevel = Trim(dto.ActivityLevel);
            profile.TrainingExperience = Trim(dto.TrainingExperience);
            profile.FavoriteWorkoutType = Trim(dto.FavoriteWorkoutType);
            profile.PreferredTrainingDays = Trim(dto.PreferredTrainingDays);
            profile.PreferredWorkoutTime = Trim(dto.PreferredWorkoutTime);
            member.Dob = dto.Dob;
            member.Gender = Trim(dto.Gender);
        }

        if (string.IsNullOrEmpty(tab) || tab == "health")
        {
            profile.MedicalConditions = Trim(dto.MedicalConditions);
            profile.Allergies = Trim(dto.Allergies);
            profile.Injuries = Trim(dto.Injuries);
            profile.Medications = Trim(dto.Medications);
            profile.DoctorClearanceRequired = dto.DoctorClearanceRequired;
            profile.HealthNotes = Trim(dto.HealthNotes);
            profile.EmergencyContactName = Trim(dto.EmergencyContactName);
            profile.EmergencyContactRelationship = Trim(dto.EmergencyContactRelationship);
            profile.EmergencyContactPhone = Trim(dto.EmergencyContactPhone);
            profile.EmergencyContactAltPhone = Trim(dto.EmergencyContactAltPhone);
        }

        profile.UpdatedAt = DateTime.UtcNow;
        profile.ProfileCompletionPercentage = CalculateCompletion(profile);
    }

    private static MemberBodyInsightsDto CalculateInsights(Member member, MemberProfile profile)
    {
        var missing = new List<string>();
        var height = profile.HeightCm;
        var weight = profile.WeightKg;
        decimal? bmi = null;
        decimal? weightToHeight = null;
        string? idealRange = null;
        if (height.HasValue && weight.HasValue && height > 0)
        {
            var meters = height.Value / 100m;
            bmi = Round(weight.Value / (meters * meters));
            weightToHeight = Round(weight.Value / height.Value);
            idealRange = $"{Round(18.5m * meters * meters)} - {Round(24.9m * meters * meters)} kg";
        }
        else
        {
            if (!height.HasValue) missing.Add("heightCm");
            if (!weight.HasValue) missing.Add("weightKg");
        }

        decimal? leanMass = null;
        if (weight.HasValue && profile.BodyFatPercentage.HasValue)
        {
            leanMass = Round(weight.Value * (1 - profile.BodyFatPercentage.Value / 100m));
        }
        else if (!profile.BodyFatPercentage.HasValue)
        {
            missing.Add("bodyFatPercentage");
        }

        decimal? bmr = null;
        decimal? maintenance = null;
        var age = member.Dob.HasValue ? CalculateAge(member.Dob.Value) : (int?)null;
        if (height.HasValue && weight.HasValue && age.HasValue)
        {
            var gender = member.Gender?.Trim().ToLowerInvariant();
            bmr = Round(10m * weight.Value + 6.25m * height.Value - 5m * age.Value + (gender == "female" ? -161m : 5m));
            maintenance = Round(bmr.Value * ActivityFactor(profile.ActivityLevel));
        }
        else if (!age.HasValue)
        {
            missing.Add("dob");
        }

        return new MemberBodyInsightsDto
        {
            Bmi = bmi,
            BodyMassIndex = bmi,
            BmiCategory = bmi.HasValue ? BmiCategory(bmi.Value) : null,
            IdealWeightRange = idealRange,
            BodyFatPercentage = profile.BodyFatPercentage,
            LeanBodyMassKg = leanMass,
            WeightToHeightRatio = weightToHeight,
            ShoulderToWaistRatio = Ratio(profile.ShoulderCm, profile.WaistCm),
            ChestToWaistRatio = Ratio(profile.ChestCm, profile.WaistCm),
            Bmr = bmr,
            MaintenanceCalories = maintenance ?? profile.DailyCaloriesTarget,
            ProteinTargetGrams = profile.ProteinTargetGrams ?? (weight.HasValue ? Round(weight.Value * 1.8m) : null),
            CarbsTargetGrams = profile.CarbsTargetGrams,
            FatTargetGrams = profile.FatTargetGrams,
            WaterTargetMl = profile.WaterTargetMl ?? (weight.HasValue ? Round(weight.Value * 35m) : null),
            MissingFields = missing.Distinct().ToList()
        };
    }

    private static List<string> ValidateProfile(UpdateMemberProfileDto dto, string? tab)
    {
        var errors = new List<string>();

        if (string.IsNullOrEmpty(tab) || tab == "preferences")
        {
            if (string.IsNullOrWhiteSpace(dto.FitnessGoal))
            {
                errors.Add("Goal (fitnessGoal) is required.");
            }

            if (!dto.Dob.HasValue)
            {
                errors.Add("Date of birth (dob) is required.");
            }
            else
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var age = today.Year - dto.Dob.Value.Year;
                if (dto.Dob.Value > today.AddYears(-age)) age--;
                if (age < 10 || age > 100)
                {
                    errors.Add("Age must be between 10 and 100 years.");
                }
            }
        }

        if (string.IsNullOrEmpty(tab) || tab == "measurements")
        {
            AddRange(errors, dto.HeightCm, 80, 250, "heightCm must be between 80 and 250.");
            AddRange(errors, dto.WeightKg, 25, 300, "weightKg must be between 25 and 300.");
            AddRange(errors, dto.TargetWeightKg, 25, 300, "targetWeightKg must be between 25 and 300.");
            AddRange(errors, dto.BodyFatPercentage, 3, 70, "bodyFatPercentage must be between 3 and 70.");
            foreach (var (value, name) in new[]
            {
                (dto.WaistCm, "waistCm"), (dto.ChestCm, "chestCm"), (dto.ShoulderCm, "shoulderCm"),
                (dto.HipCm, "hipCm"), (dto.NeckCm, "neckCm"), (dto.ArmCm, "armCm"), (dto.ThighCm, "thighCm")
            })
            {
                AddRange(errors, value, 1, 300, $"{name} must be positive and reasonable.");
            }
        }

        if (string.IsNullOrEmpty(tab) || tab == "health")
        {
            if (!string.IsNullOrWhiteSpace(dto.BloodType) && !BloodTypes.Contains(dto.BloodType.Trim().ToUpperInvariant()))
            {
                errors.Add("bloodType must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.");
            }

            ValidatePhone(errors, dto.EmergencyContactPhone, "emergencyContactPhone");
            ValidatePhone(errors, dto.EmergencyContactAltPhone, "emergencyContactAltPhone");
        }

        return errors;
    }

    private static void AddRange(List<string> errors, decimal? value, decimal min, decimal max, string message)
    {
        if (value.HasValue && (value.Value < min || value.Value > max))
        {
            errors.Add(message);
        }
    }

    private static void ValidatePhone(List<string> errors, string? value, string field)
    {
        if (!string.IsNullOrWhiteSpace(value) && !Regex.IsMatch(value.Trim(), @"^\+?[0-9\s().-]{7,20}$"))
        {
            errors.Add($"{field} has an invalid phone format.");
        }
    }

    private static decimal? Ratio(decimal? first, decimal? second) =>
        first.HasValue && second.HasValue && second.Value > 0 ? Round(first.Value / second.Value) : null;

    private static decimal Round(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);

    private static decimal ActivityFactor(string? level) => level?.Trim().ToLowerInvariant() switch
    {
        "light" => 1.375m,
        "moderate" => 1.55m,
        "active" => 1.725m,
        "athlete" => 1.9m,
        _ => 1.2m
    };

    private static string BmiCategory(decimal bmi) => bmi switch
    {
        < 18.5m => "UNDERWEIGHT",
        < 25m => "HEALTHY",
        < 30m => "OVERWEIGHT",
        _ => "OBESE"
    };

    private static int CalculateAge(DateOnly dob)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - dob.Year;
        if (dob > today.AddYears(-age)) age--;
        return age;
    }

    private static decimal CalculateCompletion(MemberProfile profile)
    {
        var values = new object?[]
        {
            profile.HeightCm, profile.WeightKg, profile.FitnessGoal, profile.TargetWeightKg, profile.BodyFatPercentage,
            profile.WaistCm, profile.ChestCm, profile.ActivityLevel, profile.TrainingExperience,
            profile.EmergencyContactName, profile.EmergencyContactPhone, profile.BloodType
        };
        return Round(values.Count(item => item != null && !string.IsNullOrWhiteSpace(item.ToString())) / (decimal)values.Length * 100m);
    }

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static int CheckInMinutes(CheckIn checkIn)
    {
        if (!checkIn.CheckInTime.HasValue)
        {
            return 0;
        }

        var end = checkIn.CheckOutTime ?? checkIn.LastSeenAt;
        if (!end.HasValue || end.Value <= checkIn.CheckInTime.Value)
        {
            return 0;
        }

        return Math.Max(0, (int)Math.Round((end.Value - checkIn.CheckInTime.Value).TotalMinutes));
    }

    private static int TrainingMinutesForDate(IEnumerable<CheckIn> checkIns, IEnumerable<WorkoutSession> workouts, DateTime day)
    {
        var date = day.Date;
        var checkInMinutes = checkIns
            .Where(item => item.CheckInTime.HasValue && item.CheckInTime.Value.Date == date)
            .Sum(CheckInMinutes);
        var workoutMinutes = workouts
            .Where(item => item.CompletedAt.Date == date)
            .Sum(item => Math.Max(0, item.DurationSeconds / 60));
        return checkInMinutes + workoutMinutes;
    }

    private static int TrainingMinutesBetween(IEnumerable<CheckIn> checkIns, IEnumerable<WorkoutSession> workouts, DateTime start, DateTime end)
    {
        var checkInMinutes = checkIns
            .Where(item => item.CheckInTime.HasValue && item.CheckInTime.Value.Date >= start && item.CheckInTime.Value.Date < end)
            .Sum(CheckInMinutes);
        var workoutMinutes = workouts
            .Where(item => item.CompletedAt.Date >= start && item.CompletedAt.Date < end)
            .Sum(item => Math.Max(0, item.DurationSeconds / 60));
        return checkInMinutes + workoutMinutes;
    }

    private static int CountWorkoutsBetween(IEnumerable<CheckIn> checkIns, IEnumerable<WorkoutSession> workouts, DateTime start, DateTime end)
    {
        var checkInCount = checkIns.Count(item => item.CheckInTime.HasValue && item.CheckInTime.Value.Date >= start && item.CheckInTime.Value.Date < end);
        var workoutCount = workouts.Count(item => item.CompletedAt.Date >= start && item.CompletedAt.Date < end);
        return Math.Max(checkInCount, workoutCount);
    }

    private static decimal? PercentChange(int previous, int current)
    {
        if (previous <= 0)
        {
            return current > 0 ? null : 0;
        }

        return Math.Round((current - previous) / (decimal)previous * 100m, 1, MidpointRounding.AwayFromZero);
    }
}
