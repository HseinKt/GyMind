using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("notification_recipients")]
public class NotificationRecipient
{
    [Key]
    public long Id { get; set; }
    public long? NotificationId { get; set; }
    public long? UserId { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
}
