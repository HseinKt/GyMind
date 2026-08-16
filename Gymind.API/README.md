# Gymind.API

ASP.NET Core Web API for Gymind. This backend is the only source of truth for member auth, attendance, membership access, bookings, and Supabase PostgreSQL data.

## Configuration

Store secrets with .NET user-secrets or environment variables. Do not commit real connection strings or JWT keys.

```powershell
dotnet user-secrets set "ConnectionStrings:SupabaseConnection" "Host=YOUR_SUPABASE_HOST;Port=5432;Database=postgres;Username=YOUR_USER;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
dotnet user-secrets set "Jwt:Key" "replace-with-at-least-32-characters"
```

Environment variable alternatives:

```powershell
$env:ConnectionStrings__SupabaseConnection="Host=YOUR_SUPABASE_HOST;Port=5432;Database=postgres;Username=YOUR_USER;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
$env:Jwt__Key="replace-with-at-least-32-characters"
```

## Run

```powershell
dotnet restore
dotnet run --urls "http://0.0.0.0:5156"
```

Swagger:

- Local PC: http://localhost:5156/swagger
- Phone on same Wi-Fi: http://YOUR_PC_IPV4:5156/swagger

If a physical phone cannot reach Swagger, allow `dotnet.exe` or TCP port `5156` through Windows Firewall.
