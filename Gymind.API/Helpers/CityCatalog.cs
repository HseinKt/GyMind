namespace Gymind.API.Helpers;

public static class CityCatalog
{
    private static readonly string[] Cities =
    [
        "Ablah",
        "Aley",
        "Baalbek",
        "Beiru",
        "Beirut",
        "Batroun",
        "Bcharre",
        "Bhamdoun",
        "Byblos",
        "Damour",
        "Jbail",
        "Jbeil",
        "Jounieh",
        "Nabatieh",
        "Saida",
        "Sour",
        "Sidon",
        "Tripoli",
        "Tyre",
        "Zahle"
    ];

    public static IReadOnlyList<string> All => Cities;

    public static bool IsKnown(string? city)
    {
        if (string.IsNullOrWhiteSpace(city))
        {
            return false;
        }

        return Cities.Any(item => string.Equals(item, city.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public static string? Normalize(string? city)
    {
        if (string.IsNullOrWhiteSpace(city))
        {
            return null;
        }

        var trimmed = city.Trim();
        return Cities.FirstOrDefault(item => string.Equals(item, trimmed, StringComparison.OrdinalIgnoreCase)) ?? trimmed;
    }

    public static bool IsAllowedForCreate(string? city) => IsKnown(city);

    public static bool IsAllowedForUpdate(string? city, string? currentCity)
    {
        if (string.IsNullOrWhiteSpace(city))
        {
            return true;
        }

        if (IsKnown(city))
        {
            return true;
        }

        return !string.IsNullOrWhiteSpace(currentCity) && string.Equals(currentCity.Trim(), city.Trim(), StringComparison.OrdinalIgnoreCase);
    }
}
