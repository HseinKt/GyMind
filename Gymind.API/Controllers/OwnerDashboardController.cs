using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/owner/dashboard")]
[Authorize(Roles = AppRoles.GymOwner)]
public class OwnerDashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICurrentUser _currentUser;

    public OwnerDashboardController(ApplicationDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<OwnerDashboardDto>> GetDashboard()
    {
        var gymId = await ResolveOwnerGymIdAsync();
        if (!gymId.HasValue)
        {
            return Forbid();
        }

        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var tomorrowStart = todayStart.AddDays(1);
        var last7Start = todayStart.AddDays(-6);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var today = DateOnly.FromDateTime(now);
        var next7 = today.AddDays(7);

        var branches = await _context.Branches
            .Where(branch => branch.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();
        var branchIds = branches.Select(branch => branch.Id).ToHashSet();
        var branchNameById = branches.ToDictionary(branch => branch.Id, branch => branch.Name);

        // Fetch members with projection of only required fields + latest membership details
        var membersWithLatest = await _context.Members
            .Where(member => member.GymId == gymId.Value)
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
                    .Select(membership => new { membership.Status, membership.EndDate, membership.PlanId, PlanName = membership.Plan != null ? membership.Plan.Name : "Unassigned" })
                    .FirstOrDefault()
            })
            .AsNoTracking()
            .ToListAsync();

        var plans = await _context.MembershipPlans
            .Where(plan => plan.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();

        // Query only payments from the last 30 days or start of the month, whichever is earlier
        var queryStart = monthStart < last7Start ? monthStart : last7Start;
        var recentPayments = await _context.Payments
            .Include(payment => payment.Member)
            .Include(payment => payment.Branch)
            .Include(payment => payment.Membership)
                .ThenInclude(membership => membership!.Plan)
            .Include(payment => payment.ReceivedByUser)
            .Where(payment => payment.GymId == gymId.Value && payment.PaidAt >= queryStart && payment.PaidAt < tomorrowStart)
            .AsNoTracking()
            .ToListAsync();

        // Calculate rolling KPIs from recent payments
        var revenueToday = recentPayments.Where(payment => payment.PaidAt >= todayStart && payment.PaidAt < tomorrowStart).Sum(payment => payment.Amount ?? 0m);
        var revenueLast7Days = recentPayments.Where(payment => payment.PaidAt >= last7Start && payment.PaidAt < tomorrowStart).Sum(payment => payment.Amount ?? 0m);
        var revenueThisMonth = recentPayments.Where(payment => payment.PaidAt >= monthStart && payment.PaidAt < tomorrowStart).Sum(payment => payment.Amount ?? 0m);

        // All-time payment aggregates calculated directly in the database
        var paymentsByBranch = await _context.Payments
            .Where(p => p.GymId == gymId.Value && p.BranchId.HasValue)
            .GroupBy(p => p.BranchId!.Value)
            .Select(g => new { BranchId = g.Key, TotalRevenue = g.Sum(p => p.Amount ?? 0m) })
            .ToDictionaryAsync(x => x.BranchId, x => x.TotalRevenue);

        var planPaymentsSummary = await _context.Payments
            .Where(p => p.GymId == gymId.Value && p.Membership != null && p.Membership.PlanId.HasValue)
            .GroupBy(p => p.Membership!.PlanId!.Value)
            .Select(g => new { PlanId = g.Key, Count = g.Count(), TotalRevenue = g.Sum(p => p.Amount ?? 0m) })
            .ToDictionaryAsync(x => x.PlanId, x => x);

        var revenueByPaymentMethod = await _context.Payments
            .Where(p => p.GymId == gymId.Value)
            .GroupBy(p => string.IsNullOrWhiteSpace(p.Method) ? "Unknown" : p.Method)
            .Select(g => new OwnerRevenueBucketDto
            {
                Name = g.Key,
                Revenue = g.Sum(p => p.Amount ?? 0m),
                Count = g.Count()
            })
            .OrderByDescending(row => row.Revenue)
            .ToListAsync();

        var revenueByMembershipPlan = await _context.Payments
            .Where(p => p.GymId == gymId.Value && p.Membership != null && p.Membership.Plan != null)
            .GroupBy(p => p.Membership!.Plan!.Name)
            .Select(g => new OwnerRevenueBucketDto
            {
                Name = g.Key ?? "Unassigned",
                Revenue = g.Sum(p => p.Amount ?? 0m),
                Count = g.Count()
            })
            .OrderByDescending(row => row.Revenue)
            .ToListAsync();

        var paymentsRecordedByStaff = await _context.Payments
            .Where(p => p.GymId == gymId.Value && p.ReceivedByUserId.HasValue)
            .GroupBy(p => p.ReceivedByUserId!.Value)
            .Select(g => new { StaffId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.StaffId, x => x.Count);

        // Occupancy check-in aggregates calculated directly in the database
        var activeCheckInsByBranch = await _context.CheckIns
            .Where(c => c.BranchId.HasValue && branchIds.Contains(c.BranchId.Value) && (!c.CheckOutTime.HasValue || c.CheckOutTime.Value > now))
            .GroupBy(c => c.BranchId!.Value)
            .Select(g => new { BranchId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BranchId, x => x.Count);

        var todayCheckInsByBranch = await _context.CheckIns
            .Where(c => c.BranchId.HasValue && branchIds.Contains(c.BranchId.Value) && c.CheckInTime >= todayStart && c.CheckInTime < tomorrowStart)
            .GroupBy(c => c.BranchId!.Value)
            .Select(g => new { BranchId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BranchId, x => x.Count);

        // In-memory member counts on optimized projected list
        var activeMembers = membersWithLatest.Count(m =>
            m.IsActive &&
            m.LatestMembership != null &&
            m.LatestMembership.Status == "ACTIVE" &&
            (!m.LatestMembership.EndDate.HasValue || m.LatestMembership.EndDate.Value >= today));

        var expiredMembersList = membersWithLatest
            .Where(m => !m.IsActive ||
                        m.LatestMembership == null ||
                        m.LatestMembership.Status == "EXPIRED" ||
                        (m.LatestMembership.EndDate.HasValue && m.LatestMembership.EndDate.Value < today))
            .ToList();

        var expiredMembers = expiredMembersList.Count;
        var newMembersThisMonth = membersWithLatest.Count(m => m.JoinDate.HasValue && m.JoinDate.Value >= DateOnly.FromDateTime(monthStart));

        var paymentRecords = recentPayments
            .OrderByDescending(payment => payment.PaidAt ?? DateTime.MinValue)
            .Select(payment => new OwnerPaymentRecordDto
            {
                PaymentId = payment.Id,
                MemberName = payment.Member?.FullName ?? "Member",
                Branch = payment.Branch?.Name ?? "Unassigned",
                MembershipPlan = payment.Membership?.Plan?.Name ?? "Unassigned",
                Amount = payment.Amount ?? 0m,
                PaymentMethod = string.IsNullOrWhiteSpace(payment.Method) ? "Unknown" : payment.Method,
                PaidAt = payment.PaidAt,
                RecordedByStaff = payment.ReceivedByUser?.FullName ?? "System"
            })
            .ToList();

        var revenueTrend = Enumerable.Range(0, 7)
            .Select(offset => last7Start.AddDays(offset))
            .Select(day =>
            {
                var nextDay = day.AddDays(1);
                var dayPayments = recentPayments.Where(payment => payment.PaidAt >= day && payment.PaidAt < nextDay).ToList();
                return new OwnerRevenueTrendDto
                {
                    Date = day.ToString("yyyy-MM-dd"),
                    Revenue = dayPayments.Sum(payment => payment.Amount ?? 0m),
                    PaymentCount = dayPayments.Count
                };
            })
            .ToList();

        var branchPerformance = branches.Select(branch =>
        {
            var branchMembers = membersWithLatest.Where(member => member.HomeBranchId == branch.Id).ToList();
            var currentCheckIns = activeCheckInsByBranch.GetValueOrDefault(branch.Id);
            var capacity = branch.Capacity ?? 0;
            var capacityPercent = capacity > 0 ? Math.Round(currentCheckIns * 100m / capacity, 1) : 0m;
            
            var branchActive = branchMembers.Count(m =>
                m.IsActive &&
                m.LatestMembership != null &&
                m.LatestMembership.Status == "ACTIVE" &&
                (!m.LatestMembership.EndDate.HasValue || m.LatestMembership.EndDate.Value >= today));
            
            var branchExpired = branchMembers.Count(m =>
                !m.IsActive ||
                m.LatestMembership == null ||
                m.LatestMembership.Status == "EXPIRED" ||
                (m.LatestMembership.EndDate.HasValue && m.LatestMembership.EndDate.Value < today));

            return new OwnerBranchPerformanceDto
            {
                BranchId = branch.Id,
                Branch = branch.Name,
                Revenue = paymentsByBranch.GetValueOrDefault(branch.Id),
                ActiveMembers = branchActive,
                ExpiredMembers = branchExpired,
                CheckInsToday = todayCheckInsByBranch.GetValueOrDefault(branch.Id),
                Capacity = capacity,
                CurrentCheckIns = currentCheckIns,
                CapacityPercent = capacityPercent,
                Status = CapacityStatus(capacityPercent)
            };
        }).ToList();

        var membersByBranch = branchPerformance.Select(row => new OwnerMembersByBranchDto
        {
            BranchId = row.BranchId,
            Branch = row.Branch,
            TotalMembers = membersWithLatest.Count(member => member.HomeBranchId == row.BranchId),
            ActiveMembers = row.ActiveMembers,
            ExpiredMembers = row.ExpiredMembers,
            NewMembersThisMonth = membersWithLatest.Count(member => member.HomeBranchId == row.BranchId && member.JoinDate.HasValue && member.JoinDate.Value >= DateOnly.FromDateTime(monthStart))
        }).ToList();

        var expiredMemberIds = expiredMembersList.Select(m => m.Id).ToHashSet();
        var lastCheckInByMember = await _context.CheckIns
            .Where(c => c.MemberId.HasValue && expiredMemberIds.Contains(c.MemberId.Value))
            .GroupBy(c => c.MemberId!.Value)
            .Select(g => new { MemberId = g.Key, LastCheckIn = g.Max(c => c.CheckInTime) })
            .ToDictionaryAsync(x => x.MemberId, x => x.LastCheckIn);

        var expiredMemberRecords = expiredMembersList
            .Select(m => new OwnerExpiredMemberDto
            {
                MemberId = m.Id,
                MemberName = m.FullName ?? "Member",
                Phone = m.Phone ?? string.Empty,
                Branch = m.HomeBranchId.HasValue && branchNameById.TryGetValue(m.HomeBranchId.Value, out var branchName) ? branchName : "Unassigned",
                MembershipPlan = m.LatestMembership?.PlanName ?? "Unassigned",
                ExpiryDate = m.LatestMembership?.EndDate,
                DaysExpired = m.LatestMembership?.EndDate.HasValue == true ? Math.Max(0, today.DayNumber - m.LatestMembership.EndDate.Value.DayNumber) : 0,
                LastCheckIn = lastCheckInByMember.GetValueOrDefault(m.Id)
            })
            .OrderByDescending(member => member.DaysExpired)
            .ToList();

        var paymentCountOverTime = revenueTrend.Select(item => new OwnerPaymentCountTrendDto
        {
            Date = item.Date,
            Count = item.PaymentCount
        }).ToList();

        var planPerformance = plans.Select(plan =>
        {
            var planSummary = planPaymentsSummary.GetValueOrDefault(plan.Id);
            var activeCount = membersWithLatest.Count(m =>
                m.IsActive &&
                m.LatestMembership != null &&
                m.LatestMembership.PlanId == plan.Id &&
                m.LatestMembership.Status == "ACTIVE" &&
                (!m.LatestMembership.EndDate.HasValue || m.LatestMembership.EndDate.Value >= today));

            return new OwnerPlanPerformanceDto
            {
                PlanId = plan.Id,
                PlanName = plan.Name ?? "Membership Plan",
                Price = plan.Price ?? 0m,
                SalesCount = planSummary?.Count ?? 0,
                TotalRevenue = planSummary?.TotalRevenue ?? 0m,
                ActiveMembersUsingPlan = activeCount
            };
        }).ToList();

        var users = await _context.Users
            .Include(user => user.Role)
            .Include(user => user.Branch)
            .Where(user => user.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();
        var employees = await _context.Employees
            .Where(employee => employee.GymId == gymId.Value)
            .AsNoTracking()
            .ToListAsync();

        var employeeRows = BuildEmployees(users, employees, branchNameById, paymentsRecordedByStaff);
        
        var expiringSoon = membersWithLatest.Count(m =>
            m.IsActive &&
            m.LatestMembership != null &&
            m.LatestMembership.Status == "ACTIVE" &&
            m.LatestMembership.EndDate.HasValue &&
            m.LatestMembership.EndDate.Value >= today &&
            m.LatestMembership.EndDate.Value <= next7);

        return Ok(new OwnerDashboardDto
        {
            RevenueToday = revenueToday,
            RevenueLast7Days = revenueLast7Days,
            RevenueThisMonth = revenueThisMonth,
            ActiveMembers = activeMembers,
            ExpiredMembers = expiredMembers,
            NewMembersThisMonth = newMembersThisMonth,
            RevenueTrend = revenueTrend,
            PaymentRecords = paymentRecords,
            BranchPerformance = branchPerformance,
            MembersByBranch = membersByBranch,
            ActiveVsExpired = new OwnerActiveVsExpiredDto { ActiveMembers = activeMembers, ExpiredMembers = expiredMembers },
            BranchCapacity = branchPerformance.Select(row => new OwnerBranchCapacityDto
            {
                BranchId = row.BranchId,
                Branch = row.Branch,
                CurrentCheckIns = row.CurrentCheckIns,
                Capacity = row.Capacity,
                CapacityPercent = row.CapacityPercent,
                LastUpdated = now
            }).ToList(),
            ExpiredMemberRecords = expiredMemberRecords,
            PaymentsOverview = new OwnerPaymentsOverviewDto
            {
                RevenueByPaymentMethod = revenueByPaymentMethod,
                RevenueByMembershipPlan = revenueByMembershipPlan,
                PaymentCountOverTime = paymentCountOverTime
            },
            PlanPerformance = planPerformance,
            TeamSummary = new OwnerTeamSummaryDto
            {
                TotalManagers = employeeRows.Count(employee => employee.Role.Contains("Manager", StringComparison.OrdinalIgnoreCase)),
                TotalStaff = employeeRows.Count(employee => employee.Role.Equals(AppRoles.Staff, StringComparison.OrdinalIgnoreCase) || employee.Role.Contains("Staff", StringComparison.OrdinalIgnoreCase)),
                TotalTrainers = employeeRows.Count(employee => employee.Role.Equals(AppRoles.Trainer, StringComparison.OrdinalIgnoreCase) || employee.Role.Contains("Trainer", StringComparison.OrdinalIgnoreCase)),
                ActiveEmployees = employeeRows.Count(employee => employee.Status == "Active"),
                InactiveEmployees = employeeRows.Count(employee => employee.Status == "Inactive"),
                Employees = employeeRows
            },
            AttentionItems = BuildAttentionItems(expiringSoon, expiredMembers, branchPerformance, employeeRows)
        });
    }

    private async Task<long?> ResolveOwnerGymIdAsync()
    {
        if (_currentUser.GymId.HasValue)
        {
            return _currentUser.GymId.Value;
        }

        return await _context.Gyms
            .Where(gym => gym.OwnerUserId == _currentUser.UserId)
            .Select(gym => (long?)gym.Id)
            .FirstOrDefaultAsync();
    }

    private static bool IsActiveMembership(Models.MemberMembership? membership, DateOnly today) =>
        membership != null &&
        AppStatuses.IsActiveMembership(membership.Status) &&
        (!membership.EndDate.HasValue || membership.EndDate.Value >= today);

    private static bool IsActiveMember(Models.Member member, Models.MemberMembership? membership, DateOnly today) =>
        member.IsActive && IsActiveMembership(membership, today);

    private static bool IsExpiredMember(Models.Member member, Models.MemberMembership? membership, DateOnly today) =>
        !member.IsActive ||
        membership == null ||
        string.Equals(AppStatuses.NormalizeMembership(membership.Status), AppStatuses.MembershipExpired, StringComparison.Ordinal) ||
        (membership.EndDate.HasValue && membership.EndDate.Value < today);

    private static string CapacityStatus(decimal capacityPercent)
    {
        if (capacityPercent <= 60) return "Normal";
        if (capacityPercent <= 85) return "Busy";
        return "High Capacity";
    }

    private static List<OwnerEmployeeSummaryDto> BuildEmployees(
        List<Models.User> users,
        List<Models.Employee> employees,
        Dictionary<long, string> branchNameById,
        Dictionary<long, int> paymentsRecordedByStaff)
    {
        var employeeUserIds = employees.Where(employee => employee.UserId.HasValue).Select(employee => employee.UserId!.Value).ToHashSet();
        var teamUsers = users
            .Where(user => user.Role?.Name is AppRoles.BranchManager or AppRoles.Staff or AppRoles.Trainer || employeeUserIds.Contains(user.Id))
            .ToList();

        return teamUsers.Select(user =>
        {
            var employee = employees.FirstOrDefault(item => item.UserId == user.Id);
            var branchId = employee?.BranchId ?? user.BranchId;
            var role = user.Role?.Name ?? employee?.Position ?? "Employee";
            return new OwnerEmployeeSummaryDto
            {
                EmployeeId = user.Id,
                EmployeeName = user.FullName ?? "Employee",
                Role = role,
                Branch = branchId.HasValue && branchNameById.TryGetValue(branchId.Value, out var branchName) ? branchName : "All branches",
                Status = user.IsActive ? "Active" : "Inactive",
                PaymentsRecorded = paymentsRecordedByStaff.GetValueOrDefault(user.Id),
                CheckInsHandled = 0
            };
        }).OrderBy(employee => employee.Role).ThenBy(employee => employee.EmployeeName).ToList();
    }

    private static List<OwnerAttentionItemDto> BuildAttentionItems(
        int expiringSoon,
        int expiredMembers,
        List<OwnerBranchPerformanceDto> branches,
        List<OwnerEmployeeSummaryDto> employees)
    {
        var items = new List<OwnerAttentionItemDto>();
        if (expiringSoon > 0)
        {
            items.Add(new OwnerAttentionItemDto { Id = "members-expiring", Type = "members", Title = "Memberships expiring soon", Message = $"{expiringSoon} memberships expire in the next 7 days.", Severity = "warning", Count = expiringSoon });
        }
        if (expiredMembers > 0)
        {
            items.Add(new OwnerAttentionItemDto { Id = "expired-members", Type = "expired-members", Title = "Expired members need follow-up", Message = $"{expiredMembers} expired members need follow-up.", Severity = "danger", Count = expiredMembers });
        }

        var highCapacity = branches.Count(branch => branch.CapacityPercent > 85);
        if (highCapacity > 0)
        {
            items.Add(new OwnerAttentionItemDto { Id = "high-capacity", Type = "capacity", Title = "Branches above 85% capacity", Message = $"{highCapacity} branches are near or at high capacity.", Severity = "warning", Count = highCapacity });
        }

        if (branches.Count > 1)
        {
            var averageRevenue = branches.Average(branch => branch.Revenue);
            var lowRevenue = branches.Count(branch => branch.Revenue < averageRevenue * 0.5m);
            if (lowRevenue > 0)
            {
                items.Add(new OwnerAttentionItemDto { Id = "low-revenue", Type = "branches", Title = "Branches with low revenue", Message = $"{lowRevenue} branches are materially below the gym average.", Severity = "info", Count = lowRevenue });
            }
        }

        var inactiveEmployees = employees.Count(employee => employee.Status == "Inactive");
        if (inactiveEmployees > 0)
        {
            items.Add(new OwnerAttentionItemDto { Id = "inactive-staff", Type = "team", Title = "Inactive staff accounts", Message = $"{inactiveEmployees} team accounts are inactive.", Severity = "warning", Count = inactiveEmployees });
        }

        return items;
    }
}
