using System.Security.Claims;
using Gymind.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gymind.API.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController : ControllerBase
{
    private const long MaxPhotoBytes = 5 * 1024 * 1024;
    private const string BucketName = "profile-photos";
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".heic"];
    private static readonly HashSet<string> AllowedContentTypes = ["image/jpeg", "image/png", "image/heic", "image/heif"];
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpClientFactory _httpClientFactory;

    public MeController(
        ApplicationDbContext context,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
        _httpClientFactory = httpClientFactory;
    }

    [HttpPost("profile-photo")]
    [RequestSizeLimit(MaxPhotoBytes)]
    public async Task<IActionResult> UploadProfilePhoto(IFormFile? file)
    {
        var user = await GetCurrentUser();
        if (user == null)
        {
            return Unauthorized();
        }

        var validation = ValidatePhoto(file);
        if (validation != null)
        {
            return BadRequest(new { message = validation });
        }

        var extension = NormalizeExtension(Path.GetExtension(file!.FileName));
        var objectKey = $"{user.Id}/{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}{extension}";
        var profilePhotoUrl = await SavePhoto(file, objectKey);

        user.ProfilePhotoUrl = profilePhotoUrl;
        await _context.SaveChangesAsync();

        return Ok(new { profilePhotoUrl });
    }

    [HttpDelete("profile-photo")]
    public async Task<IActionResult> DeleteProfilePhoto()
    {
        var user = await GetCurrentUser();
        if (user == null)
        {
            return Unauthorized();
        }

        await TryDeletePhoto(user.ProfilePhotoUrl);
        user.ProfilePhotoUrl = null;
        await _context.SaveChangesAsync();

        return Ok(new { profilePhotoUrl = (string?)null });
    }

    private async Task<Models.User?> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(userId, out var parsedUserId)
            ? await _context.Users.FirstOrDefaultAsync(user => user.Id == parsedUserId && user.IsActive)
            : null;
    }

    private static string? ValidatePhoto(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return "Please choose a profile photo to upload.";
        }

        if (file.Length > MaxPhotoBytes)
        {
            return "Profile photo must be 5MB or smaller.";
        }

        var extension = NormalizeExtension(Path.GetExtension(file.FileName));
        if (!AllowedExtensions.Contains(extension))
        {
            return "Profile photo must be JPG, PNG, JPEG, or HEIC.";
        }

        if (!string.IsNullOrWhiteSpace(file.ContentType) && !AllowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return "Profile photo file type is not supported.";
        }

        return null;
    }

    private async Task<string> SavePhoto(IFormFile file, string objectKey)
    {
        var supabaseUrl = _configuration["Supabase:Url"];
        var serviceRoleKey = _configuration["Supabase:ServiceRoleKey"];
        if (!string.IsNullOrWhiteSpace(supabaseUrl) && !string.IsNullOrWhiteSpace(serviceRoleKey))
        {
            return await SaveToSupabaseStorage(file, objectKey, supabaseUrl.TrimEnd('/'), serviceRoleKey);
        }

        return await SaveToLocalStorage(file, objectKey);
    }

    private async Task<string> SaveToSupabaseStorage(IFormFile file, string objectKey, string supabaseUrl, string serviceRoleKey)
    {
        await using var stream = file.OpenReadStream();
        using var content = new StreamContent(stream);
        content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(string.IsNullOrWhiteSpace(file.ContentType) ? "image/jpeg" : file.ContentType);
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", serviceRoleKey);
        client.DefaultRequestHeaders.Add("apikey", serviceRoleKey);

        var response = await client.PostAsync($"{supabaseUrl}/storage/v1/object/{BucketName}/{objectKey}", content);
        if (!response.IsSuccessStatusCode)
        {
            var message = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Profile photo upload failed: {message}");
        }

        return $"{supabaseUrl}/storage/v1/object/public/{BucketName}/{objectKey}";
    }

    private async Task<string> SaveToLocalStorage(IFormFile file, string objectKey)
    {
        var segments = objectKey.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var safeUserSegment = segments[0];
        var safeFileName = segments.Length > 1 ? segments[1] : $"{Guid.NewGuid():N}.jpg";
        var uploadRoot = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", BucketName, safeUserSegment);
        Directory.CreateDirectory(uploadRoot);
        var filePath = Path.Combine(uploadRoot, safeFileName);
        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        return $"{Request.Scheme}://{Request.Host}/uploads/{BucketName}/{safeUserSegment}/{safeFileName}";
    }

    private async Task TryDeletePhoto(string? profilePhotoUrl)
    {
        if (string.IsNullOrWhiteSpace(profilePhotoUrl))
        {
            return;
        }

        var supabaseUrl = _configuration["Supabase:Url"]?.TrimEnd('/');
        var serviceRoleKey = _configuration["Supabase:ServiceRoleKey"];
        if (!string.IsNullOrWhiteSpace(supabaseUrl) && !string.IsNullOrWhiteSpace(serviceRoleKey) && profilePhotoUrl.StartsWith(supabaseUrl, StringComparison.OrdinalIgnoreCase))
        {
            var marker = $"/storage/v1/object/public/{BucketName}/";
            var markerIndex = profilePhotoUrl.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (markerIndex >= 0)
            {
                var objectKey = profilePhotoUrl[(markerIndex + marker.Length)..];
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", serviceRoleKey);
                client.DefaultRequestHeaders.Add("apikey", serviceRoleKey);
                await client.DeleteAsync($"{supabaseUrl}/storage/v1/object/{BucketName}/{objectKey}");
            }
            return;
        }

        var localMarker = $"/uploads/{BucketName}/";
        var localIndex = profilePhotoUrl.IndexOf(localMarker, StringComparison.OrdinalIgnoreCase);
        if (localIndex < 0)
        {
            return;
        }

        var relativePath = profilePhotoUrl[(localIndex + localMarker.Length)..].Replace('/', Path.DirectorySeparatorChar);
        var root = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", BucketName);
        var fullPath = Path.GetFullPath(Path.Combine(root, relativePath));
        if (fullPath.StartsWith(Path.GetFullPath(root), StringComparison.OrdinalIgnoreCase) && System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }
    }

    private static string NormalizeExtension(string? extension)
    {
        var normalized = string.IsNullOrWhiteSpace(extension) ? ".jpg" : extension.ToLowerInvariant();
        return normalized == ".jpeg" ? ".jpg" : normalized;
    }
}
