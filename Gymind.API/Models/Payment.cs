using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("payments")]
public class Payment
{
    [Key]
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? MemberId { get; set; }
    public long? MembershipId { get; set; }
    public long? ReceivedByUserId { get; set; }
    public decimal? Amount { get; set; }
    public string? Method { get; set; }
    public DateTime? PaidAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
    
    [ForeignKey("GymId")]
    public virtual Gym? Gym { get; set; }
    
    [ForeignKey("BranchId")]
    public virtual Branch? Branch { get; set; }
    
    [ForeignKey("MemberId")]
    public virtual Member? Member { get; set; }
    
    [ForeignKey("MembershipId")]
    public virtual MemberMembership? Membership { get; set; }
    
    [ForeignKey("ReceivedByUserId")]
    public virtual User? ReceivedByUser { get; set; }
}