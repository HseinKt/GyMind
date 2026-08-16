using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("workout_sessions")]
public class WorkoutSession
{
    [Key]
    public long Id { get; set; }
    public long UserId { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }
}
