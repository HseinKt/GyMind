using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("membership_plan_branches")]
public class MembershipPlanBranch
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("membership_plan_id")]
    public long MembershipPlanId { get; set; }

    [Column("branch_id")]
    public long BranchId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(MembershipPlanId))]
    public virtual MembershipPlan? MembershipPlan { get; set; }

    [ForeignKey(nameof(BranchId))]
    public virtual Branch? Branch { get; set; }
}
