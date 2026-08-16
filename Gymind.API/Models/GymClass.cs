using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("classes")]
public class GymClass
{
    [Key]
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long? TrainerUserId { get; set; }
    public string? Name { get; set; }
    public int? Capacity { get; set; }
    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
}
