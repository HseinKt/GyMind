using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("membership_plans")]
public class MembershipPlan
{
    [Key]
    public long Id { get; set; }
    public long? GymId { get; set; }
    public string? Name { get; set; }
    public decimal? Price { get; set; }
    public int? DurationMonths { get; set; }
    public string? AccessType { get; set; }
    public bool IncludesClasses { get; set; } = false;
    public bool IncludesPt { get; set; } = false;
    public bool IsActive { get; set; } = true;
    
    [ForeignKey("GymId")]
    public virtual Gym? Gym { get; set; }

    public virtual ICollection<MembershipPlanBranch> PlanBranches { get; set; } = [];
}
