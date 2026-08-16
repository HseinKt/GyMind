using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("branches")]
public class Branch
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("gym_id")]
    public long? GymId { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("address")]
    public string? Address { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("range_km")]
    public decimal? RangeKm { get; set; }

    [Column("capacity")]
    public int? Capacity { get; set; }

    [Column("area_sqm")]
    public decimal? AreaSqm { get; set; }

    // ✅ NEW: direct coordinates (instead of Location object)
    [Column("lat")]
    public double? Lat { get; set; }

    [Column("lng")]
    public double? Lng { get; set; }

    [Column("open_time")]
    public TimeOnly? OpenTime { get; set; }

    [Column("close_time")]
    public TimeOnly? CloseTime { get; set; }

    [Column("qr_code_token")]
    public string? QrCodeToken { get; set; }

    [Column("qr_code_created_at")]
    public DateTime? QrCodeCreatedAt { get; set; }

    [Column("qr_code_updated_at")]
    public DateTime? QrCodeUpdatedAt { get; set; }

    [Column("qr_code_is_active")]
    public bool QrCodeIsActive { get; set; } = true;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Navigation
    [ForeignKey("GymId")]
    public virtual Gym? Gym { get; set; }
}
