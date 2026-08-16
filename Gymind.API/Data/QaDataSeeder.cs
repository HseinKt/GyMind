using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Data;

public static class QaDataSeeder
{
    public const string Password = "Test@123456";

    public static async Task SeedAsync(ApplicationDbContext context)
    {
        var roleIds = await context.Roles.ToDictionaryAsync(role => role.Name, role => role.Id);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var gym1 = await EnsureGym(context, "Gymind Ablah Fitness", "Ablah");
        var gym2 = await EnsureGym(context, "Gymind Local Gym", "Ablah");
        var gym3 = await EnsureGym(context, "Gymind Solo Gym", "Ablah");

        var main = await EnsureBranch(context, gym1.Id, "Ablah Main Branch", "Ablah, Bekaa, Lebanon", "70111001", 33.8212, 35.9956, 220);
        var east = await EnsureBranch(context, gym1.Id, "Ablah East Branch", "Ablah East, Bekaa, Lebanon", "70111002", 33.8224, 35.9991, 180);
        var beirut = await EnsureBranch(context, gym1.Id, "Beirut Branch", "Beirut, Lebanon", "70111003", 33.8938, 35.5018, 200);
        var strength = await EnsureBranch(context, gym2.Id, "Ablah Strength Branch", "Ablah, Bekaa, Lebanon", "70222001", 33.8206, 35.9944, 120);
        var cardio = await EnsureBranch(context, gym2.Id, "Ablah Cardio Branch", "Ablah, Bekaa, Lebanon", "70222002", 33.8231, 35.9962, 120);
        var solo = await EnsureBranch(context, gym3.Id, "Ablah Solo Branch", "Ablah, Bekaa, Lebanon", "70333001", 33.8217, 35.9936, 90);

        var owner1 = await EnsureUser(context, roleIds, "qa.owner.ablahfitness@gymind.test", "QA Ablah Fitness Owner", "71900002", AppRoles.GymOwner, gym1.Id, main.Id);
        var owner2 = await EnsureUser(context, roleIds, "qa.owner.localgym@gymind.test", "QA Local Gym Owner", "71900003", AppRoles.GymOwner, gym2.Id, strength.Id);
        var owner3 = await EnsureUser(context, roleIds, "qa.owner.sologym@gymind.test", "QA Solo Gym Owner", "71900004", AppRoles.GymOwner, gym3.Id, solo.Id);
        await EnsureUser(context, roleIds, "qa.superadmin@gymind.test", "QA Super Admin", "71900001", AppRoles.SuperAdmin, null, null);
        await EnsureUser(context, roleIds, "qa.manager.ablahmain@gymind.test", "QA Ablah Main Manager", "71900005", AppRoles.BranchManager, gym1.Id, main.Id);
        var staff = await EnsureUser(context, roleIds, "qa.staff.ablahmain@gymind.test", "QA Ablah Main Staff", "71900006", AppRoles.Staff, gym1.Id, main.Id);
        var elie = await EnsureUser(context, roleIds, "qa.trainer.elie@gymind.test", "Elie Haddad", "71900007", AppRoles.Trainer, gym1.Id, main.Id);
        var marc = await EnsureUser(context, roleIds, "qa.trainer.marc@gymind.test", "Marc Khoury", "71900008", AppRoles.Trainer, gym1.Id, east.Id);
        var rana = await EnsureUser(context, roleIds, "qa.trainer.rana@gymind.test", "Rana Nader", "71900009", AppRoles.Trainer, gym1.Id, beirut.Id);

        gym1.OwnerUserId = owner1.Id;
        gym2.OwnerUserId = owner2.Id;
        gym3.OwnerUserId = owner3.Id;
        await context.SaveChangesAsync();

        var dayPass = await EnsurePlan(context, gym1.Id, "QA One Day Pass", 5, 1, "DAY_PASS", true, false, [main.Id]);
        var monthly = await EnsurePlan(context, gym1.Id, "QA Monthly Basic", 30, 1, "one_branch", true, false, [main.Id]);
        var threeMonth = await EnsurePlan(context, gym1.Id, "QA 3-Month Standard", 80, 3, "one_branch", true, false, [east.Id]);
        var vip = await EnsurePlan(context, gym1.Id, "QA VIP All Branches", 120, 1, "multi-branch", true, true, [main.Id, east.Id, beirut.Id]);
        await EnsurePlan(context, gym1.Id, "QA Student Plan", 20, 1, "one_branch", true, false, [main.Id]);
        var freezeAllowed = await EnsurePlan(context, gym1.Id, "QA Frozen Allowed Plan", 35, 1, "one_branch", true, false, [east.Id]);
        await EnsurePlan(context, gym2.Id, "QA Gym2 One Day Pass", 5, 1, "DAY_PASS", true, false, [strength.Id]);
        var gym2Monthly = await EnsurePlan(context, gym2.Id, "QA Monthly Local", 28, 1, "one_branch", true, false, [strength.Id]);
        await EnsurePlan(context, gym2.Id, "QA VIP Local All Branches", 85, 1, "multi-branch", true, false, [strength.Id, cardio.Id]);
        await EnsurePlan(context, gym3.Id, "QA Solo One Day Pass", 5, 1, "DAY_PASS", true, false, [solo.Id]);
        var gym3Monthly = await EnsurePlan(context, gym3.Id, "QA Monthly Solo", 25, 1, "one_branch", true, false, [solo.Id]);

        var activeMonthly = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.active.monthly@gymind.test", "Charbel Active Monthly", "71810001");
        var dayPassMember = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.daypass@gymind.test", "Maya Daypass", "71810002");
        var threeMonthMember = await EnsureMember(context, roleIds, gym1.Id, east.Id, "qa.member.3months@gymind.test", "Jad ThreeMonths", "71810003");
        var vipMember = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.vip@gymind.test", "Lea VIP", "71810004");
        var expiring2 = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.expiring2days@gymind.test", "Karim Expiring Soon", "71810005");
        var expiringTomorrow = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.expiringtomorrow@gymind.test", "Nour Expiring Tomorrow", "71810006");
        var expired = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.expired@gymind.test", "Tony Expired", "71810007");
        var frozen = await EnsureMember(context, roleIds, gym1.Id, east.Id, "qa.member.frozen@gymind.test", "Sarah Frozen", "71810008");
        var cancelled = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.cancelled@gymind.test", "Rami Cancelled", "71810009");
        await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.noplan@gymind.test", "Hiba NoPlan", "71810010");
        var history = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.history@gymind.test", "Paul History", "71810011");
        var running = await EnsureMember(context, roleIds, gym1.Id, main.Id, "qa.member.running@gymind.test", "Rita Running Timer", "71810012");
        var vipBeirut = await EnsureMember(context, roleIds, gym1.Id, beirut.Id, "qa.member.vip.beirut@gymind.test", "George VIP Beirut", "71810013");
        var gym2Member = await EnsureMember(context, roleIds, gym2.Id, strength.Id, "qa.member.gym2.monthly@gymind.test", "Maria GymTwo", "71810014");
        var gym3Member = await EnsureMember(context, roleIds, gym3.Id, solo.Id, "qa.member.gym3.solo@gymind.test", "Sami Solo", "71810015");

        await EnsureMembership(context, activeMonthly.Id, monthly.Id, today.AddDays(-5), today.AddDays(25), AppStatuses.MembershipActive);
        await EnsureMembership(context, dayPassMember.Id, dayPass.Id, today, today, AppStatuses.MembershipActive);
        await EnsureMembership(context, threeMonthMember.Id, threeMonth.Id, today.AddDays(-20), today.AddDays(70), AppStatuses.MembershipActive);
        await EnsureMembership(context, vipMember.Id, vip.Id, today.AddDays(-3), today.AddDays(27), AppStatuses.MembershipActive);
        await EnsureMembership(context, expiring2.Id, monthly.Id, today.AddDays(-28), today.AddDays(2), AppStatuses.MembershipActive);
        await EnsureMembership(context, expiringTomorrow.Id, monthly.Id, today.AddDays(-29), today.AddDays(1), AppStatuses.MembershipActive);
        await EnsureMembership(context, expired.Id, monthly.Id, today.AddDays(-40), today.AddDays(-10), AppStatuses.MembershipExpired);
        await EnsureMembership(context, frozen.Id, freezeAllowed.Id, today.AddDays(-10), today.AddDays(20), AppStatuses.MembershipFrozen, 7);
        await EnsureMembership(context, cancelled.Id, monthly.Id, today.AddDays(-10), today.AddDays(20), AppStatuses.MembershipCancelled);
        await EnsureHistoryMemberships(context, history.Id, dayPass.Id, monthly.Id, threeMonth.Id, today);
        await EnsureMembership(context, running.Id, monthly.Id, today.AddDays(-7), today.AddDays(23), AppStatuses.MembershipActive);
        await EnsureMembership(context, vipBeirut.Id, vip.Id, today.AddDays(-4), today.AddDays(26), AppStatuses.MembershipActive);
        await EnsureMembership(context, gym2Member.Id, gym2Monthly.Id, today.AddDays(-4), today.AddDays(26), AppStatuses.MembershipActive);
        await EnsureMembership(context, gym3Member.Id, gym3Monthly.Id, today.AddDays(-4), today.AddDays(26), AppStatuses.MembershipActive);

        await EnsureCheckIns(context, activeMonthly.Id, main.Id, false);
        await EnsureCheckIns(context, running.Id, main.Id, true);
        await EnsureCheckIns(context, vipBeirut.Id, beirut.Id, true);

        var strengthClass = await EnsureClass(context, gym1.Id, main.Id, elie.Id, "QA Strength Training", 12, DateTime.UtcNow.Date.AddHours(18), DateTime.UtcNow.Date.AddHours(19));
        var hiitClass = await EnsureClass(context, gym1.Id, main.Id, elie.Id, "QA HIIT", 16, DateTime.UtcNow.AddDays(1).Date.AddHours(17), DateTime.UtcNow.AddDays(1).Date.AddHours(18));
        await EnsureClass(context, gym1.Id, main.Id, marc.Id, "QA Boxing", 10, DateTime.UtcNow.AddDays(3).Date.AddHours(19), DateTime.UtcNow.AddDays(3).Date.AddHours(20));
        await EnsureClass(context, gym1.Id, east.Id, marc.Id, "QA Yoga", 14, DateTime.UtcNow.AddDays(2).Date.AddHours(8), DateTime.UtcNow.AddDays(2).Date.AddHours(9));
        await EnsureClass(context, gym1.Id, east.Id, marc.Id, "QA Bodybuilding Basics", 10, DateTime.UtcNow.AddDays(7).Date.AddHours(18), DateTime.UtcNow.AddDays(7).Date.AddHours(19));
        var spinningClass = await EnsureClass(context, gym1.Id, beirut.Id, rana.Id, "QA Spinning Cardio", 18, DateTime.UtcNow.AddDays(2).Date.AddHours(18), DateTime.UtcNow.AddDays(2).Date.AddHours(19));
        await EnsureClass(context, gym1.Id, beirut.Id, rana.Id, "QA CrossFit", 12, DateTime.UtcNow.AddDays(8).Date.AddHours(18), DateTime.UtcNow.AddDays(8).Date.AddHours(19));
        await EnsureClass(context, gym1.Id, main.Id, elie.Id, "QA Abs Core Completed", 16, DateTime.UtcNow.AddDays(-1).Date.AddHours(18), DateTime.UtcNow.AddDays(-1).Date.AddHours(19));

        await EnsureBooking(context, strengthClass.Id, activeMonthly.Id, AppStatuses.BookingBooked);
        await EnsureBooking(context, spinningClass.Id, vipMember.Id, AppStatuses.BookingBooked);
        await EnsureBooking(context, hiitClass.Id, history.Id, AppStatuses.BookingCancelled);

        foreach (var member in new[] { activeMonthly, dayPassMember, threeMonthMember, vipMember, expiring2, expiringTomorrow, expired, frozen, cancelled, history, running, vipBeirut, gym2Member, gym3Member })
        {
            await EnsurePayment(context, member.Id, staff.Id);
        }

        await EnsureNotification(context, gym1.Id, main.Id, staff.Id, expiring2.UserId, "QA Membership ends in 2 days", "Your membership ends in 2 days. Renew now to avoid interruption.");
        await EnsureNotification(context, gym1.Id, main.Id, staff.Id, expiringTomorrow.UserId, "QA Membership ends tomorrow", "Your membership ends tomorrow. Renew now to avoid interruption.");
        await EnsureNotification(context, gym1.Id, main.Id, staff.Id, vipMember.UserId, "QA VIP welcome", "Welcome to VIP All Branches access.");
    }

    private static async Task<Gym> EnsureGym(ApplicationDbContext context, string name, string city)
    {
        var gym = await context.Gyms.FirstOrDefaultAsync(item => item.Name == name);
        if (gym != null) return gym;
        gym = new Gym { Name = name, City = city, IsActive = true, CreatedAt = DateTime.UtcNow };
        context.Gyms.Add(gym);
        await context.SaveChangesAsync();
        return gym;
    }

    private static async Task<Branch> EnsureBranch(ApplicationDbContext context, long gymId, string name, string address, string phone, double lat, double lng, int capacity)
    {
        var branch = await context.Branches.FirstOrDefaultAsync(item => item.Name == name);
        if (branch != null) return branch;
        branch = new Branch { GymId = gymId, Name = name, Address = address, Phone = phone, RangeKm = 0.15m, Capacity = capacity, AreaSqm = capacity * 4, Lat = lat, Lng = lng, OpenTime = new TimeOnly(6, 0), CloseTime = new TimeOnly(23, 0), IsActive = true };
        context.Branches.Add(branch);
        await context.SaveChangesAsync();
        return branch;
    }

    private static async Task<User> EnsureUser(ApplicationDbContext context, Dictionary<string, long> roleIds, string email, string fullName, string phone, string roleName, long? gymId, long? branchId)
    {
        var user = await context.Users.FirstOrDefaultAsync(item => item.Email == email);
        if (user != null) return user;
        user = new User { FullName = fullName, Email = email, Phone = phone, PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password), RoleId = roleIds[roleName], GymId = gymId, BranchId = branchId, IsActive = true, CreatedAt = DateTime.UtcNow };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    private static async Task<Member> EnsureMember(ApplicationDbContext context, Dictionary<string, long> roleIds, long gymId, long branchId, string email, string fullName, string phone)
    {
        var user = await EnsureUser(context, roleIds, email, fullName, phone, AppRoles.Member, gymId, branchId);
        var member = await context.Members.FirstOrDefaultAsync(item => item.Email == email);
        if (member == null)
        {
            member = new Member { GymId = gymId, HomeBranchId = branchId, UserId = user.Id, FullName = fullName, Phone = phone, Email = email, QrCode = $"QA-{user.Id}", JoinDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-45)), IsActive = true };
            context.Members.Add(member);
            await context.SaveChangesAsync();
        }
        else if (member.UserId != user.Id)
        {
            member.UserId = user.Id;
            await context.SaveChangesAsync();
        }

        if (!await context.MemberProfiles.AnyAsync(item => item.MemberId == member.Id))
        {
            context.MemberProfiles.Add(new MemberProfile { MemberId = member.Id, HeightCm = 175, WeightKg = 76, FitnessGoal = "QA demo member profile", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            await context.SaveChangesAsync();
        }

        return member;
    }

    private static async Task<MembershipPlan> EnsurePlan(ApplicationDbContext context, long gymId, string name, decimal price, int durationMonths, string accessType, bool includesClasses, bool includesPt, long[] branchIds)
    {
        var plan = await context.MembershipPlans.FirstOrDefaultAsync(item => item.GymId == gymId && item.Name == name);
        if (plan == null)
        {
            plan = new MembershipPlan { GymId = gymId, Name = name, Price = price, DurationMonths = durationMonths, AccessType = accessType, IncludesClasses = includesClasses, IncludesPt = includesPt, IsActive = true };
            context.MembershipPlans.Add(plan);
            await context.SaveChangesAsync();
        }

        foreach (var branchId in branchIds)
        {
            if (!await context.MembershipPlanBranches.AnyAsync(item => item.MembershipPlanId == plan.Id && item.BranchId == branchId))
            {
                context.MembershipPlanBranches.Add(new MembershipPlanBranch { MembershipPlanId = plan.Id, BranchId = branchId, CreatedAt = DateTime.UtcNow });
            }
        }

        await context.SaveChangesAsync();
        return plan;
    }

    private static async Task EnsureMembership(ApplicationDbContext context, long memberId, long planId, DateOnly start, DateOnly end, string status, int freezeDays = 0)
    {
        if (await context.MemberMemberships.AnyAsync(item => item.MemberId == memberId && item.PlanId == planId && item.Status == status)) return;
        context.MemberMemberships.Add(new MemberMembership { MemberId = memberId, PlanId = planId, StartDate = start, EndDate = end, Status = status, FreezeDays = freezeDays });
        await context.SaveChangesAsync();
    }

    private static async Task EnsureHistoryMemberships(ApplicationDbContext context, long memberId, long dayPassId, long monthlyId, long currentPlanId, DateOnly today)
    {
        if (await context.MemberMemberships.AnyAsync(item => item.MemberId == memberId)) return;
        context.MemberMemberships.AddRange(
            new MemberMembership { MemberId = memberId, PlanId = dayPassId, StartDate = today.AddDays(-90), EndDate = today.AddDays(-90), Status = AppStatuses.MembershipExpired },
            new MemberMembership { MemberId = memberId, PlanId = monthlyId, StartDate = today.AddDays(-60), EndDate = today.AddDays(-30), Status = AppStatuses.MembershipExpired },
            new MemberMembership { MemberId = memberId, PlanId = currentPlanId, StartDate = today.AddDays(-5), EndDate = today.AddDays(85), Status = AppStatuses.MembershipActive });
        await context.SaveChangesAsync();
    }

    private static async Task EnsureCheckIns(ApplicationDbContext context, long memberId, long branchId, bool active)
    {
        if (!await context.CheckIns.AnyAsync(item => item.MemberId == memberId && item.Method == "QA_COMPLETED"))
        {
            context.CheckIns.Add(new CheckIn { MemberId = memberId, BranchId = branchId, CheckInTime = DateTime.UtcNow.AddDays(-1).AddHours(-2), CheckOutTime = DateTime.UtcNow.AddDays(-1).AddHours(-1), LastSeenAt = DateTime.UtcNow.AddDays(-1).AddHours(-1), Status = AppStatuses.CheckInCheckedOut, Method = "QA_COMPLETED", CheckOutMethod = "QA_SEED" });
        }

        if (active && !await context.CheckIns.AnyAsync(item => item.MemberId == memberId && item.CheckOutTime == null))
        {
            context.CheckIns.Add(new CheckIn { MemberId = memberId, BranchId = branchId, CheckInTime = DateTime.UtcNow.AddMinutes(-35), LastSeenAt = DateTime.UtcNow.AddMinutes(-2), Status = AppStatuses.CheckInCheckedIn, Method = "QA_ACTIVE" });
        }

        await context.SaveChangesAsync();
    }

    private static async Task<GymClass> EnsureClass(ApplicationDbContext context, long gymId, long branchId, long trainerUserId, string name, int capacity, DateTime startTime, DateTime endTime)
    {
        var gymClass = await context.Classes.FirstOrDefaultAsync(item => item.Name == name && item.BranchId == branchId);
        if (gymClass != null) return gymClass;
        gymClass = new GymClass { GymId = gymId, BranchId = branchId, TrainerUserId = trainerUserId, Name = name, Capacity = capacity, StartTime = startTime, EndTime = endTime };
        context.Classes.Add(gymClass);
        await context.SaveChangesAsync();
        return gymClass;
    }

    private static async Task EnsureBooking(ApplicationDbContext context, long classId, long memberId, string status)
    {
        if (await context.ClassBookings.AnyAsync(item => item.ClassId == classId && item.MemberId == memberId)) return;
        context.ClassBookings.Add(new ClassBooking { ClassId = classId, MemberId = memberId, Status = status, BookedAt = DateTime.UtcNow.AddHours(-4) });
        await context.SaveChangesAsync();
    }

    private static async Task EnsurePayment(ApplicationDbContext context, long memberId, long staffUserId)
    {
        if (await context.Payments.AnyAsync(item => item.MemberId == memberId && item.Notes == "QA seed payment")) return;
        var member = await context.Members.FirstAsync(item => item.Id == memberId);
        var membership = await context.MemberMemberships.OrderByDescending(item => item.StartDate).FirstOrDefaultAsync(item => item.MemberId == memberId);
        context.Payments.Add(new Payment { GymId = member.GymId, BranchId = member.HomeBranchId, MemberId = member.Id, MembershipId = membership?.Id, ReceivedByUserId = staffUserId, Amount = 30, Method = "QA Card - PAID", PaidAt = DateTime.UtcNow.AddDays(-3), Notes = "QA seed payment" });
        await context.SaveChangesAsync();
    }

    private static async Task EnsureNotification(ApplicationDbContext context, long gymId, long branchId, long staffUserId, long? recipientUserId, string title, string message)
    {
        var notification = await context.Notifications.FirstOrDefaultAsync(item => item.Title == title);
        if (notification == null)
        {
            notification = new Notification { GymId = gymId, BranchId = branchId, Title = title, Message = message, CreatedByUserId = staffUserId, CreatedAt = DateTime.UtcNow };
            context.Notifications.Add(notification);
            await context.SaveChangesAsync();
        }

        if (recipientUserId.HasValue && !await context.NotificationRecipients.AnyAsync(item => item.NotificationId == notification.Id && item.UserId == recipientUserId.Value))
        {
            context.NotificationRecipients.Add(new NotificationRecipient { NotificationId = notification.Id, UserId = recipientUserId.Value, IsRead = false });
            await context.SaveChangesAsync();
        }
    }
}
