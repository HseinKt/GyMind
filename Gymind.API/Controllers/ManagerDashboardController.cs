using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/manager/dashboard")]
[Authorize(Roles = AppRoles.BranchManager)]
public class ManagerDashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public ManagerDashboardController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<ManagerDashboardDto>> GetDashboard()
    {
        if (!_currentUser.BranchId.HasValue)
        {
            return Forbid();
        }

        var branchId = _currentUser.BranchId.Value;
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var tomorrowStart = todayStart.AddDays(1);
        var today = DateOnly.FromDateTime(now);
        var next7 = today.AddDays(7);
        var reportStart = todayStart.AddDays(-6);

        var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(item => item.Id == branchId);
        if (branch == null)
        {
            return Forbid();
        }

        // Fetch members with projection of only required fields + latest membership details
        var membersWithLatest = await _context.Members
            .Where(member => member.HomeBranchId == branchId)
            .Select(member => new
            {
                member.Id,
                member.FullName,
                member.Phone,
                member.HomeBranchId,
                member.JoinDate,
                member.IsActive,
                LatestMembership = _context.MemberMemberships
                    .Where(membership => membership.MemberId == member.Id)
                    .OrderByDescending(membership => membership.StartDate)
                    .ThenByDescending(membership => membership.Id)
                    .Select(membership => new { membership.Status, membership.EndDate, PlanName = membership.Plan != null ? membership.Plan.Name : "Unassigned" })
                    .FirstOrDefault()
            })
            .AsNoTracking()
            .ToListAsync();

        var latestMembershipByMember = membersWithLatest
            .Where(m => m.LatestMembership != null)
            .ToDictionary(m => m.Id, m => new Models.MemberMembership
            {
                Status = m.LatestMembership!.Status,
                EndDate = m.LatestMembership.EndDate,
                Plan = new Models.MembershipPlan { Name = m.LatestMembership.PlanName }
            });

        // Map projected objects to Member instances for compatibility with downstream logic
        var members = membersWithLatest.Select(m => new Models.Member
        {
            Id = m.Id,
            FullName = m.FullName,
            Phone = m.Phone,
            HomeBranchId = m.HomeBranchId,
            JoinDate = m.JoinDate,
            IsActive = m.IsActive
        }).ToList();

        var checkIns = await _context.CheckIns
            .Include(checkIn => checkIn.Member)
            .Where(checkIn => checkIn.BranchId == branchId && checkIn.CheckInTime >= reportStart)
            .AsNoTracking()
            .ToListAsync();
        var openCheckIns = await _context.CheckIns
            .Include(checkIn => checkIn.Member)
            .Where(checkIn => checkIn.BranchId == branchId && !checkIn.CheckOutTime.HasValue)
            .AsNoTracking()
            .ToListAsync();
        var todaysCheckIns = checkIns
            .Where(checkIn => checkIn.CheckInTime >= todayStart && checkIn.CheckInTime < tomorrowStart)
            .ToList();
        var currentCheckIns = openCheckIns;

        var payments = await _context.Payments
            .Include(payment => payment.Member)
            .Include(payment => payment.Membership)
                .ThenInclude(membership => membership!.Plan)
            .Include(payment => payment.ReceivedByUser)
            .Where(payment => payment.BranchId == branchId && payment.PaidAt >= reportStart)
            .AsNoTracking()
            .ToListAsync();
        var todaysPayments = payments
            .Where(payment => payment.PaidAt >= todayStart && payment.PaidAt < tomorrowStart)
            .ToList();

        var classes = await _context.Classes
            .Where(item => item.BranchId == branchId && item.StartTime >= todayStart && item.StartTime < tomorrowStart)
            .AsNoTracking()
            .ToListAsync();
        var classIds = classes.Select(item => item.Id).ToHashSet();
        var classBookings = await _context.ClassBookings
            .Where(booking => booking.ClassId.HasValue && classIds.Contains(booking.ClassId.Value))
            .AsNoTracking()
            .ToListAsync();
        var trainerIds = classes.Where(item => item.TrainerUserId.HasValue).Select(item => item.TrainerUserId!.Value).ToHashSet();
        var trainers = await _context.Users
            .Where(user => trainerIds.Contains(user.Id))
            .AsNoTracking()
            .ToDictionaryAsync(user => user.Id, user => user.FullName ?? "Trainer");

        var users = await _context.Users
            .Include(user => user.Role)
            .Where(user => user.BranchId == branchId)
            .AsNoTracking()
            .ToListAsync();
        var employees = await _context.Employees
            .Where(employee => employee.BranchId == branchId)
            .AsNoTracking()
            .ToListAsync();
        var employeeUserIds = employees.Where(employee => employee.UserId.HasValue).Select(employee => employee.UserId!.Value).ToHashSet();
        var teamUsers = users.Where(user =>
            employeeUserIds.Contains(user.Id) ||
            string.Equals(user.Role?.Name, AppRoles.Staff, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(user.Role?.Name, AppRoles.Trainer, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(user.Role?.Name, AppRoles.BranchManager, StringComparison.OrdinalIgnoreCase)).ToList();

        var checkInRecords = todaysCheckIns
            .OrderByDescending(checkIn => checkIn.CheckInTime)
            .Select(checkIn => ToCheckInRecord(checkIn, latestMembershipByMember.GetValueOrDefault(checkIn.MemberId ?? 0), now))
            .ToList();
        var currentlyInside = currentCheckIns
            .OrderBy(checkIn => checkIn.CheckInTime)
            .Select(checkIn =>
            {
                var record = ToCheckInRecord(checkIn, latestMembershipByMember.GetValueOrDefault(checkIn.MemberId ?? 0), now);
                return new ManagerCurrentlyInsideDto
                {
                    CheckInId = record.CheckInId,
                    MemberId = record.MemberId,
                    MemberName = record.MemberName,
                    Phone = record.Phone,
                    CheckInTime = record.CheckInTime,
                    CheckOutTime = record.CheckOutTime,
                    Duration = record.Duration,
                    MembershipPlan = record.MembershipPlan,
                    MembershipStatus = record.MembershipStatus,
                    CheckedInBy = record.CheckedInBy,
                    CheckInMethod = record.CheckInMethod,
                    Status = record.Status
                };
            }).ToList();

        var attendanceByHour = Enumerable.Range(0, 24)
            .Select(hour =>
            {
                var hourStart = todayStart.AddHours(hour);
                var hourEnd = hourStart.AddHours(1);
                return new ManagerAttendanceHourDto
                {
                    Hour = hourStart.ToString("HH:00"),
                    CheckIns = todaysCheckIns.Count(checkIn => checkIn.CheckInTime >= hourStart && checkIn.CheckInTime < hourEnd)
                };
            })
            .ToList();
        var peakHour = attendanceByHour.OrderByDescending(item => item.CheckIns).FirstOrDefault();
        var capacity = branch.Capacity ?? 0;
        var capacityPercent = capacity > 0 ? Math.Round(currentlyInside.Count * 100m / capacity, 1) : 0m;
        var suspicious = BuildSuspiciousCheckIns(todaysCheckIns, latestMembershipByMember, today);
        var classesToday = classes
            .OrderBy(item => item.StartTime)
            .Select(item =>
            {
                var bookings = classBookings.Where(booking => booking.ClassId == item.Id && !IsCancelled(booking.Status)).ToList();
                return new ManagerClassTodayDto
                {
                    ClassId = item.Id,
                    ClassName = item.Name ?? "Class",
                    TrainerName = item.TrainerUserId.HasValue && trainers.TryGetValue(item.TrainerUserId.Value, out var trainerName) ? trainerName : "Unassigned",
                    StartTime = item.StartTime,
                    EndTime = item.EndTime,
                    Capacity = item.Capacity ?? 0,
                    BookedMembersCount = bookings.Count,
                    AttendedMembersCount = bookings.Count(booking => booking.Attended),
                    Status = item.StartTime <= now && item.EndTime >= now ? "In progress" : item.StartTime > now ? "Scheduled" : "Completed"
                };
            }).ToList();

        var expiringMemberships = members
            .Select(member => new { Member = member, Membership = latestMembershipByMember.GetValueOrDefault(member.Id) })
            .Where(item => item.Membership?.EndDate >= today && item.Membership.EndDate <= next7 || IsExpiredMembership(item.Membership, today))
            .OrderBy(item => item.Membership?.EndDate)
            .Select(item => new ManagerExpiringMembershipDto
            {
                MemberId = item.Member.Id,
                MemberName = item.Member.FullName ?? "Member",
                Phone = item.Member.Phone ?? string.Empty,
                MembershipPlan = item.Membership?.Plan?.Name ?? "Unassigned",
                ExpiryDate = item.Membership?.EndDate,
                DaysLeft = item.Membership?.EndDate is DateOnly endDate ? endDate.DayNumber - today.DayNumber : 0,
                LastCheckIn = checkIns.Where(checkIn => checkIn.MemberId == item.Member.Id).OrderByDescending(checkIn => checkIn.CheckInTime).Select(checkIn => checkIn.CheckInTime).FirstOrDefault(),
                Status = IsExpiredMembership(item.Membership, today) ? "Expired" : "Expiring soon"
            }).ToList();

        var paymentRecords = todaysPayments
            .OrderByDescending(payment => payment.PaidAt)
            .Select(payment => new ManagerPaymentRecordDto
            {
                PaymentId = payment.Id,
                MemberName = payment.Member?.FullName ?? "Member",
                MembershipPlan = payment.Membership?.Plan?.Name ?? "Unassigned",
                Amount = payment.Amount ?? 0m,
                PaymentMethod = string.IsNullOrWhiteSpace(payment.Method) ? "Unknown" : payment.Method,
                PaymentTime = payment.PaidAt,
                RecordedByStaff = payment.ReceivedByUser?.FullName ?? "System"
            }).ToList();

        var teamActivity = BuildTeamActivity(teamUsers, payments, todaysCheckIns);

        return Ok(new ManagerDashboardDto
        {
            BranchInfo = new ManagerBranchInfoDto { BranchId = branch.Id, BranchName = branch.Name, Capacity = capacity },
            Kpis = new ManagerDashboardKpisDto
            {
                CurrentlyInside = currentlyInside.Count,
                TodaysAttendance = todaysCheckIns.Count,
                PaymentsToday = todaysPayments.Sum(payment => payment.Amount ?? 0m),
                ClassesToday = classesToday.Count,
                ExpiringMemberships = expiringMemberships.Count,
                SuspiciousCheckIns = suspicious.Count
            },
            LiveStatus = new ManagerLiveStatusDto
            {
                BranchName = branch.Name,
                CurrentCheckIns = currentlyInside.Count,
                BranchCapacity = capacity,
                CapacityPercentage = capacityPercent,
                LastCheckInTime = todaysCheckIns.OrderByDescending(checkIn => checkIn.CheckInTime).Select(checkIn => checkIn.CheckInTime).FirstOrDefault(),
                PeakHourToday = peakHour is { CheckIns: > 0 } ? peakHour.Hour : "No check-ins yet"
            },
            AttendanceByHour = attendanceByHour,
            CheckInRecords = checkInRecords,
            CurrentlyInside = currentlyInside,
            PaymentsToday = new ManagerPaymentsTodayDto
            {
                TotalPaymentsToday = todaysPayments.Sum(payment => payment.Amount ?? 0m),
                PaymentCountToday = todaysPayments.Count,
                CashPaymentsTotal = todaysPayments.Where(payment => IsPaymentMethod(payment.Method, "cash")).Sum(payment => payment.Amount ?? 0m),
                CardPaymentsTotal = todaysPayments.Where(payment => IsPaymentMethod(payment.Method, "card")).Sum(payment => payment.Amount ?? 0m),
                DayPassRevenue = todaysPayments.Where(payment => Contains(payment.Notes, "day pass") || Contains(payment.Method, "day pass")).Sum(payment => payment.Amount ?? 0m),
                MembershipRenewalRevenue = todaysPayments.Where(payment => payment.MembershipId.HasValue).Sum(payment => payment.Amount ?? 0m)
            },
            PaymentsByMethod = BuildPaymentBuckets(todaysPayments, payment => string.IsNullOrWhiteSpace(payment.Method) ? "Unknown" : payment.Method),
            PaymentsByPlan = BuildPaymentBuckets(todaysPayments, payment => payment.Membership?.Plan?.Name ?? "Unassigned"),
            PaymentRecords = paymentRecords,
            ExpiringMemberships = expiringMemberships,
            SuspiciousCheckIns = suspicious,
            ClassesToday = classesToday,
            TeamSummary = new ManagerTeamSummaryDto
            {
                TotalStaff = teamActivity.Count(item => string.Equals(item.Role, AppRoles.Staff, StringComparison.OrdinalIgnoreCase)),
                TotalTrainers = teamActivity.Count(item => string.Equals(item.Role, AppRoles.Trainer, StringComparison.OrdinalIgnoreCase)),
                ActiveEmployees = teamActivity.Count(item => item.Status == "Active"),
                InactiveEmployees = teamActivity.Count(item => item.Status == "Inactive")
            },
            TeamActivity = teamActivity,
            BranchReports = new ManagerBranchReportsDto
            {
                AttendanceByDay = BuildDailyCounts(reportStart, todayStart, checkIns, item => item.CheckInTime),
                RevenueByDay = BuildDailyRevenue(reportStart, todayStart, payments),
                PaymentsByMethod = BuildPaymentBuckets(payments, payment => string.IsNullOrWhiteSpace(payment.Method) ? "Unknown" : payment.Method),
                MembershipRenewals = BuildDailyCounts(reportStart, todayStart, payments.Where(payment => payment.MembershipId.HasValue), item => item.PaidAt),
                ClassAttendance = BuildDailyCounts(reportStart, todayStart, classBookings.Where(booking => booking.Attended), item => item.AttendedAt),
                PeakHours = attendanceByHour
            }
        });
    }

    private static ManagerCheckInRecordDto ToCheckInRecord(CheckIn checkIn, MemberMembership? membership, DateTime now)
    {
        return new ManagerCheckInRecordDto
        {
            CheckInId = checkIn.Id,
            MemberId = checkIn.MemberId,
            MemberName = checkIn.Member?.FullName ?? "Member",
            Phone = checkIn.Member?.Phone ?? string.Empty,
            CheckInTime = checkIn.CheckInTime,
            CheckOutTime = checkIn.CheckOutTime,
            Duration = FormatDuration(checkIn.CheckInTime, checkIn.CheckOutTime ?? now),
            MembershipPlan = membership?.Plan?.Name ?? "Unassigned",
            MembershipStatus = membership?.Status ?? "Unknown",
            CheckedInBy = MethodLabel(checkIn.Method),
            CheckInMethod = MethodLabel(checkIn.Method),
            Status = checkIn.CheckOutTime.HasValue ? "Checked out" : "Currently inside"
        };
    }

    private static List<ManagerSuspiciousCheckInDto> BuildSuspiciousCheckIns(List<CheckIn> todaysCheckIns, Dictionary<long, MemberMembership> latestMembershipByMember, DateOnly today)
    {
        var rows = new List<ManagerSuspiciousCheckInDto>();
        foreach (var group in todaysCheckIns.Where(item => item.MemberId.HasValue).GroupBy(item => item.MemberId!.Value))
        {
            var active = group.Where(item => !item.CheckOutTime.HasValue).ToList();
            if (active.Count > 1)
            {
                rows.Add(ToSuspicious(active.OrderByDescending(item => item.CheckInTime).First(), "Same member has multiple open check-ins"));
            }

            if (group.Count() > 1)
            {
                rows.Add(ToSuspicious(group.OrderByDescending(item => item.CheckInTime).First(), "Same member checked in multiple times today"));
            }

            var membership = latestMembershipByMember.GetValueOrDefault(group.Key);
            if (IsExpiredMembership(membership, today))
            {
                rows.Add(ToSuspicious(group.OrderByDescending(item => item.CheckInTime).First(), "Expired membership check-in"));
            }
        }

        return rows
            .GroupBy(item => $"{item.CheckInId}-{item.Issue}")
            .Select(group => group.First())
            .OrderByDescending(item => item.Time)
            .ToList();
    }

    private static ManagerSuspiciousCheckInDto ToSuspicious(CheckIn checkIn, string issue) => new()
    {
        CheckInId = checkIn.Id,
        MemberId = checkIn.MemberId,
        MemberName = checkIn.Member?.FullName ?? "Member",
        Issue = issue,
        Time = checkIn.CheckInTime,
        Staff = MethodLabel(checkIn.Method),
        Status = checkIn.CheckOutTime.HasValue ? "Closed" : "Open"
    };

    private static List<ManagerTeamActivityDto> BuildTeamActivity(List<User> users, List<Payment> payments, List<CheckIn> todaysCheckIns)
    {
        return users.Select(user => new ManagerTeamActivityDto
        {
            EmployeeId = user.Id,
            EmployeeName = user.FullName ?? "Employee",
            Role = user.Role?.Name ?? "Employee",
            Phone = user.Phone ?? string.Empty,
            Status = user.IsActive ? "Active" : "Inactive",
            PaymentsRecordedToday = payments.Count(payment => payment.ReceivedByUserId == user.Id),
            CheckInsHandledToday = 0,
            ManualCheckOutsToday = todaysCheckIns.Count(checkIn => checkIn.CheckOutMethod != null && checkIn.CheckOutMethod.Contains("manual", StringComparison.OrdinalIgnoreCase))
        }).OrderBy(item => item.Role).ThenBy(item => item.EmployeeName).ToList();
    }

    private static List<ManagerPaymentBucketDto> BuildPaymentBuckets(IEnumerable<Payment> payments, Func<Payment, string> keySelector) =>
        payments
            .GroupBy(keySelector)
            .Select(group => new ManagerPaymentBucketDto
            {
                Name = group.Key,
                Revenue = group.Sum(payment => payment.Amount ?? 0m),
                Count = group.Count()
            })
            .OrderByDescending(item => item.Revenue)
            .ToList();

    private static List<ManagerDailyMetricDto> BuildDailyCounts<T>(DateTime start, DateTime todayStart, IEnumerable<T> rows, Func<T, DateTime?> dateSelector)
    {
        return Enumerable.Range(0, 7).Select(offset =>
        {
            var day = start.AddDays(offset);
            var next = day.AddDays(1);
            return new ManagerDailyMetricDto
            {
                Date = day.ToString("yyyy-MM-dd"),
                Count = rows.Count(row => dateSelector(row) >= day && dateSelector(row) < next)
            };
        }).ToList();
    }

    private static List<ManagerDailyRevenueDto> BuildDailyRevenue(DateTime start, DateTime todayStart, IEnumerable<Payment> payments)
    {
        return Enumerable.Range(0, 7).Select(offset =>
        {
            var day = start.AddDays(offset);
            var next = day.AddDays(1);
            return new ManagerDailyRevenueDto
            {
                Date = day.ToString("yyyy-MM-dd"),
                Revenue = payments.Where(payment => payment.PaidAt >= day && payment.PaidAt < next).Sum(payment => payment.Amount ?? 0m)
            };
        }).ToList();
    }

    private static bool IsExpiredMembership(MemberMembership? membership, DateOnly today) =>
        membership == null ||
        string.Equals(AppStatuses.NormalizeMembership(membership.Status), AppStatuses.MembershipExpired, StringComparison.Ordinal) ||
        (membership.EndDate.HasValue && membership.EndDate.Value < today);

    private static string FormatDuration(DateTime? start, DateTime? end)
    {
        if (!start.HasValue || !end.HasValue || end.Value < start.Value) return "Not available";
        var duration = end.Value - start.Value;
        if (duration.TotalHours >= 1) return $"{(int)duration.TotalHours}h {duration.Minutes}m";
        return $"{Math.Max(0, duration.Minutes)}m";
    }

    private static string MethodLabel(string? value) => string.IsNullOrWhiteSpace(value) ? "Front desk" : value.Replace("_", " ");
    private static bool IsCancelled(string? value) => value?.Contains("cancel", StringComparison.OrdinalIgnoreCase) == true;
    private static bool Contains(string? value, string token) => value?.Contains(token, StringComparison.OrdinalIgnoreCase) == true;
    private static bool IsPaymentMethod(string? value, string token) => value?.Contains(token, StringComparison.OrdinalIgnoreCase) == true;
}
