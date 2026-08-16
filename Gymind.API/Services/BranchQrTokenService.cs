using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Gymind.API.Services;

public class BranchQrTokenService
{
    private const string Prefix = "FHQR";
    private static readonly TimeSpan RotationWindow = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan AllowedClockSkew = TimeSpan.FromSeconds(90);
    private readonly byte[] _secret;

    public BranchQrTokenService(IConfiguration configuration)
    {
        var secret = configuration["Qr:SigningKey"]
            ?? configuration["Jwt:Key"]
            ?? "Gymind-Branch-QR-Secret-Key-2026";
        _secret = Encoding.UTF8.GetBytes(secret);
    }

    public (string Token, DateTimeOffset IssuedAtUtc, DateTimeOffset ExpiresAtUtc) CreateToken(long branchId, DateTimeOffset? now = null)
    {
        var current = now ?? DateTimeOffset.UtcNow;
        var issuedAtUtc = FloorToWindow(current);
        var payload = BuildPayload(branchId, issuedAtUtc);
        var signature = ComputeSignature(payload);
        return ($"{Prefix}|{payload}|{signature}", issuedAtUtc, issuedAtUtc.Add(RotationWindow));
    }

    public bool TryValidate(string token, out long branchId, out DateTimeOffset issuedAtUtc, out string failureReason)
    {
        return TryValidate(token, enforceExpiry: true, out branchId, out issuedAtUtc, out failureReason);
    }

    public bool TryValidateStaticBranch(string token, out long branchId, out string failureReason)
    {
        var valid = TryValidate(token, enforceExpiry: false, out branchId, out _, out failureReason);
        if (failureReason.Contains("expired", StringComparison.OrdinalIgnoreCase))
        {
            failureReason = "QR token is invalid.";
        }

        return valid;
    }

    private bool TryValidate(string token, bool enforceExpiry, out long branchId, out DateTimeOffset issuedAtUtc, out string failureReason)
    {
        branchId = 0;
        issuedAtUtc = DateTimeOffset.MinValue;
        failureReason = "QR token is invalid.";

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var parts = token.Split('|', StringSplitOptions.TrimEntries);
        if (parts.Length != 4 || !string.Equals(parts[0], Prefix, StringComparison.Ordinal))
        {
            return false;
        }

        if (!long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out branchId))
        {
            failureReason = "QR token branch is invalid.";
            return false;
        }

        if (!long.TryParse(parts[2], NumberStyles.None, CultureInfo.InvariantCulture, out var issuedSeconds))
        {
            failureReason = "QR token time is invalid.";
            return false;
        }

        issuedAtUtc = DateTimeOffset.FromUnixTimeSeconds(issuedSeconds);
        var payload = BuildPayload(branchId, issuedAtUtc);
        var expectedSignature = ComputeSignature(payload);
        if (!string.Equals(parts[3], expectedSignature, StringComparison.Ordinal))
        {
            failureReason = "QR token signature is invalid.";
            return false;
        }

        var age = DateTimeOffset.UtcNow - issuedAtUtc;
        if (enforceExpiry && (age.Duration() > AllowedClockSkew || age < TimeSpan.Zero - AllowedClockSkew))
        {
            failureReason = "QR token expired. Scan the latest branch QR.";
            return false;
        }

        return true;
    }

    private static DateTimeOffset FloorToWindow(DateTimeOffset value)
    {
        var seconds = value.ToUnixTimeSeconds();
        var windowStart = seconds - (seconds % (long)RotationWindow.TotalSeconds);
        return DateTimeOffset.FromUnixTimeSeconds(windowStart);
    }

    private static string BuildPayload(long branchId, DateTimeOffset issuedAtUtc) =>
        $"{branchId}|{issuedAtUtc.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture)}";

    private string ComputeSignature(string payload)
    {
        using var hmac = new HMACSHA256(_secret);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash[..12]);
    }
}
