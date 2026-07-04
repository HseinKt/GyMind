using System.Text.RegularExpressions;

namespace ForgeHub.API.Helpers;

public static class PasswordValidator
{
    private static readonly Regex PasswordRegex = new Regex(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$", RegexOptions.Compiled);

    public static bool IsStrongPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password)) return false;
        return PasswordRegex.IsMatch(password);
    }
}
