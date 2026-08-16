using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("class_bookings")]
public class ClassBooking
{
    [Key]
    public long Id { get; set; }
    public long? ClassId { get; set; }
    public long? MemberId { get; set; }
    public string? Status { get; set; }
    public DateTime? BookedAt { get; set; }
    public bool Attended { get; set; }
    public DateTime? AttendedAt { get; set; }
}
