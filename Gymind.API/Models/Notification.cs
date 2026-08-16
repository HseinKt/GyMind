using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("notifications")]
public class Notification
{
    [Key]
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public string? Title { get; set; }
    public string? Message { get; set; }
    public long? CreatedByUserId { get; set; }
    public DateTime? CreatedAt { get; set; }
}
