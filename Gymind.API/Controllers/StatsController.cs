using System.Security.Claims;
using Gymind.API.Data;
using Gymind.API.DTOs;
using Gymind.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly MemberExperienceService _memberExperienceService;

    public StatsController(ApplicationDbContext context, MemberExperienceService memberExperienceService)
    {
        _context = context;
        _memberExperienceService = memberExperienceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetStats()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!long.TryParse(userId, out var parsedUserId))
        {
            return Unauthorized();
        }

        var member = await _context.Members.FirstOrDefaultAsync(m => m.UserId == parsedUserId);
        var memberId = member?.Id;
        var recentCheckIns = memberId.HasValue
            ? await _context.CheckIns
                .Where(item => item.MemberId == memberId.Value)
                .OrderByDescending(item => item.CheckInTime)
                .Take(90)
                .ToListAsync()
            : [];
        var today = DateTime.UtcNow.Date;
        var weekStart = today.AddDays(-6);
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var visitsThisWeek = recentCheckIns.Count(checkIn => checkIn.CheckInTime.HasValue && checkIn.CheckInTime.Value.Date >= weekStart);
        var visitsThisMonth = recentCheckIns.Count(checkIn => checkIn.CheckInTime.HasValue && checkIn.CheckInTime.Value.Date >= monthStart);
        var averageGymTimeMinutes = recentCheckIns
            .Where(checkIn => checkIn.CheckInTime.HasValue && checkIn.CheckOutTime.HasValue && checkIn.CheckOutTime.Value > checkIn.CheckInTime.Value)
            .Select(checkIn => (int)Math.Round((checkIn.CheckOutTime!.Value - checkIn.CheckInTime!.Value).TotalMinutes))
            .DefaultIfEmpty(0)
            .Average();

        var weeklyAttendance = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var day = DateTime.UtcNow.Date.AddDays(-6 + offset);
                return recentCheckIns.Count(checkIn => checkIn.CheckInTime?.Date == day);
            })
            .ToList();

        var monthlyAttendance = Enumerable.Range(0, 4)
            .Select(offset =>
            {
                var month = DateTime.UtcNow.AddMonths(-3 + offset);
                return recentCheckIns.Count(checkIn =>
                    checkIn.CheckInTime.HasValue &&
                    checkIn.CheckInTime.Value.Month == month.Month &&
                    checkIn.CheckInTime.Value.Year == month.Year);
            })
            .ToList();
        var currentMonthAttendance = BuildDailyAttendance(recentCheckIns, today.Year, today.Month);
        var previousMonth = today.AddMonths(-1);
        var previousMonthAttendance = BuildDailyAttendance(recentCheckIns, previousMonth.Year, previousMonth.Month);

        var workouts = await _memberExperienceService.GetWorkoutsAsync(parsedUserId);
        var workoutFrequency = workouts.Count(record => record.CompletedAt >= DateTime.UtcNow.AddDays(-7));
        var calories = workouts.Sum(record => Math.Max(120, record.DurationSeconds / 6));

        return Ok(new StatsResponseDto
        {
            WeeklyAttendance = weeklyAttendance,
            MonthlyAttendance = monthlyAttendance,
            CurrentMonthAttendance = currentMonthAttendance,
            PreviousMonthAttendance = previousMonthAttendance,
            WorkoutFrequency = workoutFrequency,
            TotalCheckIns = recentCheckIns.Count,
            CaloriesBurnedEstimate = calories,
            VisitsThisWeek = visitsThisWeek,
            VisitsThisMonth = visitsThisMonth,
            CurrentStreak = CalculateCurrentStreak(recentCheckIns),
            AverageGymTimeMinutes = Math.Max(0, (int)Math.Round(averageGymTimeMinutes))
        });
    }

    private static List<int> BuildDailyAttendance(IEnumerable<Models.CheckIn> checkIns, int year, int month)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        return Enumerable.Range(1, daysInMonth)
            .Select(day => checkIns.Count(checkIn =>
                checkIn.CheckInTime.HasValue &&
                checkIn.CheckInTime.Value.Year == year &&
                checkIn.CheckInTime.Value.Month == month &&
                checkIn.CheckInTime.Value.Day == day))
            .ToList();
    }

    private static int CalculateCurrentStreak(IEnumerable<Models.CheckIn> checkIns)
    {
        var days = checkIns
            .Where(item => item.CheckInTime.HasValue)
            .Select(item => item.CheckInTime!.Value.Date)
            .Distinct()
            .ToHashSet();
        var cursor = DateTime.UtcNow.Date;
        var streak = 0;
        while (days.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }
}
