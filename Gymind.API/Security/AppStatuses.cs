namespace Gymind.API.Security;

public static class AppStatuses
{
    public const string MembershipActive = "ACTIVE";
    public const string MembershipExpired = "EXPIRED";
    public const string MembershipFrozen = "FROZEN";
    public const string MembershipCancelled = "CANCELLED";
    public const string MembershipPending = "PENDING";

    public const string BookingBooked = "BOOKED";
    public const string BookingCancelled = "CANCELLED";

    public const string CheckInCheckedIn = "active";
    public const string CheckInCheckedOut = "checked_out";
    public const string CheckInAutoCheckedOut = "auto_checked_out";

    public const string PaymentPaid = "PAID";
    public const string PaymentPending = "PENDING";
    public const string PaymentVoided = "VOIDED";
    public const string PaymentRefunded = "REFUNDED";

    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Trim()
            .Replace(" ", "_", StringComparison.Ordinal)
            .Replace("-", "_", StringComparison.Ordinal)
            .ToUpperInvariant();
    }

    public static string NormalizeMembership(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "ACTIVE" => MembershipActive,
            "EXPIRED" => MembershipExpired,
            "FROZEN" => MembershipFrozen,
            "CANCELLED" or "CANCELED" => MembershipCancelled,
            "PENDING" => MembershipPending,
            _ => MembershipPending
        };
    }

    public static string NormalizeBooking(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "BOOKED" => BookingBooked,
            "CANCELLED" or "CANCELED" => BookingCancelled,
            _ => BookingBooked
        };
    }

    public static string NormalizeCheckIn(string? value)
    {
        var normalized = Normalize(value);
        return normalized switch
        {
            "OPEN" or "ACTIVE" or "CHECKEDIN" or "CHECKED_IN" => CheckInCheckedIn,
            "CLOSED" or "CHECKEDOUT" or "CHECKED_OUT" => CheckInCheckedOut,
            "AUTOCHECKEDOUT" or "AUTO_CHECKED_OUT" => CheckInAutoCheckedOut,
            _ => CheckInCheckedIn
        };
    }

    public static bool IsActiveMembership(string? value) =>
        string.Equals(NormalizeMembership(value), MembershipActive, StringComparison.Ordinal);

    public static bool IsBooked(string? value) =>
        string.Equals(NormalizeBooking(value), BookingBooked, StringComparison.Ordinal);
}
