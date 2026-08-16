using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Gymind.API.Models;

[Table("employees")]
public class Employee
{
    [Key]
    public long Id { get; set; }
    public long? UserId { get; set; }
    public long? GymId { get; set; }
    public long? BranchId { get; set; }
    public string? Position { get; set; }
    public decimal? Salary { get; set; }
    public DateOnly? HireDate { get; set; }
}
