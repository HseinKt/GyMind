using Gymind.API.Models;
using Gymind.API.Security;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace Gymind.API.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        // ===== ROLES =====
        var roles = AppRoles.All;

        foreach (var role in roles)
        {
            if (!await context.Roles.AnyAsync(r => r.Name == role))
            {
                context.Roles.Add(new Role { Name = role });
            }
        }

        await context.SaveChangesAsync();

        // ===== GYM =====
        if (!await context.Gyms.AnyAsync())
        {
            context.Gyms.Add(new Gym
            {
                Name = "Gymind Performance Club",
                City = "Beirut",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();
        }

        var gym = await context.Gyms.FirstAsync();

        // ===== BRANCH =====
        if (!await context.Branches.AnyAsync())
        {
            context.Branches.Add(new Branch
            {
                GymId = gym.Id,
                Name = "Downtown Branch",
                Address = "Beirut Central District",
                Phone = "70123456",
                RangeKm = 0.10m,
                Capacity = 240,
                AreaSqm = 980m, // ✅ decimal
                Lat = 33.8938,  // ✅ double
                Lng = 35.5018,  // ✅ double
                OpenTime = new TimeOnly(6, 0),
                CloseTime = new TimeOnly(23, 0),
                IsActive = true
            });

            await context.SaveChangesAsync();
        }

        var branch = await context.Branches.FirstAsync();
        await EnsureBranchQrTokensAsync(context);

        if (!await context.Branches.AnyAsync(item => item.Name == "Seaside Branch"))
        {
            context.Branches.Add(new Branch
            {
                GymId = gym.Id,
                Name = "Seaside Branch",
                Address = "Beirut Waterfront",
                Phone = "70123457",
                RangeKm = 0.12m,
                Capacity = 180,
                AreaSqm = 760m,
                Lat = 33.9001,
                Lng = 35.4937,
                OpenTime = new TimeOnly(6, 30),
                CloseTime = new TimeOnly(22, 30),
                IsActive = true
            });

            await context.SaveChangesAsync();
        }

        await EnsureBranchQrTokensAsync(context);

        // ===== ADMIN + STAFF USERS =====
        var roleIds = await context.Roles.ToDictionaryAsync(role => role.Name, role => role.Id);
        var adminUsers = new[]
        {
            new
            {
                Email = "platform@gymind.com",
                FullName = "Maya Chen",
                Phone = "70000001",
                Password = "Forge123!",
                RoleName = AppRoles.SuperAdmin,
                GymId = (long?)null,
                BranchId = (long?)null
            },
            new
            {
                Email = "owner@gymind.com",
                FullName = "Omar Haddad",
                Phone = "70000002",
                Password = "Forge123!",
                RoleName = AppRoles.GymOwner,
                GymId = (long?)gym.Id,
                BranchId = (long?)branch.Id
            },
            new
            {
                Email = "manager@gymind.com",
                FullName = "Lina Farah",
                Phone = "70000003",
                Password = "Forge123!",
                RoleName = AppRoles.BranchManager,
                GymId = (long?)gym.Id,
                BranchId = (long?)branch.Id
            },
            new
            {
                Email = "staff@gymind.com",
                FullName = "Nour Saab",
                Phone = "70000004",
                Password = "Forge123!",
                RoleName = AppRoles.Staff,
                GymId = (long?)gym.Id,
                BranchId = (long?)branch.Id
            },
            new
            {
                Email = "trainer@gymind.com",
                FullName = "Tariq Mansour",
                Phone = "70000005",
                Password = "Forge123!",
                RoleName = AppRoles.Trainer,
                GymId = (long?)gym.Id,
                BranchId = (long?)branch.Id
            }
        };

        foreach (var adminUser in adminUsers)
        {
            var existingUser = await context.Users.FirstOrDefaultAsync(user => user.Email == adminUser.Email);
            if (existingUser != null)
            {
                continue;
            }

            context.Users.Add(new User
            {
                FullName = adminUser.FullName,
                Email = adminUser.Email,
                Phone = adminUser.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminUser.Password),
                RoleId = roleIds[adminUser.RoleName],
                GymId = adminUser.GymId,
                BranchId = adminUser.BranchId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        await context.SaveChangesAsync();

        var ownerUser = await context.Users.FirstAsync(user => user.Email == "owner@gymind.com");
        if (gym.OwnerUserId != ownerUser.Id)
        {
            gym.OwnerUserId = ownerUser.Id;
            await context.SaveChangesAsync();
        }

        // ===== USER =====
        var memberRoleId = await context.Roles
            .Where(r => r.Name == AppRoles.Member)
            .Select(r => r.Id)
            .FirstAsync();

        const string email = "member1@gymind.com";

        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
        {
            user = new User
            {
                FullName = "Gymind Test Member",
                Email = email,
                Phone = "70123456",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("P@ssw0rd123!"),
                RoleId = memberRoleId,
                GymId = gym.Id,
                BranchId = branch.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(user);
            await context.SaveChangesAsync();
        }

        // ===== MEMBER =====
        var member = await context.Members.FirstOrDefaultAsync(m => m.Email == email);

        if (member == null)
        {
            member = new Member
            {
                GymId = gym.Id,
                HomeBranchId = branch.Id,
                UserId = user.Id,
                FullName = user.FullName,
                Phone = user.Phone,
                Email = user.Email,
                QrCode = "FH-DEMO-ENTRY",
                JoinDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-2)),
                IsActive = true
            };

            context.Members.Add(member);
            await context.SaveChangesAsync();
        }
        else if (member.UserId != user.Id)
        {
            member.UserId = user.Id;
            await context.SaveChangesAsync();
        }

        // ===== MEMBERSHIP PLANS =====
        if (!await context.MembershipPlans.AnyAsync())
        {
            context.MembershipPlans.AddRange(
                new MembershipPlan
                {
                    GymId = gym.Id,
                    Name = "Premium",
                    Price = 89,
                    DurationMonths = 3,
                    AccessType = "full-access",
                    IncludesClasses = true,
                    IncludesPt = false,
                    IsActive = true
                },
                new MembershipPlan
                {
                    GymId = gym.Id,
                    Name = "VIP",
                    Price = 149,
                    DurationMonths = 3,
                    AccessType = "multi-branch",
                    IncludesClasses = true,
                    IncludesPt = true,
                    IsActive = true
                }
            );

            await context.SaveChangesAsync();
        }

        // ===== MEMBER PROFILE =====
        if (!await context.MemberProfiles.AnyAsync(profile => profile.MemberId == member.Id))
        {
            context.MemberProfiles.Add(new MemberProfile
            {
                MemberId = member.Id,
                HeightCm = 176m,
                WeightKg = 74m,
                FitnessGoal = "Build strength and improve conditioning",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();
        }

        var plan = await context.MembershipPlans.FirstAsync();

        // ===== MEMBER MEMBERSHIP =====
        if (!await context.MemberMemberships.AnyAsync(m => m.MemberId == member.Id))
        {
            context.MemberMemberships.Add(new MemberMembership
            {
                MemberId = member.Id,
                PlanId = plan.Id,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-1)),
                EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(24)),
                Status = AppStatuses.MembershipActive,
                FreezeDays = 0
            });

            await context.SaveChangesAsync();
        }

        if (!await context.Payments.AnyAsync(payment => payment.MemberId == member.Id))
        {
            var activeMembership = await context.MemberMemberships
                .Where(item => item.MemberId == member.Id)
                .OrderByDescending(item => item.StartDate)
                .FirstOrDefaultAsync();
            var staffUser = await context.Users.FirstAsync(user => user.Email == "staff@gymind.com");

            context.Payments.AddRange(
                new Payment
                {
                    GymId = gym.Id,
                    BranchId = branch.Id,
                    MemberId = member.Id,
                    MembershipId = activeMembership?.Id,
                    ReceivedByUserId = staffUser.Id,
                    Amount = 89,
                    Method = "Card",
                    PaidAt = DateTime.UtcNow.AddDays(-10),
                    Notes = "Initial membership payment"
                },
                new Payment
                {
                    GymId = gym.Id,
                    BranchId = branch.Id,
                    MemberId = member.Id,
                    MembershipId = activeMembership?.Id,
                    ReceivedByUserId = staffUser.Id,
                    Amount = 25,
                    Method = "Cash",
                    PaidAt = DateTime.UtcNow.AddDays(-2),
                    Notes = "Personal training add-on"
                });

            await context.SaveChangesAsync();
        }

        // ===== CLASSES =====
        if (!await context.Classes.AnyAsync())
        {
            var trainerUser = await context.Users.FirstAsync(user => user.Email == "trainer@gymind.com");
            context.Classes.AddRange(
                new GymClass
                {
                    GymId = gym.Id,
                    BranchId = branch.Id,
                    TrainerUserId = trainerUser.Id,
                    Name = "HIIT Blast",
                    Capacity = 16,
                    StartTime = DateTime.UtcNow.AddHours(4),
                    EndTime = DateTime.UtcNow.AddHours(5)
                },
                new GymClass
                {
                    GymId = gym.Id,
                    BranchId = branch.Id,
                    TrainerUserId = trainerUser.Id,
                    Name = "Strength Lab",
                    Capacity = 12,
                    StartTime = DateTime.UtcNow.AddDays(1).AddHours(3),
                    EndTime = DateTime.UtcNow.AddDays(1).AddHours(4)
                }
            );

            await context.SaveChangesAsync();
        }

        var firstClass = await context.Classes.OrderBy(item => item.StartTime).FirstOrDefaultAsync();
        if (firstClass != null &&
            !await context.ClassBookings.AnyAsync(item => item.ClassId == firstClass.Id && item.MemberId == member.Id))
        {
            context.ClassBookings.Add(new ClassBooking
            {
                ClassId = firstClass.Id,
                MemberId = member.Id,
                Status = AppStatuses.BookingBooked,
                BookedAt = DateTime.UtcNow.AddHours(-3)
            });

            await context.SaveChangesAsync();
        }

        // ===== CHECK-INS =====
        if (!await context.CheckIns.AnyAsync(c => c.MemberId == member.Id))
        {
            for (int i = 1; i <= 6; i++)
            {
                var checkInTime = DateTime.UtcNow.AddDays(-i);
                context.CheckIns.Add(new CheckIn
                {
                    MemberId = member.Id,
                    BranchId = branch.Id,
                    CheckInTime = checkInTime,
                    CheckOutTime = checkInTime.AddHours(2),
                    LastSeenAt = checkInTime.AddHours(2),
                    Status = AppStatuses.CheckInCheckedOut,
                    Method = "mobile-qr",
                    CheckOutMethod = "mobile-qr"
                });
            }

            await context.SaveChangesAsync();
        }

        // ===== NOTIFICATIONS =====
        if (!await context.Notifications.AnyAsync())
        {
            var staffUser = await context.Users.FirstAsync(user => user.Email == "staff@gymind.com");
            context.Notifications.AddRange(
                new Notification
                {
                    GymId = gym.Id,
                    BranchId = branch.Id,
                    Title = "Booking reminder",
                    Message = "Your HIIT Blast class starts in 4 hours.",
                    CreatedByUserId = staffUser.Id,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-45)
                },
                new Notification
                {
                    GymId = gym.Id,
                    BranchId = branch.Id,
                    Title = "Membership expiry",
                    Message = "Your Premium membership expires soon.",
                    CreatedByUserId = staffUser.Id,
                    CreatedAt = DateTime.UtcNow.AddHours(-8)
                }
            );

            await context.SaveChangesAsync();
        }

        var existingNotifications = await context.Notifications
            .OrderByDescending(notification => notification.CreatedAt)
            .Take(5)
            .ToListAsync();

        var recipientIds = await context.Users
            .Where(user => user.GymId == gym.Id || user.GymId == null)
            .Select(user => user.Id)
            .ToListAsync();

        foreach (var notification in existingNotifications)
        {
            foreach (var recipientId in recipientIds)
            {
                var recipientExists = await context.NotificationRecipients.AnyAsync(item =>
                    item.NotificationId == notification.Id && item.UserId == recipientId);

                if (!recipientExists)
                {
                    context.NotificationRecipients.Add(new NotificationRecipient
                    {
                        NotificationId = notification.Id,
                        UserId = recipientId,
                        IsRead = false
                    });
                }
            }
        }

        if (context.ChangeTracker.HasChanges())
        {
            await context.SaveChangesAsync();
        }

        await QaDataSeeder.SeedAsync(context);
    }

    private static async Task EnsureBranchQrTokensAsync(ApplicationDbContext context)
    {
        var branches = await context.Branches
            .Where(branch => branch.QrCodeToken == null || branch.QrCodeToken == string.Empty)
            .ToListAsync();

        foreach (var branch in branches)
        {
            var now = DateTime.UtcNow;
            branch.QrCodeToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
            branch.QrCodeCreatedAt = now;
            branch.QrCodeUpdatedAt = now;
            branch.QrCodeIsActive = true;
        }

        if (branches.Count > 0)
        {
            await context.SaveChangesAsync();
        }
    }
}
