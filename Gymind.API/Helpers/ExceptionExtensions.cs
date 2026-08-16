namespace Gymind.API.Helpers;

public static class ExceptionExtensions
{
    public static string ToDetailedMessage(this Exception ex)
    {
        var messages = new List<string>();
        Exception? current = ex;

        while (current != null)
        {
            if (!string.IsNullOrWhiteSpace(current.Message))
            {
                messages.Add(current.Message);
            }

            current = current.InnerException;
        }

        return string.Join(" | ", messages.Distinct());
    }
}
