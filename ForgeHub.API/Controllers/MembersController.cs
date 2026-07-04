using ForgeHub.API.Data;
using ForgeHub.API.DTOs;
using ForgeHub.API.Helpers;
using ForgeHub.API.Models;
using ForgeHub.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace ForgeHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public MembersController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetMembers(
        [FromQuery] long? gymId,
        [FromQuery] long? branchId,
        [FromQuery] string? status,
        [FromQuery] string? attendance,
        [FromQuery] string? query,
        [FromQuery] int? page,
        [FromQuery] int? pageSize)
    {
        var membersQuery = ApplyScope(_context.Members.AsQueryable());

        if (gymId.HasValue)
        {
            membersQuery = membersQuery.Where(m => m.GymId == gymId.Value);
        }

        if (branchId.HasValue)
        {
            membersQuery = membersQuery.Where(m => m.HomeBranchId == branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var search = query.Trim().ToLowerInvariant();
            var isNumericSearch = long.TryParse(search, NumberStyles.Integer, CultureInfo.InvariantCulture, out var searchId);
            membersQuery = membersQuery.Where(member =>
                (member.FullName != null && member.FullName.ToLower().Contains(search)) ||
                (member.Email != null && member.Email.ToLower().Contains(search)) ||
                (member.Phone != null && member.Phone.ToLower().Contains(search)) ||
                (isNumericSearch && member.Id == searchId));
        }

        // Apply membership status filter at DB level if present
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = AppStatuses.Normalize(status);
            if (normalizedStatus == "INACTIVE")
            {
                membersQuery = membersQuery.Where(m => !m.IsActive);
            }
            else
            {
                membersQuery = membersQuery.Where(m => m.IsActive && 
                    (
                        (normalizedStatus == "ACTIVE" && (!_context.MemberMemberships.Any(ms => ms.MemberId == m.Id) || _context.MemberMemberships.Where(ms => ms.MemberId == m.Id).OrderByDescending(ms => ms.StartDate).ThenByDescending(ms => ms.Id).Select(ms => ms.Status).FirstOrDefault() == "ACTIVE"))
                        ||
                        (_context.MemberMemberships.Where(ms => ms.MemberId == m.Id).OrderByDescending(ms => ms.StartDate).ThenByDescending(ms => ms.Id).Select(ms => ms.Status).FirstOrDefault() == normalizedStatus)
                    )
                );
            }
        }

        var todayStart = DateTime.UtcNow.Date;
        var todayEnd = todayStart.AddDays(1);
        var now = DateTime.UtcNow;

        // Apply attendance filter at DB level if present
        if (!string.IsNullOrWhiteSpace(attendance))
        {
            var normalizedAttendance = AppStatuses.Normalize(attendance);
            if (normalizedAttendance == "CURRENT" || normalizedAttendance == "CURRENTLY_CHECKED_IN")
            {
                membersQuery = membersQuery.Where(m => _context.CheckIns.Any(c => c.MemberId == m.Id && (!c.CheckOutTime.HasValue || c.CheckOutTime.Value > now)));
            }
            else if (normalizedAttendance == "TODAY" || normalizedAttendance == "CHECKED_IN_TODAY")
            {
                membersQuery = membersQuery.Where(m => _context.CheckIns.Any(c => c.MemberId == m.Id && c.CheckInTime >= todayStart && c.CheckInTime < todayEnd));
            }
            else if (normalizedAttendance == "NOT_TODAY" || normalizedAttendance == "NOT_CHECKED_IN_TODAY")
            {
                membersQuery = membersQuery.Where(m => !_context.CheckIns.Any(c => c.MemberId == m.Id && c.CheckInTime >= todayStart && c.CheckInTime < todayEnd));
            }
        }

        List<Models.Member> members;
        int totalCount = 0;
        int safePage = 1;
        int safePageSize = 15;
        int totalPages = 1;
        bool isPaged = page.HasValue || pageSize.HasValue;

        if (isPaged)
        {
            safePageSize = Math.Clamp(pageSize ?? 15, 1, 100);
            safePage = Math.Max(page ?? 1, 1);
            totalCount = await membersQuery.CountAsync();
            totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)safePageSize));
            
            members = await membersQuery
                .OrderBy(m => m.FullName)
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .ToListAsync();
        }
        else
        {
            members = await membersQuery
                .OrderBy(m => m.FullName)
                .ToListAsync();
            totalCount = members.Count;
        }

        var memberIds = members.Select(member => member.Id).ToList();
        var branchIds = members.Where(member => member.HomeBranchId.HasValue).Select(member => member.HomeBranchId!.Value).Distinct().ToList();

        var branches = await _context.Branches
            .Where(branch => branchIds.Contains(branch.Id))
            .ToDictionaryAsync(branch => branch.Id, branch => branch.Name);

        var memberships = await _context.MemberMemberships
            .Where(membership => membership.MemberId.HasValue && memberIds.Contains(membership.MemberId.Value))
            .OrderByDescending(membership => membership.StartDate)
            .ToListAsync();

        var plans = await _context.MembershipPlans
            .ToDictionaryAsync(plan => plan.Id, plan => plan.Name ?? string.Empty);

        var latestPaymentMemberIds = await _context.Payments
            .Where(payment => payment.MemberId.HasValue && memberIds.Contains(payment.MemberId.Value))
            .GroupBy(payment => payment.MemberId!.Value)
            .Select(group => group.Key)
            .ToListAsync();

        var membershipByMember = memberships
            .GroupBy(membership => membership.MemberId!.Value)
            .ToDictionary(group => group.Key, group => group.First());

        var todayCheckedInMemberIds = await _context.CheckIns
            .Where(checkIn => checkIn.MemberId.HasValue &&
                memberIds.Contains(checkIn.MemberId.Value) &&
                checkIn.CheckInTime >= todayStart &&
                checkIn.CheckInTime < todayEnd)
            .Select(checkIn => checkIn.MemberId!.Value)
            .Distinct()
            .ToListAsync();

        var activeCheckedInMemberIds = await _context.CheckIns
            .Where(checkIn => checkIn.MemberId.HasValue &&
                memberIds.Contains(checkIn.MemberId.Value) &&
                (!checkIn.CheckOutTime.HasValue || checkIn.CheckOutTime.Value > now))
            .Select(checkIn => checkIn.MemberId!.Value)
            .Distinct()
            .ToListAsync();

        var todaySet = todayCheckedInMemberIds.ToHashSet();
        var activeSet = activeCheckedInMemberIds.ToHashSet();

        var items = members.Select(member =>
        {
            membershipByMember.TryGetValue(member.Id, out var membership);
            var branchName = member.HomeBranchId.HasValue && branches.TryGetValue(member.HomeBranchId.Value, out var name)
                ? name ?? string.Empty
                : string.Empty;

            return new
            {
                member.Id,
                member.GymId,
                BranchId = member.HomeBranchId,
                HomeBranchId = member.HomeBranchId,
                BranchName = branchName,
                Name = member.FullName ?? string.Empty,
                FullName = member.FullName ?? string.Empty,
                member.Email,
                member.Phone,
                PlanId = membership?.PlanId is long planId && plans.TryGetValue(planId, out var planName) && !string.IsNullOrWhiteSpace(planName)
                    ? planName
                    : "Unassigned",
                TrainerId = (long?)null,
                TrainerName = "Unassigned",
                Status = member.IsActive
                    ? membership?.Status ?? AppStatuses.MembershipActive
                    : "INACTIVE",
                PaymentStatus = latestPaymentMemberIds.Contains(member.Id) ? AppStatuses.PaymentPaid : AppStatuses.PaymentPending,
                AttendanceToday = activeSet.Contains(member.Id)
                    ? "Currently checked in"
                    : todaySet.Contains(member.Id)
                        ? "Checked in today"
                        : "Not checked in today",
                JoinedAt = member.JoinDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                MembershipStartDate = membership?.StartDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                MembershipEndDate = membership?.EndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                member.IsActive
            };
        }).ToList();

        if (isPaged)
        {
            return Ok(new
            {
                items,
                totalCount,
                page = safePage,
                pageSize = safePageSize,
                totalPages
            });
        }

        return Ok(items);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetMember(long id)
    {
        var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        return member == null ? NotFound() : Ok(member);
    }

    [HttpGet("{id:long}/personal-info")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> GetPersonalInfo(long id)
    {
        var member = await ApplyScope(_context.Members.Include(item => item.Profile)).FirstOrDefaultAsync(item => item.Id == id);
        if (member == null)
        {
            return NotFound();
        }

        var profile = await GetOrCreateProfile(member.Id);
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "VIEW_MEMBER_PERSONAL_INFO",
            TableName = "member_profiles",
            RecordId = profile.Id,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return Ok(ToHealthInfo(profile));
    }

    [HttpPut("{id:long}/personal-info")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> UpdatePersonalInfo(long id, [FromBody] UpdateMemberHealthInfoDto request)
    {
        var errors = ValidateHealthInfo(request);
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Personal info validation failed.", errors });
        }

        var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (member == null)
        {
            return NotFound();
        }

        var profile = await GetOrCreateProfile(member.Id);
        profile.BloodType = Trim(request.BloodType);
        profile.EmergencyContactName = Trim(request.EmergencyContactName);
        profile.EmergencyContactRelationship = Trim(request.EmergencyContactRelationship);
        profile.EmergencyContactPhone = Trim(request.EmergencyContactPhone);
        profile.EmergencyContactAltPhone = Trim(request.EmergencyContactAltPhone);
        profile.MedicalConditions = Trim(request.MedicalConditions);
        profile.Allergies = Trim(request.Allergies);
        profile.Injuries = Trim(request.Injuries);
        profile.Medications = Trim(request.Medications);
        profile.DoctorClearanceRequired = request.DoctorClearanceRequired;
        profile.HealthNotes = Trim(request.HealthNotes);
        profile.UpdatedAt = DateTime.UtcNow;

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId,
            Action = "UPDATE_MEMBER_PERSONAL_INFO",
            TableName = "member_profiles",
            RecordId = profile.Id,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        return Ok(ToHealthInfo(profile));
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> CreateMember([FromBody] CreateMemberRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest(new { message = "Full name is required." });
            }

            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { message = "Email is required." });
            }

            if (string.IsNullOrWhiteSpace(request.Password) || !ForgeHub.API.Helpers.PasswordValidator.IsStrongPassword(request.Password))
            {
                return BadRequest(new { message = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." });
            }

            var email = request.Email.Trim().ToLowerInvariant();
            if (await _context.Users.AnyAsync(user => user.Email != null && user.Email.ToLower() == email))
            {
                return BadRequest(new { message = "Email already exists." });
            }

            var memberRole = await _context.Roles.FirstOrDefaultAsync(role => role.Name == AppRoles.Member);
            if (memberRole == null)
            {
                return BadRequest(new { message = "Member role is not configured." });
            }

            var scopedBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.HomeBranchId
                : _currentUser.BranchId;
            var scopedGymId = _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.GymId
                : await ResolveOwnedGymIdAsync(request.GymId, scopedBranchId);

            if (!await IsValidMemberScopeAsync(scopedGymId, scopedBranchId))
            {
                return BadRequest(new { message = "Invalid gym or branch scope." });
            }

            var memberUser = new User
            {
                GymId = scopedGymId,
                BranchId = scopedBranchId,
                RoleId = memberRole.Id,
                FullName = request.FullName.Trim(),
                Email = email,
                Phone = request.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(memberUser);
            await _context.SaveChangesAsync();

            var member = new Member
            {
                GymId = scopedGymId,
                HomeBranchId = scopedBranchId,
                UserId = memberUser.Id,
                FullName = request.FullName,
                Gender = request.Gender,
                Dob = request.Dob,
                Phone = request.Phone,
                Email = request.Email,
                QrCode = string.IsNullOrWhiteSpace(request.QrCode) ? Guid.NewGuid().ToString("N") : request.QrCode,
                JoinDate = request.JoinDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                IsActive = request.IsActive
            };

            _context.Members.Add(member);
            await _context.SaveChangesAsync();
            var response = await BuildMemberDtoAsync(member.Id);
            return CreatedAtAction(nameof(GetMember), new { id = member.Id }, response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> UpdateMember(long id, [FromBody] UpdateMemberRequest request)
    {
        try
        {
            var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (member == null)
            {
                return NotFound();
            }

            var nextGymId = _currentUser.IsInRole(AppRoles.SuperAdmin) ? request.GymId : member.GymId;
            var nextBranchId = _currentUser.IsInRole(AppRoles.GymOwner) || _currentUser.IsInRole(AppRoles.SuperAdmin)
                ? request.HomeBranchId
                : member.HomeBranchId;

            if (!await IsValidMemberScopeAsync(nextGymId, nextBranchId))
            {
                return BadRequest(new { message = "Invalid gym or branch scope." });
            }

            member.GymId = nextGymId;
            member.HomeBranchId = nextBranchId;
            member.FullName = request.FullName;
            member.Gender = request.Gender;
            member.Dob = request.Dob;
            member.Phone = request.Phone;
            member.Email = request.Email;
            member.QrCode = request.QrCode ?? member.QrCode;
            member.JoinDate = request.JoinDate ?? member.JoinDate;
            member.IsActive = request.IsActive;

            await _context.SaveChangesAsync();
            return Ok(member);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> DeleteMember(long id)
    {
        try
        {
            var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
            if (member == null)
            {
                return NotFound();
            }

            member.IsActive = false;
            if (member.UserId.HasValue)
            {
                var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == member.UserId.Value);
                if (user != null)
                {
                    user.IsActive = false;
                }
            }

            AddAudit("MEMBER_DEACTIVATED", "members", member.Id);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpPatch("{id:long}/status")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateStatusRequest request)
    {
        var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (member == null)
        {
            return NotFound();
        }

        member.IsActive = request.IsActive;
        if (member.UserId.HasValue)
        {
            var user = await _context.Users.FirstOrDefaultAsync(item => item.Id == member.UserId.Value);
            if (user != null)
            {
                user.IsActive = request.IsActive;
            }
        }

        AddAudit(request.IsActive ? "MEMBER_REACTIVATED" : "MEMBER_DEACTIVATED", "members", member.Id);
        await _context.SaveChangesAsync();
        return Ok(member);
    }

    [HttpGet("{id:long}/profile")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> GetMemberProfile(long id)
    {
        var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (member == null)
        {
            return NotFound();
        }

        var profile = await GetOrCreateProfile(member.Id);
        return Ok(MapProfileDto(profile));
    }

    [HttpPut("{id:long}/assessment")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> UpdateAssessment(long id, [FromBody] UpdateMemberAssessmentDto request)
    {
        var member = await ApplyScope(_context.Members.AsQueryable()).FirstOrDefaultAsync(item => item.Id == id);
        if (member == null)
        {
            return NotFound();
        }

        var profile = await GetOrCreateProfile(member.Id);
        profile.HeightCm = request.HeightCm;
        profile.WeightKg = request.WeightKg;
        profile.BodyFatPercentage = request.BodyFatPercentage;
        profile.WaistCm = request.WaistCm;
        profile.ChestCm = request.ChestCm;
        profile.ShoulderCm = request.ShoulderCm;
        profile.HipCm = request.HipCm;
        profile.NeckCm = request.NeckCm;
        profile.ArmCm = request.ArmCm;
        profile.ThighCm = request.ThighCm;
        
        if (!string.IsNullOrWhiteSpace(request.BloodType))
        {
            var bloodTypes = new HashSet<string> { "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-" };
            var bloodType = request.BloodType.Trim().ToUpperInvariant();
            if (bloodTypes.Contains(bloodType))
            {
                profile.BloodType = bloodType;
            }
        }
        
        profile.UpdatedAt = DateTime.UtcNow;
        
        var values = new object?[]
        {
            profile.HeightCm, profile.WeightKg, profile.FitnessGoal, profile.TargetWeightKg, profile.BodyFatPercentage,
            profile.WaistCm, profile.ChestCm, profile.ActivityLevel, profile.TrainingExperience,
            profile.EmergencyContactName, profile.EmergencyContactPhone, profile.BloodType
        };
        profile.ProfileCompletionPercentage = Math.Round(values.Count(item => item != null && !string.IsNullOrWhiteSpace(item.ToString())) / (decimal)values.Length * 100m, 1, MidpointRounding.AwayFromZero);

        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId == 0 ? null : _currentUser.UserId,
            Action = "UPDATE_MEMBER_ASSESSMENT",
            TableName = "member_profiles",
            RecordId = profile.Id,
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(MapProfileDto(profile));
    }

    private static object MapProfileDto(MemberProfile profile) => new
    {
        profile.Id,
        profile.MemberId,
        profile.HeightCm,
        profile.WeightKg,
        profile.FitnessGoal,
        profile.TargetWeightKg,
        profile.BodyFatPercentage,
        profile.WaistCm,
        profile.ChestCm,
        profile.ShoulderCm,
        profile.HipCm,
        profile.NeckCm,
        profile.ArmCm,
        profile.ThighCm,
        profile.ActivityLevel,
        profile.TrainingExperience,
        profile.FavoriteWorkoutType,
        profile.PreferredTrainingDays,
        profile.PreferredWorkoutTime,
        profile.BloodType,
        profile.MedicalConditions,
        profile.Allergies,
        profile.Injuries,
        profile.Medications,
        profile.DoctorClearanceRequired,
        profile.HealthNotes,
        profile.EmergencyContactName,
        profile.EmergencyContactRelationship,
        profile.EmergencyContactPhone,
        profile.EmergencyContactAltPhone,
        profile.DailyCaloriesTarget,
        profile.ProteinTargetGrams,
        profile.CarbsTargetGrams,
        profile.FatTargetGrams,
        profile.WaterTargetMl,
        profile.Language,
        profile.Theme,
        profile.MeasurementUnit,
        profile.NotificationsEnabled,
        profile.ProfilePhotoUrl,
        profile.ProfileCompletionPercentage,
        profile.CreatedAt,
        profile.UpdatedAt
    };

    private IQueryable<Member> ApplyScope(IQueryable<Member> query)
    {
        if (_currentUser.IsInRole(AppRoles.SuperAdmin))
        {
            return query;
        }

        if (_currentUser.IsInRole(AppRoles.BranchManager) && !_currentUser.BranchId.HasValue)
        {
            return query.Where(item => false);
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            var ownedGymIds = _context.Gyms
                .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
                .Select(gym => gym.Id);
            query = query.Where(item => item.GymId.HasValue && ownedGymIds.Contains(item.GymId.Value));
        }
        else if (_currentUser.GymId.HasValue)
        {
            query = query.Where(item => item.GymId == _currentUser.GymId.Value);
        }

        if (_currentUser.BranchId.HasValue &&
            !_currentUser.IsInRole(AppRoles.GymOwner))
        {
            query = query.Where(item => item.HomeBranchId == _currentUser.BranchId.Value);
        }

        if (_currentUser.IsInRole(AppRoles.Member))
        {
            query = query.Where(item => item.UserId == _currentUser.UserId);
        }

        return query;
    }

    private async Task<bool> IsValidMemberScopeAsync(long? gymId, long? branchId)
    {
        if (_currentUser.IsInRole(AppRoles.BranchManager) || _currentUser.IsInRole(AppRoles.Staff))
        {
            return _currentUser.BranchId.HasValue &&
                branchId == _currentUser.BranchId &&
                gymId == _currentUser.GymId;
        }

        if (_currentUser.IsInRole(AppRoles.GymOwner))
        {
            if (!gymId.HasValue || !await _context.Gyms.AnyAsync(gym => gym.Id == gymId.Value && (gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))))
            {
                return false;
            }
        }
        else if (!_currentUser.IsInRole(AppRoles.SuperAdmin) && gymId != _currentUser.GymId)
        {
            return false;
        }

        if (branchId.HasValue)
        {
            var branchGymId = await _context.Branches
                .Where(branch => branch.Id == branchId.Value)
                .Select(branch => branch.GymId)
                .FirstOrDefaultAsync();

            if (!branchGymId.HasValue || (gymId.HasValue && branchGymId.Value != gymId.Value))
            {
                return false;
            }
        }

        if (!_currentUser.IsInRole(AppRoles.SuperAdmin) &&
            !_currentUser.IsInRole(AppRoles.GymOwner) &&
            _currentUser.BranchId.HasValue)
        {
            return branchId == _currentUser.BranchId;
        }

        return true;
    }

    private async Task<long?> ResolveOwnedGymIdAsync(long? requestedGymId, long? requestedBranchId = null)
    {
        if (!_currentUser.IsInRole(AppRoles.GymOwner))
        {
            return _currentUser.GymId;
        }

        var ownedGymIds = await _context.Gyms
            .Where(gym => gym.OwnerUserId == _currentUser.UserId || (_currentUser.GymId.HasValue && gym.Id == _currentUser.GymId.Value))
            .Select(gym => gym.Id)
            .ToListAsync();

        if (requestedGymId.HasValue)
        {
            return ownedGymIds.Contains(requestedGymId.Value) ? requestedGymId.Value : null;
        }

        if (requestedBranchId.HasValue)
        {
            var branchGymId = await _context.Branches
                .Where(branch => branch.Id == requestedBranchId.Value && branch.GymId.HasValue && ownedGymIds.Contains(branch.GymId.Value))
                .Select(branch => branch.GymId)
                .FirstOrDefaultAsync();
            if (branchGymId.HasValue)
            {
                return branchGymId.Value;
            }
        }

        if (_currentUser.GymId.HasValue && ownedGymIds.Contains(_currentUser.GymId.Value))
        {
            return _currentUser.GymId.Value;
        }

        return ownedGymIds.Count == 1 ? ownedGymIds[0] : null;
    }

    private async Task<object> BuildMemberDtoAsync(long memberId)
    {
        var member = await _context.Members.FirstAsync(item => item.Id == memberId);
        var branchName = member.HomeBranchId.HasValue
            ? await _context.Branches.Where(branch => branch.Id == member.HomeBranchId.Value).Select(branch => branch.Name).FirstOrDefaultAsync()
            : string.Empty;

        return new
        {
            member.Id,
            member.GymId,
            BranchId = member.HomeBranchId,
            HomeBranchId = member.HomeBranchId,
            BranchName = branchName ?? string.Empty,
            Name = member.FullName ?? string.Empty,
            FullName = member.FullName ?? string.Empty,
            member.Email,
            member.Phone,
            member.Gender,
            member.Dob,
            PlanId = "Unassigned",
            Status = member.IsActive ? AppStatuses.MembershipActive : "INACTIVE",
            PaymentStatus = AppStatuses.PaymentPending,
            AttendanceToday = "Not checked in today",
            JoinedAt = member.JoinDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
            MembershipStartDate = string.Empty,
            MembershipEndDate = string.Empty,
            member.IsActive
        };
    }

    private void AddAudit(string action, string tableName, long recordId)
    {
        _context.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.UserId == 0 ? null : _currentUser.UserId,
            Action = action,
            TableName = tableName,
            RecordId = recordId,
            CreatedAt = DateTime.UtcNow
        });
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

    private static MemberHealthInfoDto ToHealthInfo(MemberProfile profile) => new()
    {
        BloodType = profile.BloodType,
        EmergencyContactName = profile.EmergencyContactName,
        EmergencyContactRelationship = profile.EmergencyContactRelationship,
        EmergencyContactPhone = profile.EmergencyContactPhone,
        EmergencyContactAltPhone = profile.EmergencyContactAltPhone,
        MedicalConditions = profile.MedicalConditions,
        Allergies = profile.Allergies,
        Injuries = profile.Injuries,
        Medications = profile.Medications,
        DoctorClearanceRequired = profile.DoctorClearanceRequired,
        HealthNotes = profile.HealthNotes,
        UpdatedAt = profile.UpdatedAt
    };

    private static List<string> ValidateHealthInfo(MemberHealthInfoDto request)
    {
        var errors = new List<string>();
        var bloodTypes = new HashSet<string> { "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-" };
        if (!string.IsNullOrWhiteSpace(request.BloodType) && !bloodTypes.Contains(request.BloodType.Trim().ToUpperInvariant()))
        {
            errors.Add("bloodType must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.");
        }

        ValidatePhone(errors, request.EmergencyContactPhone, "emergencyContactPhone");
        ValidatePhone(errors, request.EmergencyContactAltPhone, "emergencyContactAltPhone");
        return errors;
    }

    private static void ValidatePhone(List<string> errors, string? value, string field)
    {
        if (!string.IsNullOrWhiteSpace(value) && !System.Text.RegularExpressions.Regex.IsMatch(value.Trim(), @"^\+?[0-9\s().-]{7,20}$"))
        {
            errors.Add($"{field} has an invalid phone format.");
        }
    }

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
