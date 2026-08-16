using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("refresh_sessions")]
public class RefreshSession
{
    [Key]
    public long Id { get; set; }
    public long UserId { get; set; }
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }
}
