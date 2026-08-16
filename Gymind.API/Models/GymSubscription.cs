using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("gym_subscriptions")]
public class GymSubscription
{
    [Key]
    public long Id { get; set; }
    public long? GymId { get; set; }
    public string? PlanName { get; set; }
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? Status { get; set; }
    public DateTime? NoticeStartedAt { get; set; }
    public DateTime? LockedAt { get; set; }

    [ForeignKey("GymId")]
    public virtual Gym? Gym { get; set; }
}
