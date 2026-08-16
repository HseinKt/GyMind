using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("gyms")]
public class Gym
{
    [Key]
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public long? OwnerUserId { get; set; }
    public string? LogoUrl { get; set; }
    public string? City { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    
    [ForeignKey("OwnerUserId")]
    public virtual User? OwnerUser { get; set; }
}