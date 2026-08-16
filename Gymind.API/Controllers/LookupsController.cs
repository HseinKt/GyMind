using System.Net.Http.Headers;
using System.Text.Json;
using Gymind.API.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LookupsController : ControllerBase
{
    private static readonly HttpClient NominatimClient = CreateNominatimClient();

    [HttpGet("cities")]
    public IActionResult GetCities()
    {
        return Ok(CityCatalog.All);
    }

    [HttpGet("cities/search")]
    public async Task<IActionResult> SearchCities([FromQuery] string q, CancellationToken cancellationToken)
    {
        var query = q?.Trim() ?? string.Empty;
        if (query.Length < 2)
        {
            return Ok(Array.Empty<JsonElement>());
        }

        var url =
            $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(query)}&format=json&featuretype=city&addressdetails=1&limit=6";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await NominatimClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return StatusCode((int)response.StatusCode, new { message = "Unable to load city suggestions." });
        }

        return Content(body, "application/json");
    }

    private static HttpClient CreateNominatimClient()
    {
        var client = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(10)
        };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Gymind/1.0");
        return client;
    }
}
