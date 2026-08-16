using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    public long Id { get; set; }
    public long? UserId { get; set; }
    public string? Action { get; set; }
    public string? TableName { get; set; }
    public long? RecordId { get; set; }
    public DateTime? CreatedAt { get; set; }
}
