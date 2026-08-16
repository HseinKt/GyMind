using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("diet_plans")]
public class DietPlan
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("member_id")]
    public long MemberId { get; set; }

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("daily_calories_target")]
    public int? DailyCaloriesTarget { get; set; }

    [Column("protein_grams")]
    public int? ProteinGrams { get; set; }

    [Column("carbs_grams")]
    public int? CarbsGrams { get; set; }

    [Column("fat_grams")]
    public int? FatGrams { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(MemberId))]
    public virtual Member? Member { get; set; }
}
