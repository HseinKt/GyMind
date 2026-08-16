namespace Gymind.API.DTOs;

public class MemberBranchAccessDto
{
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string OpenTime { get; set; } = string.Empty;
    public string CloseTime { get; set; } = string.Empty;
    public bool IsOpenNow { get; set; }
    public int Capacity { get; set; }
    public int CurrentOccupancy { get; set; }
    public int RemainingSpots { get; set; }
    public decimal CapacityPercentage { get; set; }
    public string Status { get; set; } = "Closed";
    public bool CanCheckIn { get; set; }
    public bool MembershipAccess { get; set; }
    public double? Lat { get; set; }
    public double? Lng { get; set; }
}
