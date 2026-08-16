using System.Globalization;
using System.Security.Claims;
using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Helpers;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = AppRoles.AdminOperatorRoles + "," + AppRoles.Trainer)]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AdminController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("workspace")]
    public async Task<IActionResult> GetWorkspace()
    {
        var currentUserId = GetCurrentUserId();
        var currentRole = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var gymId = GetGymIdClaim();
        var branchId = GetBranchIdClaim();
        var isPlatformOwner = string.Equals(currentRole, AppRoles.SuperAdmin, StringComparison.OrdinalIgnoreCase);
        var isGymOwner = string.Equals(currentRole, AppRoles.GymOwner, StringComparison.OrdinalIgnoreCase);
        List<long> ownedGymIds = isGymOwner
            ? await _context.Gyms
                .Where(gym => gym.OwnerUserId == currentUserId || (gymId.HasValue && gym.Id == gymId.Value))
                .Select(gym => gym.Id)
                .ToListAsync()
            : [];

        var roleLookup = await _context.Roles.ToDictionaryAsync(role => role.Id, role => role.Name);

        var usersQuery = _context.Users
            .Include(user => user.Role)
            .AsQueryable();

        if (!isPlatformOwner)
        {
            if (isGymOwner)
            {
                usersQuery = usersQuery.Where(user => user.GymId.HasValue && ownedGymIds.Contains(user.GymId.Value));
            }
            else if (gymId.HasValue)
            {
                usersQuery = usersQuery.Where(user => user.GymId == gymId.Value);
            }

            if (branchId.HasValue &&
                (string.Equals(currentRole, AppRoles.BranchManager, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(currentRole, AppRoles.Staff, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(currentRole, AppRoles.Trainer, StringComparison.OrdinalIgnoreCase)))
            {
                usersQuery = usersQuery.Where(user => user.BranchId == branchId.Value || user.BranchId == null);
            }
        }

        var users = await usersQuery
            .OrderBy(user => user.FullName)
            .ToListAsync();

        var gymsQuery = _context.Gyms.AsQueryable();
        if (isGymOwner)
        {
            gymsQuery = gymsQuery.Where(gym => ownedGymIds.Contains(gym.Id));
        }
        else if (!isPlatformOwner && gymId.HasValue)
        {
            gymsQuery = gymsQuery.Where(gym => gym.Id == gymId.Value);
        }

        var gyms = await gymsQuery.OrderBy(gym => gym.Name).ToListAsync();
        var gymIds = gyms.Select(gym => gym.Id).ToHashSet();
        var subscriptions = await _context.GymSubscriptions
            .Where(subscription => subscription.GymId.HasValue && gymIds.Contains(subscription.GymId.Value))
            .OrderBy(subscription => subscription.DueDate)
            .ToListAsync();
        var subscriptionKpis = await GetSubscriptionKpisAsync();

        var branchesQuery = _context.Branches.AsQueryable();
        if (!isPlatformOwner)
        {
            if (isGymOwner)
            {
                branchesQuery = branchesQuery.Where(branch => branch.GymId.HasValue && ownedGymIds.Contains(branch.GymId.Value));
            }
            else if (gymId.HasValue)
            {
                branchesQuery = branchesQuery.Where(branch => branch.GymId == gymId.Value);
            }

            if (branchId.HasValue &&
                (string.Equals(currentRole, AppRoles.BranchManager, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(currentRole, AppRoles.Staff, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(currentRole, AppRoles.Trainer, StringComparison.OrdinalIgnoreCase)))
            {
                branchesQuery = branchesQuery.Where(branch => branch.Id == branchId.Value);
            }
        }

        var branches = await branchesQuery.OrderBy(branch => branch.Name).ToListAsync();
        var branchIds = branches.Select(branch => branch.Id).ToHashSet();

        var membersQuery = _context.Members.AsQueryable();
        if (!isPlatformOwner)
        {
            if (isGymOwner)
            {
                membersQuery = membersQuery.Where(member => member.GymId.HasValue && ownedGymIds.Contains(member.GymId.Value));
            }
            else if (gymId.HasValue)
            {
                membersQuery = membersQuery.Where(member => member.GymId == gymId.Value);
            }

            if (string.Equals(currentRole, AppRoles.Trainer, StringComparison.OrdinalIgnoreCase))
            {
                var assignedMemberIds = _context.TrainerSessions
                    .Where(session => session.TrainerUserId == currentUserId && session.MemberId.HasValue)
                    .Select(session => session.MemberId!.Value);
                membersQuery = membersQuery.Where(member => assignedMemberIds.Contains(member.Id));
            }
            else if (branchId.HasValue && !string.Equals(currentRole, AppRoles.GymOwner, StringComparison.OrdinalIgnoreCase))
            {
                membersQuery = membersQuery.Where(member => member.HomeBranchId == branchId.Value);
            }
        }

        var members = await membersQuery.OrderBy(member => member.FullName).ToListAsync();
        var memberIds = members.Select(member => member.Id).ToHashSet();

        var plansQuery = _context.MembershipPlans.AsQueryable();
        if (isGymOwner)
        {
            plansQuery = plansQuery.Where(plan => plan.GymId.HasValue && ownedGymIds.Contains(plan.GymId.Value));
        }
        else if (!isPlatformOwner && gymId.HasValue)
        {
            plansQuery = plansQuery.Where(plan => plan.GymId == gymId.Value);
        }

        var plans = await plansQuery.OrderBy(plan => plan.Name).ToListAsync();
        var planLookup = plans.ToDictionary(plan => plan.Id, plan => plan);

        var memberships = await _context.MemberMemberships
            .Where(item => memberIds.Contains(item.MemberId ?? 0))
            .ToListAsync();
        var membershipByMember = memberships
            .Where(item => item.MemberId.HasValue)
            .GroupBy(item => item.MemberId)
            .ToDictionary(group => group.Key!.Value, group => group.OrderByDescending(item => item.StartDate).First());

        var trainerRoleIds = roleLookup
            .Where(pair => string.Equals(pair.Value, AppRoles.Trainer, StringComparison.OrdinalIgnoreCase))
            .Select(pair => pair.Key)
            .ToHashSet();

        var trainers = users
            .Where(user => trainerRoleIds.Contains(user.RoleId))
            .ToList();

        var trainerLookup = trainers.ToDictionary(trainer => trainer.Id, trainer => trainer.FullName ?? "Trainer");

        var trainerSessions = await _context.TrainerSessions
            .Where(session => memberIds.Contains(session.MemberId ?? 0))
            .OrderByDescending(session => session.SessionDate)
            .ToListAsync();
        var trainerSessionByMember = trainerSessions
            .Where(session => session.MemberId.HasValue)
            .GroupBy(session => session.MemberId)
            .ToDictionary(group => group.Key!.Value, group => group.First());

        var paymentsQuery = _context.Payments.AsQueryable();
        if (!isPlatformOwner)
        {
            if (isGymOwner)
            {
                paymentsQuery = paymentsQuery.Where(payment => payment.GymId.HasValue && ownedGymIds.Contains(payment.GymId.Value));
            }
            else if (gymId.HasValue)
            {
                paymentsQuery = paymentsQuery.Where(payment => payment.GymId == gymId.Value);
            }

            if (branchId.HasValue && !string.Equals(currentRole, AppRoles.GymOwner, StringComparison.OrdinalIgnoreCase))
            {
                paymentsQuery = paymentsQuery.Where(payment => payment.BranchId == branchId.Value);
            }
        }

        var payments = await paymentsQuery
            .OrderByDescending(payment => payment.PaidAt)
            .ToListAsync();

        var latestPaymentByMember = payments
            .Where(payment => payment.MemberId.HasValue)
            .GroupBy(payment => payment.MemberId)
            .ToDictionary(group => group.Key!.Value, group => group.First());

        var classesQuery = _context.Classes.AsQueryable();
        if (!isPlatformOwner)
        {
            if (isGymOwner)
            {
                classesQuery = classesQuery.Where(item => item.GymId.HasValue && ownedGymIds.Contains(item.GymId.Value));
            }
            else if (gymId.HasValue)
            {
                classesQuery = classesQuery.Where(item => item.GymId == gymId.Value);
            }

            if (string.Equals(currentRole, AppRoles.Trainer, StringComparison.OrdinalIgnoreCase))
            {
                classesQuery = classesQuery.Where(item => item.TrainerUserId == currentUserId);
            }
            else if (branchId.HasValue && !string.Equals(currentRole, AppRoles.GymOwner, StringComparison.OrdinalIgnoreCase))
            {
                classesQuery = classesQuery.Where(item => item.BranchId == branchId.Value);
            }
        }

        var classes = await classesQuery
            .OrderBy(item => item.StartTime)
            .ToListAsync();
        var classIds = classes.Select(item => item.Id).ToHashSet();

        var classBookingCounts = await _context.ClassBookings
            .Where(booking => classIds.Contains(booking.ClassId ?? 0) && booking.Status != AppStatuses.BookingCancelled && booking.Status != "Cancelled")
            .Where(booking => booking.ClassId.HasValue)
            .GroupBy(booking => booking.ClassId)
            .Select(group => new { ClassId = group.Key!.Value, Count = group.Count() })
            .ToDictionaryAsync(item => item.ClassId, item => item.Count);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayStart = DateTime.UtcNow.Date;
        var todayEnd = todayStart.AddDays(1);
        var now = DateTime.UtcNow;

        var checkInsQuery = _context.CheckIns.AsQueryable();
        if (branchIds.Count > 0)
        {
            checkInsQuery = checkInsQuery.Where(checkIn => branchIds.Contains(checkIn.BranchId ?? 0));
        }

        var todayCheckIns = await checkInsQuery
            .Where(checkIn => checkIn.CheckInTime >= todayStart && checkIn.CheckInTime < todayEnd)
            .ToListAsync();

        var recentCheckIns = await checkInsQuery
            .OrderByDescending(checkIn => checkIn.CheckInTime)
            .Take(50)
            .ToListAsync();

        var todayCheckedInMemberIds = todayCheckIns
            .Where(checkIn => checkIn.MemberId.HasValue)
            .Select(checkIn => checkIn.MemberId!.Value)
            .ToHashSet();
        var activeCheckedInMemberIds = await checkInsQuery
            .Where(checkIn => checkIn.MemberId.HasValue && (!checkIn.CheckOutTime.HasValue || checkIn.CheckOutTime.Value > now))
            .Select(checkIn => checkIn.MemberId!.Value)
            .ToListAsync();
        var activeCheckedInMemberIdSet = activeCheckedInMemberIds.ToHashSet();

        var notifications = await _context.NotificationRecipients
            .Where(recipient => recipient.UserId == currentUserId)
            .Join(
                _context.Notifications,
                recipient => recipient.NotificationId,
                notification => notification.Id,
                (recipient, notification) => new AdminNotificationDto
                {
                    Id = notification.Id,
                    Type = InferNotificationType(notification.Title),
                    Title = notification.Title ?? "Operational update",
                    Message = notification.Message ?? string.Empty,
                    Read = recipient.IsRead,
                    CreatedAt = notification.CreatedAt ?? DateTime.UtcNow
                })
            .OrderByDescending(notification => notification.CreatedAt)
            .ToListAsync();

        var auditLogs = await _context.AuditLogs
            .OrderByDescending(log => log.CreatedAt)
            .Take(25)
            .ToListAsync();

        var paymentTotalByGym = payments
            .Where(payment => payment.GymId.HasValue)
            .GroupBy(payment => payment.GymId!.Value)
            .ToDictionary(group => group.Key, group => group.Sum(item => item.Amount ?? 0m));

        var membersByGym = members
            .Where(member => member.GymId.HasValue)
            .GroupBy(member => member.GymId!.Value)
            .ToDictionary(group => group.Key, group => group.Count());

        var branchesByGym = branches
            .Where(branch => branch.GymId.HasValue)
            .GroupBy(branch => branch.GymId!.Value)
            .ToDictionary(group => group.Key, group => group.Count());

        var workspace = new AdminWorkspaceDto
        {
            Gyms = gyms.Select(gym =>
            {
                var owner = users.FirstOrDefault(user => user.Id == gym.OwnerUserId);
                return new AdminGymDto
                {
                    Id = gym.Id,
                    Name = gym.Name ?? "Gym",
                    OwnerName = owner?.FullName ?? "Unassigned",
                    Status = gym.IsActive ? "Active" : "Inactive",
                    Branches = branchesByGym.GetValueOrDefault(gym.Id),
                    Members = membersByGym.GetValueOrDefault(gym.Id),
                    MonthlyRevenue = paymentTotalByGym.GetValueOrDefault(gym.Id),
                    CreatedAt = gym.CreatedAt
                };
            }).ToList(),
            Branches = branches.Select(branch => {
                var parentGym = gyms.FirstOrDefault(gym => gym.Id == branch.GymId);
                var branchStatus = !branch.IsActive
                    ? "Inactive"
                    : (parentGym == null || parentGym.IsActive ? "Healthy" : "Suspended");
                return new AdminBranchDto
                {
                    Id = branch.Id,
                    GymId = branch.GymId,
                    Name = branch.Name ?? "Branch",
                    City = string.IsNullOrWhiteSpace(branch.Address) ? "Unknown" : branch.Address,
                    Address = branch.Address ?? string.Empty,
                    Status = branchStatus,
                    Capacity = branch.Capacity,
                    Lat = branch.Lat,
                    Lng = branch.Lng,
                    RangeKm = branch.RangeKm,
                    Members = members.Count(member => member.HomeBranchId == branch.Id),
                    Revenue = payments.Where(payment => payment.BranchId == branch.Id).Sum(payment => payment.Amount ?? 0m),
                    ActiveToday = todayCheckIns.Count(checkIn => checkIn.BranchId == branch.Id),
                    Manager = users.FirstOrDefault(user =>
                        user.BranchId == branch.Id &&
                        string.Equals(user.Role?.Name, AppRoles.BranchManager, StringComparison.OrdinalIgnoreCase))?.FullName ?? "Unassigned"
                };
            }).ToList(),
            Users = users.Select(user => ToAdminUser(user, gyms, branches)).ToList(),
            Trainers = trainers.Select(user => ToAdminUser(user, gyms, branches)).ToList(),
            Plans = plans.Select(plan => new AdminPlanDto
            {
                Id = plan.Id,
                GymId = plan.GymId,
                Name = plan.Name ?? string.Empty,
                Price = plan.Price,
                DurationMonths = plan.DurationMonths,
                AccessType = plan.AccessType ?? string.Empty,
                IsActive = plan.IsActive
            }).ToList(),
            Members = members.Select(member =>
            {
                membershipByMember.TryGetValue(member.Id, out var memberMembership);
                trainerSessionByMember.TryGetValue(member.Id, out var trainerSession);
                latestPaymentByMember.TryGetValue(member.Id, out var latestPayment);
                var trainerId = trainerSession?.TrainerUserId;
                return new AdminMemberDto
                {
                    Id = member.Id,
                    GymId = member.GymId,
                    BranchId = member.HomeBranchId,
                    Name = member.FullName ?? string.Empty,
                    Email = member.Email ?? string.Empty,
                    Phone = member.Phone ?? string.Empty,
                    PlanId = memberMembership?.PlanId is long planIdValue && planLookup.TryGetValue(planIdValue, out var plan)
                        ? plan.Name ?? string.Empty
                        : "Unassigned",
                    TrainerId = trainerId,
                    TrainerName = trainerId.HasValue && trainerLookup.TryGetValue(trainerId.Value, out var trainerName)
                        ? trainerName
                        : "Unassigned",
                    Status = memberMembership?.Status ?? (member.IsActive ? AppStatuses.MembershipActive : "INACTIVE"),
                    PaymentStatus = latestPayment == null ? AppStatuses.PaymentPending : AppStatuses.PaymentPaid,
                    AttendanceToday = activeCheckedInMemberIdSet.Contains(member.Id)
                        ? "Currently checked in"
                        : todayCheckedInMemberIds.Contains(member.Id)
                            ? "Checked in today"
                            : "Not checked in today",
                    JoinedAt = member.JoinDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                    MembershipStartDate = memberMembership?.StartDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                    MembershipEndDate = memberMembership?.EndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                    IsActive = member.IsActive
                };
            }).ToList(),
            Payments = payments.Select(payment => new AdminPaymentDto
            {
                Id = payment.Id,
                GymId = payment.GymId,
                BranchId = payment.BranchId,
                MemberId = payment.MemberId,
                Member = members.FirstOrDefault(member => member.Id == payment.MemberId)?.FullName ?? "Member",
                AmountValue = payment.Amount,
                Amount = payment.Amount.HasValue ? $"${payment.Amount.Value:0.##}" : "$0",
                Method = payment.Method ?? "Unknown",
                Status = "Completed",
                At = payment.PaidAt?.ToLocalTime().ToString("hh:mm tt", CultureInfo.InvariantCulture) ?? string.Empty,
                PaidAt = payment.PaidAt
            }).ToList(),
            Classes = classes.Select(item => new AdminClassDto
            {
                Id = item.Id,
                GymId = item.GymId,
                BranchId = item.BranchId,
                Name = item.Name ?? "Class",
                TrainerId = item.TrainerUserId,
                TrainerName = item.TrainerUserId.HasValue && trainerLookup.TryGetValue(item.TrainerUserId.Value, out var trainerName)
                    ? trainerName
                    : "Unassigned",
                Time = item.StartTime?.ToLocalTime().ToString("h:mm tt", CultureInfo.InvariantCulture) ?? string.Empty,
                StartTime = item.StartTime,
                EndTime = item.EndTime,
                Capacity = item.Capacity ?? 0,
                Booked = classBookingCounts.GetValueOrDefault(item.Id),
                Status = classBookingCounts.GetValueOrDefault(item.Id) >= (item.Capacity ?? 0) && (item.Capacity ?? 0) > 0
                    ? "Full"
                    : "Scheduled"
            }).ToList(),
            Attendance = recentCheckIns.Select(checkIn => new AdminAttendanceDto
            {
                Id = checkIn.Id,
                MemberId = checkIn.MemberId,
                BranchId = checkIn.BranchId,
                MemberName = string.Equals(checkIn.Method, "ONE_DAY_PASS", StringComparison.OrdinalIgnoreCase)
                    ? "One Day Pass"
                    : members.FirstOrDefault(member => member.Id == checkIn.MemberId)?.FullName ?? "Member",
                Type = string.Equals(checkIn.Method, "ONE_DAY_PASS", StringComparison.OrdinalIgnoreCase) ? "Guest" : "Member",
                Status = !checkIn.CheckOutTime.HasValue || checkIn.CheckOutTime.Value > now
                    ? "Checked in"
                    : "Checked out",
                At = checkIn.CheckInTime?.ToLocalTime().ToString("hh:mm tt", CultureInfo.InvariantCulture) ?? string.Empty,
                CheckInTime = checkIn.CheckInTime,
                CheckOutTime = checkIn.CheckOutTime,
                Source = !checkIn.CheckOutTime.HasValue || checkIn.CheckOutTime.Value > now
                    ? checkIn.Method ?? "Front desk"
                    : $"{checkIn.Method ?? "Front desk"} -> {checkIn.CheckOutMethod ?? "manual"}"
            }).ToList(),
            Notifications = notifications,
            Subscriptions = subscriptions.Count > 0
                ? subscriptions.Select(subscription => new AdminSubscriptionDto
                {
                    Id = subscription.Id.ToString(CultureInfo.InvariantCulture),
                    GymName = gyms.FirstOrDefault(gym => gym.Id == subscription.GymId)?.Name ?? "Gym",
                    Plan = subscription.PlanName ?? "Subscription",
                    Amount = $"{subscription.Currency ?? "USD"} {(subscription.Amount ?? 0m):0.##}",
                    Status = ResolveSubscriptionStatus(subscription),
                    RenewalDate = subscription.DueDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty
                }).ToList()
                : [],
            SystemLogs = auditLogs.Select(log => new AdminLogDto
            {
                Id = log.Id,
                Event = log.Action ?? "Audit event",
                Actor = users.FirstOrDefault(user => user.Id == log.UserId)?.FullName ?? "System",
                Target = $"{log.TableName}#{log.RecordId}",
                Level = "Info",
                Time = log.CreatedAt?.ToLocalTime().ToString("HH:mm", CultureInfo.InvariantCulture) ?? string.Empty
            }).ToList(),
            Dashboard = BuildDashboard(gyms, branches, members, payments, classes, todayCheckIns, subscriptionKpis, subscriptions)
        };

        return Ok(workspace);
    }

    [HttpPost("workflows/member-onboarding")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> CreateMemberOnboarding([FromBody] MemberOnboardingRequest request)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var currentUserId = GetCurrentUserId();
            if (currentUserId <= 0)
            {
                return Unauthorized();
            }

            var resolvedBranchId = request.HomeBranchId ?? request.BranchId ?? GetBranchIdClaim();
            if (!resolvedBranchId.HasValue)
            {
                return BadRequest(new { message = "A home branch is required for member onboarding." });
            }

            var branch = await _context.Branches.FirstOrDefaultAsync(item => item.Id == resolvedBranchId.Value && item.IsActive);
            if (branch == null)
            {
                return BadRequest(new { message = "Selected branch does not exist or is inactive." });
            }

            if (!CanAccessBranch(branch))
            {
                return Forbid();
            }

            if (!branch.GymId.HasValue)
            {
                return BadRequest(new { message = "Selected branch is not assigned to a gym." });
            }

            var planId = request.MembershipPlanId ?? request.PlanId;
            if (!planId.HasValue)
            {
                return BadRequest(new { message = "Membership plan is required." });
            }

            var plan = await _context.MembershipPlans.FirstOrDefaultAsync(item =>
                item.Id == planId.Value &&
                item.GymId == branch.GymId &&
                item.IsActive);
            if (plan == null)
            {
                return BadRequest(new { message = "Membership plan does not exist for the selected branch gym." });
            }

            var paymentAmount = request.PaymentAmount ?? request.Amount ?? 0m;
            if (paymentAmount < 0)
            {
                return BadRequest(new { message = "Payment amount cannot be negative." });
            }

            var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
            var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
            if (email != null && await _context.Members.AnyAsync(item => item.Email == email))
            {
                return Conflict(new { message = "A member with this email already exists." });
            }

            if (phone != null && await _context.Members.AnyAsync(item => item.Phone == phone))
            {
                return Conflict(new { message = "A member with this phone already exists." });
            }

            if (email != null && await _context.Users.AnyAsync(item => item.Email == email))
            {
                return Conflict(new { message = "A user with this email already exists." });
            }

            if (phone != null && await _context.Users.AnyAsync(item => item.Phone == phone))
            {
                return Conflict(new { message = "A user with this phone already exists." });
            }

            var memberRole = await _context.Roles.FirstOrDefaultAsync(item => item.Name == AppRoles.Member);
            if (memberRole == null)
            {
                memberRole = new Role { Name = AppRoles.Member };
                _context.Roles.Add(memberRole);
                await _context.SaveChangesAsync();
            }

            var temporaryPassword = $"FH-{Guid.NewGuid():N}"[..14];
            var memberUser = new User
            {
                GymId = branch.GymId.Value,
                BranchId = branch.Id,
                RoleId = memberRole.Id,
                FullName = request.FullName.Trim(),
                Email = email,
                Phone = phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(memberUser);
            await _context.SaveChangesAsync();

            var startDate = request.StartDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var member = new Member
            {
                GymId = branch.GymId.Value,
                HomeBranchId = branch.Id,
                UserId = memberUser.Id,
                FullName = request.FullName.Trim(),
                Gender = request.Gender,
                Dob = request.Dob,
                Email = email,
                Phone = phone,
                JoinDate = startDate,
                QrCode = $"FH-{Guid.NewGuid():N}"[..14],
                IsActive = true
            };

            _context.Members.Add(member);
            await _context.SaveChangesAsync();

            if (request.HeightCm.HasValue || request.WeightKg.HasValue || !string.IsNullOrWhiteSpace(request.FitnessGoal))
            {
                _context.MemberProfiles.Add(new MemberProfile
                {
                    MemberId = member.Id,
                    HeightCm = request.HeightCm,
                    WeightKg = request.WeightKg,
                    FitnessGoal = request.FitnessGoal,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            var membership = new MemberMembership
            {
                MemberId = member.Id,
                PlanId = plan.Id,
                StartDate = startDate,
                EndDate = startDate.AddMonths(plan.DurationMonths ?? 1),
                Status = AppStatuses.MembershipActive,
                FreezeDays = 0
            };

            _context.MemberMemberships.Add(membership);
            await _context.SaveChangesAsync();

            if (request.TrainerUserId.HasValue)
            {
                _context.TrainerSessions.Add(new TrainerSession
                {
                    TrainerUserId = request.TrainerUserId.Value,
                    MemberId = member.Id,
                    BranchId = branch.Id,
                    SessionType = "Member Assignment",
                    SessionDate = DateTime.UtcNow,
                    Notes = request.Notes ?? "Initial trainer assignment during onboarding."
                });
            }

            Payment? payment = null;
            if (paymentAmount > 0)
            {
                payment = new Payment
                {
                    GymId = branch.GymId.Value,
                    BranchId = branch.Id,
                    MemberId = member.Id,
                    MembershipId = membership?.Id,
                    ReceivedByUserId = currentUserId,
                    Amount = paymentAmount,
                    Method = request.PaymentMethod,
                    PaidAt = DateTime.UtcNow,
                    Notes = request.Notes
                };

                _context.Payments.Add(payment);
            }

            _context.AuditLogs.Add(new AuditLog
            {
                UserId = currentUserId,
                Action = "MEMBER_ONBOARDED",
                TableName = "members",
                RecordId = member.Id,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await CreateWorkflowNotification(
                branch.GymId.Value,
                branch.Id,
                "Member created",
                $"{member.FullName} was created and assigned to the gym workflow.",
                new[] { AppRoles.BranchManager, AppRoles.Staff, AppRoles.Trainer });
            await transaction.CommitAsync();

            string? membershipEndDate = null;
            if (membership!.EndDate is DateOnly endDate)
            {
                membershipEndDate = endDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            }

            return Ok(new
            {
                memberId = member.Id,
                fullName = member.FullName ?? string.Empty,
                email = member.Email ?? string.Empty,
                phone = member.Phone ?? string.Empty,
                userId = memberUser.Id,
                temporaryPassword,
                homeBranchId = member.HomeBranchId,
                membershipId = membership.Id,
                membershipStatus = membership.Status ?? AppStatuses.MembershipActive,
                membershipEndDate,
                paymentId = payment?.Id
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    [HttpGet("workflows/member-onboarding/options")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> GetMemberOnboardingOptions([FromQuery] long? gymId)
    {
        var branchesQuery = _context.Branches.Where(item => item.IsActive).AsQueryable();

        if (User.IsInRole(AppRoles.SuperAdmin))
        {
            if (gymId.HasValue)
            {
                branchesQuery = branchesQuery.Where(item => item.GymId == gymId.Value);
            }
        }
        else if (GetBranchIdClaim().HasValue && !User.IsInRole(AppRoles.GymOwner))
        {
            var branchId = GetBranchIdClaim()!.Value;
            branchesQuery = branchesQuery.Where(item => item.Id == branchId);
        }
        else if (GetGymIdClaim().HasValue)
        {
            var scopedGymId = GetGymIdClaim()!.Value;
            branchesQuery = branchesQuery.Where(item => item.GymId == scopedGymId);
        }
        else
        {
            branchesQuery = branchesQuery.Where(item => false);
        }

        var branches = await branchesQuery
            .OrderBy(item => item.Name)
            .Select(item => new MemberOnboardingBranchOptionDto
            {
                Id = item.Id,
                Name = item.Name,
                GymId = item.GymId
            })
            .ToListAsync();

        var branchGymIds = branches
            .Where(item => item.GymId.HasValue)
            .Select(item => item.GymId!.Value)
            .ToHashSet();

        var plans = await _context.MembershipPlans
            .Where(item => item.IsActive && item.GymId.HasValue && branchGymIds.Contains(item.GymId.Value))
            .OrderBy(item => item.Name)
            .Select(item => new MemberOnboardingPlanOptionDto
            {
                Id = item.Id,
                Name = item.Name ?? string.Empty,
                Price = item.Price,
                DurationMonths = item.DurationMonths,
                GymId = item.GymId
            })
            .ToListAsync();

        var trainerRoleIds = await _context.Roles
            .Where(item => item.Name == AppRoles.Trainer)
            .Select(item => item.Id)
            .ToListAsync();

        var branchIds = branches.Select(item => item.Id).ToHashSet();
        var trainers = await _context.Users
            .Where(item =>
                item.IsActive &&
                trainerRoleIds.Contains(item.RoleId) &&
                item.BranchId.HasValue &&
                branchIds.Contains(item.BranchId.Value))
            .OrderBy(item => item.FullName)
            .Select(item => new MemberOnboardingTrainerOptionDto
            {
                Id = item.Id,
                FullName = item.FullName ?? string.Empty,
                BranchId = item.BranchId,
                GymId = item.GymId
            })
            .ToListAsync();

        return Ok(new MemberOnboardingOptionsDto
        {
            Branches = branches,
            MembershipPlans = plans,
            Trainers = trainers
        });
    }

    [HttpPost("workflows/payment")]
    [Authorize(Roles = AppRoles.AdminOperatorRoles)]
    public async Task<IActionResult> ProcessPayment([FromBody] ProcessPaymentWorkflowRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var member = await _context.Members.FirstOrDefaultAsync(item => item.Id == request.MemberId);
            if (member == null)
            {
                return NotFound(new { message = "Member not found." });
            }

            if (!CanAccessMember(member))
            {
                return Forbid();
            }

            var payment = new Payment
            {
                GymId = request.GymId ?? member.GymId ?? GetGymIdClaim(),
                BranchId = request.BranchId ?? member.HomeBranchId ?? GetBranchIdClaim(),
                MemberId = member.Id,
                MembershipId = request.MembershipId,
                ReceivedByUserId = GetCurrentUserId(),
                Amount = request.Amount,
                Method = request.Method,
                PaidAt = DateTime.UtcNow,
                Notes = request.Notes
            };

            _context.Payments.Add(payment);

            if (string.Equals(request.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                var membership = await _context.MemberMemberships
                    .Where(item => item.MemberId == member.Id)
                    .OrderByDescending(item => item.StartDate)
                    .FirstOrDefaultAsync();

                if (membership != null)
                {
                    membership.Status = AppStatuses.MembershipActive;
                }
            }

            await _context.SaveChangesAsync();
            await CreateWorkflowNotification(
                payment.GymId,
                payment.BranchId,
                "Payment completed",
                $"{member.FullName} payment was recorded for ${payment.Amount ?? 0m:0.##}.",
                new[] { AppRoles.GymOwner, AppRoles.BranchManager, AppRoles.Staff });

            return Ok(new AdminPaymentDto
            {
                Id = payment.Id,
                MemberId = payment.MemberId,
                Member = member.FullName ?? "Member",
                AmountValue = payment.Amount,
                Amount = payment.Amount.HasValue ? $"${payment.Amount.Value:0.##}" : "$0",
                Method = payment.Method ?? "Card",
                Status = request.Status,
                At = payment.PaidAt?.ToLocalTime().ToString("hh:mm tt", CultureInfo.InvariantCulture) ?? string.Empty,
                GymId = payment.GymId,
                BranchId = payment.BranchId,
                PaidAt = payment.PaidAt
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.ToDetailedMessage() });
        }
    }

    private async Task CreateWorkflowNotification(long? gymId, long? branchId, string title, string message, IEnumerable<string> targetRoles)
    {
        var notification = new Notification
        {
            GymId = gymId,
            BranchId = branchId,
            Title = title,
            Message = message,
            CreatedByUserId = GetCurrentUserId(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        var recipientRoleSet = targetRoles.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var recipientIds = await _context.Users
            .Include(user => user.Role)
            .Where(user =>
                (!gymId.HasValue || user.GymId == gymId.Value) &&
                (!branchId.HasValue || user.BranchId == branchId.Value || user.BranchId == null) &&
                user.Role != null &&
                recipientRoleSet.Contains(user.Role.Name))
            .Select(user => user.Id)
            .ToListAsync();

        if (recipientIds.Count == 0)
        {
            return;
        }

        _context.NotificationRecipients.AddRange(recipientIds.Select(userId => new NotificationRecipient
        {
            NotificationId = notification.Id,
            UserId = userId,
            IsRead = false
        }));

        await _context.SaveChangesAsync();
    }

    private AdminUserDto ToAdminUser(User user, IReadOnlyCollection<Gym> gyms, IReadOnlyCollection<Branch> branches)
    {
        var ownedGym = gyms.FirstOrDefault(gym => gym.OwnerUserId == user.Id);
        var scopedGym = gyms.FirstOrDefault(gym => gym.Id == user.GymId);
        var activeGym = scopedGym ?? ownedGym;
        var gymName = activeGym?.Name ?? "Gymind";
        var branchName = branches.FirstOrDefault(branch => branch.Id == user.BranchId)?.Name ?? gymName;

        return new AdminUserDto
        {
            Id = user.Id,
            GymId = user.GymId ?? ownedGym?.Id,
            BranchId = user.BranchId,
            RoleId = user.RoleId,
            Name = user.FullName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            Phone = user.Phone ?? string.Empty,
            Role = user.Role?.Name ?? string.Empty,
            Title = user.Role?.Name ?? string.Empty,
            Workspace = branchName,
            IsActive = user.IsActive && (activeGym == null || activeGym.IsActive)
        };
    }

    private AdminDashboardDto BuildDashboard(
        IReadOnlyCollection<Gym> gyms,
        IReadOnlyCollection<Branch> branches,
        IReadOnlyCollection<Member> members,
        IReadOnlyCollection<Payment> payments,
        IReadOnlyCollection<GymClass> classes,
        IReadOnlyCollection<CheckIn> todayCheckIns,
        (decimal MonthlyPlatformRevenue, decimal PendingRevenue, int LatePayments) subscriptionKpis,
        IReadOnlyCollection<GymSubscription> subscriptions)
    {
        var totalRevenue = payments.Sum(payment => payment.Amount ?? 0m);
        var revenueTrend = BuildDailyRevenueTrend(payments, 7);
        var attendanceMix = BuildAttendanceMix(todayCheckIns, classes);
        var dashboard = new AdminDashboardDto();
        dashboard.Platform = new AdminDashboardRoleDto
        {
            Revenue = $"${totalRevenue:0.##}",
            Members = members.Count.ToString(CultureInfo.InvariantCulture),
            ActiveToday = todayCheckIns.Count.ToString(CultureInfo.InvariantCulture),
            Subscriptions = $"{gyms.Count(gym => gym.IsActive)} active",
            MonthlyPlatformRevenue = subscriptionKpis.MonthlyPlatformRevenue,
            PendingRevenue = subscriptionKpis.PendingRevenue,
            LatePayments = subscriptionKpis.LatePayments,
            MonthlyPlatformRevenueRows = BuildMonthlyPlatformRevenueRows(subscriptions),
            RevenueTrend = revenueTrend,
            GymPerformance = gyms.Select(gym => new AdminBarPointDto
            {
                Label = gym.Name ?? "Gym",
                Revenue = payments.Where(payment => payment.GymId == gym.Id).Sum(payment => payment.Amount ?? 0m),
                Members = members.Count(member => member.GymId == gym.Id)
            }).ToList()
        };
        dashboard.Owner = new AdminDashboardRoleDto
        {
            Revenue = $"${totalRevenue:0.##}",
            Members = members.Count.ToString(CultureInfo.InvariantCulture),
            ActiveToday = todayCheckIns.Count.ToString(CultureInfo.InvariantCulture),
            Conversion = "100%",
            RevenueTrend = revenueTrend,
            BranchTrend = branches.Select(branch => new AdminBarPointDto
            {
                Label = branch.Name ?? "Branch",
                Revenue = payments.Where(payment => payment.BranchId == branch.Id).Sum(payment => payment.Amount ?? 0m),
                Members = members.Count(member => member.HomeBranchId == branch.Id)
            }).ToList()
        };
        dashboard.Manager = new AdminDashboardRoleDto
        {
            Revenue = $"${payments.Where(payment => payment.BranchId.HasValue).Sum(payment => payment.Amount ?? 0m):0.##}",
            Members = members.Count.ToString(CultureInfo.InvariantCulture),
            ActiveToday = todayCheckIns.Count.ToString(CultureInfo.InvariantCulture),
            ClassesToday = classes.Count(item => item.StartTime?.Date == DateTime.UtcNow.Date).ToString(CultureInfo.InvariantCulture),
            RevenueTrend = revenueTrend,
            AttendanceMix = attendanceMix
        };
        dashboard.Staff = new AdminDashboardRoleDto
        {
            Revenue = $"${totalRevenue:0.##}",
            Members = members.Count.ToString(CultureInfo.InvariantCulture),
            ActiveToday = todayCheckIns.Count.ToString(CultureInfo.InvariantCulture),
            Tasks = Math.Max(1, members.Count(member => !member.IsActive)).ToString(CultureInfo.InvariantCulture)
        };
        dashboard.Trainer = new AdminDashboardRoleDto
        {
            Members = members.Count.ToString(CultureInfo.InvariantCulture),
            ClassesToday = classes.Count(item => item.StartTime?.Date == DateTime.UtcNow.Date).ToString(CultureInfo.InvariantCulture),
            ActiveToday = todayCheckIns.Count.ToString(CultureInfo.InvariantCulture)
        };
        return dashboard;
    }

    private static List<AdminPlatformRevenueRowDto> BuildMonthlyPlatformRevenueRows(IReadOnlyCollection<GymSubscription> subscriptions)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        return Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var date = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-(5 - offset));
                var nextMonth = date.AddMonths(1);
                var monthStart = DateOnly.FromDateTime(date);
                var nextMonthStart = DateOnly.FromDateTime(nextMonth);

                var paidSubscriptions = subscriptions
                    .Where(subscription =>
                        subscription.PaidAt.HasValue &&
                        subscription.PaidAt.Value >= date &&
                        subscription.PaidAt.Value < nextMonth)
                    .ToList();

                var unpaidSubscriptions = subscriptions
                    .Where(subscription =>
                        !subscription.PaidAt.HasValue &&
                        (subscription.Status == null || !subscription.Status.Equals("cancelled", StringComparison.OrdinalIgnoreCase)) &&
                        subscription.DueDate >= monthStart &&
                        subscription.DueDate < nextMonthStart &&
                        (subscription.DueDate >= today ||
                         (subscription.Status != null &&
                          (subscription.Status.Equals("pending", StringComparison.OrdinalIgnoreCase) ||
                           subscription.Status.Equals("due", StringComparison.OrdinalIgnoreCase) ||
                           subscription.Status.Equals("notice", StringComparison.OrdinalIgnoreCase)))))
                    .ToList();

                var lockedGyms = subscriptions
                    .Where(subscription =>
                        subscription.LockedAt.HasValue &&
                        subscription.LockedAt.Value >= date &&
                        subscription.LockedAt.Value < nextMonth &&
                        subscription.GymId.HasValue)
                    .Select(subscription => subscription.GymId!.Value)
                    .Distinct()
                    .Count();

                return new AdminPlatformRevenueRowDto
                {
                    Id = date.ToString("yyyy-MM", CultureInfo.InvariantCulture),
                    Month = date.ToString("MMM yyyy", CultureInfo.InvariantCulture),
                    PaidGyms = paidSubscriptions
                        .Where(subscription => subscription.GymId.HasValue)
                        .Select(subscription => subscription.GymId!.Value)
                        .Distinct()
                        .Count(),
                    Revenue = paidSubscriptions.Sum(subscription => subscription.Amount ?? 0m),
                    UnpaidAmount = unpaidSubscriptions.Sum(subscription => subscription.Amount ?? 0m),
                    LockedGyms = lockedGyms
                };
            })
            .ToList();
    }

    private async Task<(decimal MonthlyPlatformRevenue, decimal PendingRevenue, int LatePayments)> GetSubscriptionKpisAsync()
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextMonthStart = monthStart.AddMonths(1);
        var today = DateOnly.FromDateTime(now);

        var monthlyPlatformRevenue = await _context.GymSubscriptions
            .Where(subscription =>
                subscription.PaidAt.HasValue &&
                subscription.PaidAt.Value >= monthStart &&
                subscription.PaidAt.Value < nextMonthStart)
            .SumAsync(subscription => subscription.Amount ?? 0m);

        var pendingRevenue = await _context.GymSubscriptions
            .Where(subscription =>
                !subscription.PaidAt.HasValue &&
                (subscription.Status == null || subscription.Status.ToLower() != "cancelled") &&
                (subscription.DueDate >= today ||
                 subscription.Status != null &&
                 (subscription.Status.ToLower() == "pending" ||
                  subscription.Status.ToLower() == "due" ||
                  subscription.Status.ToLower() == "notice")))
            .SumAsync(subscription => subscription.Amount ?? 0m);

        var latePayments = await _context.GymSubscriptions
            .CountAsync(subscription =>
                !subscription.PaidAt.HasValue &&
                subscription.DueDate < today &&
                (subscription.Status == null || subscription.Status.ToLower() != "cancelled"));

        return (monthlyPlatformRevenue, pendingRevenue, latePayments);
    }

    private static List<int> BuildDailyRevenueTrend(IReadOnlyCollection<Payment> payments, int days)
    {
        return Enumerable.Range(0, days)
            .Select(offset =>
            {
                var day = DateTime.UtcNow.Date.AddDays(-(days - 1 - offset));
                var total = payments
                    .Where(payment => payment.PaidAt?.Date == day)
                    .Sum(payment => payment.Amount ?? 0m);
                return (int)Math.Round(total);
            })
            .ToList();
    }

    private static List<AdminPiePointDto> BuildAttendanceMix(
        IReadOnlyCollection<CheckIn> todayCheckIns,
        IReadOnlyCollection<GymClass> classes)
    {
        var bookedClassesToday = classes.Count(item => item.StartTime?.Date == DateTime.UtcNow.Date);
        var manual = todayCheckIns.Count(item => (item.Method ?? string.Empty).Contains("manual", StringComparison.OrdinalIgnoreCase));
        var qr = todayCheckIns.Count(item => (item.Method ?? string.Empty).Contains("qr", StringComparison.OrdinalIgnoreCase));

        return
        [
            new AdminPiePointDto { Label = "QR check-ins", Value = qr },
            new AdminPiePointDto { Label = "Manual check-ins", Value = manual },
            new AdminPiePointDto { Label = "Classes today", Value = bookedClassesToday }
        ];
    }

    private static string ResolveSubscriptionStatus(GymSubscription subscription)
    {
        if (!string.IsNullOrWhiteSpace(subscription.Status))
        {
            return subscription.Status;
        }

        if (subscription.PaidAt.HasValue)
        {
            return "Paid";
        }

        if (subscription.LockedAt.HasValue)
        {
            return "Locked";
        }

        if (subscription.DueDate.HasValue && subscription.DueDate.Value < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return subscription.NoticeStartedAt.HasValue ? "Notice" : "Overdue";
        }

        return "Active";
    }

    private long GetCurrentUserId()
    {
        return long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var value) ? value : 0L;
    }

    private bool CanAccessBranch(Branch branch)
    {
        if (User.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (User.IsInRole(AppRoles.GymOwner))
        {
            var claimGymId = GetGymIdClaim();
            return _context.Gyms.Any(gym => gym.Id == branch.GymId && (gym.OwnerUserId == GetCurrentUserId() || (claimGymId.HasValue && gym.Id == claimGymId.Value)));
        }

        if (User.IsInRole(AppRoles.BranchManager) || User.IsInRole(AppRoles.Staff))
        {
            return GetBranchIdClaim() == branch.Id;
        }

        return false;
    }

    private bool CanAccessMember(Member member)
    {
        if (User.IsInRole(AppRoles.SuperAdmin))
        {
            return true;
        }

        if (User.IsInRole(AppRoles.GymOwner))
        {
            var claimGymId = GetGymIdClaim();
            return _context.Gyms.Any(gym => gym.Id == member.GymId && (gym.OwnerUserId == GetCurrentUserId() || (claimGymId.HasValue && gym.Id == claimGymId.Value)));
        }

        if (User.IsInRole(AppRoles.BranchManager) || User.IsInRole(AppRoles.Staff))
        {
            return GetBranchIdClaim().HasValue && member.HomeBranchId == GetBranchIdClaim();
        }

        return false;
    }

    private long? GetGymIdClaim()
    {
        return long.TryParse(User.FindFirstValue("GymId"), out var value) ? value : null;
    }

    private long? GetBranchIdClaim()
    {
        return long.TryParse(User.FindFirstValue("BranchId"), out var value) ? value : null;
    }

    private static string InferNotificationType(string? title)
    {
        var normalized = title?.ToLowerInvariant() ?? string.Empty;
        if (normalized.Contains("payment"))
        {
            return "payment";
        }

        if (normalized.Contains("member"))
        {
            return "member";
        }

        if (normalized.Contains("class"))
        {
            return "class";
        }

        return "system";
    }
}
