using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("otp_records")]
public class OtpRecord
{
    [Key]
    public long Id { get; set; }
    public long UserId { get; set; }
    public string DeviceId { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsUsed { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }
}
