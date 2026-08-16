using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Gymind.API.Models;

namespace Gymind.API.Helpers;

public class JwtHelper
{
    private readonly IConfiguration _configuration;
    
    public JwtHelper(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    
    public string GenerateToken(User user, Role role)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.Name, user.FullName ?? string.Empty),
            new Claim(ClaimTypes.Role, role.Name),
            new Claim("GymId", user.GymId?.ToString() ?? string.Empty),
            new Claim("BranchId", user.BranchId?.ToString() ?? string.Empty)
        };
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? "Gymind-Default-Key-For-Development-12345"));
        
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "Gymind",
            audience: _configuration["Jwt:Audience"] ?? "GymindAPI",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}