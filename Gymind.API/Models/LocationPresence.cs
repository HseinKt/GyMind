using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("location_presence")]
public class LocationPresence
{
    [Key]
    public long Id { get; set; }
    public long UserId { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public bool InsideGym { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }
}
