using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("members")]
public class Member
{
    [Key]
    public long Id { get; set; }
    public long? GymId { get; set; }
    public long? HomeBranchId { get; set; }
    public long? UserId { get; set; }
    public string? FullName { get; set; }
    public string? Gender { get; set; }
    public DateOnly? Dob { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? QrCode { get; set; }
    public DateOnly? JoinDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public bool IsActive { get; set; } = true;
    
    [ForeignKey("GymId")]
    public virtual Gym? Gym { get; set; }
    
    [ForeignKey("HomeBranchId")]
    public virtual Branch? HomeBranch { get; set; }

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }

    public virtual MemberProfile? Profile { get; set; }
}
