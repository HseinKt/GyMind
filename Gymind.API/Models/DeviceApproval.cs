using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("device_approvals")]
public class DeviceApproval
{
    [Key]
    public long Id { get; set; }
    public long UserId { get; set; }
    public string DeviceId { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }
}
