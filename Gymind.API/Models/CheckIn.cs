using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("check_ins")]
public class CheckIn
{
    [Key]
    public long Id { get; set; }
    public long? MemberId { get; set; }
    public long? BranchId { get; set; }
    public DateTime? CheckInTime { get; set; } = DateTime.UtcNow;
    public DateTime? CheckOutTime { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public string? Status { get; set; } = "Open";
    public string? Method { get; set; }
    public string? CheckOutMethod { get; set; }
    
    [ForeignKey("MemberId")]
    public virtual Member? Member { get; set; }
    
    [ForeignKey("BranchId")]
    public virtual Branch? Branch { get; set; }
}
