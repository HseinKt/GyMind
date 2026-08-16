using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("users")]
public class User
{
    [Key]
    public long Id { get; set; }
    
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public long RoleId { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public string? PasswordHash { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("RoleId")]
    public virtual Role? Role { get; set; }
    
    [ForeignKey("GymId")]
    public virtual Gym? Gym { get; set; }
    
    [ForeignKey("BranchId")]
    public virtual Branch? Branch { get; set; }
}
