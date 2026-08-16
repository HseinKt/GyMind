namespace Gymind.API.Security;

public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string GymOwner = "GymOwner";
    public const string BranchManager = "BranchManager";
    public const string Trainer = "Trainer";
    public const string Staff = "Staff";
    public const string Member = "Member";

    public const string AdminRoles = SuperAdmin + "," + GymOwner + "," + BranchManager;
    public const string AdminOperatorRoles = AdminRoles + "," + Staff;
    public const string SchedulingRoles = AdminRoles + "," + Trainer;
    public const string AttendanceRoles = AdminOperatorRoles + "," + Member;
    public const string OwnerRoles = SuperAdmin + "," + GymOwner;

    public static readonly IReadOnlyList<string> All =
    [
        SuperAdmin,
        GymOwner,
        BranchManager,
        Trainer,
        Staff,
        Member
    ];
}
