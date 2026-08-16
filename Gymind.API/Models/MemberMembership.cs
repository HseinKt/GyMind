using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("member_memberships")]
public class MemberMembership
{
    [Key]
    public long Id { get; set; }
    public long? MemberId { get; set; }
    public long? PlanId { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Status { get; set; }
    public int? FreezeDays { get; set; } = 0;
    
    [ForeignKey("MemberId")]
    public virtual Member? Member { get; set; }
    
    [ForeignKey("PlanId")]
    public virtual MembershipPlan? Plan { get; set; }
}