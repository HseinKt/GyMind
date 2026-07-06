using System.Text;
using ForgeHub.API.Data;
using ForgeHub.API.Helpers;
using ForgeHub.API.Middleware;
using ForgeHub.API.Security;
using ForgeHub.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var connectionString = builder.Configuration.GetConnectionString("SupabaseConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:SupabaseConnection is required.");
}

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    if (builder.Environment.IsDevelopment())
    {
        jwtKey = "ForgeHub-Development-Jwt-Key-At-Least-32-Characters";
    }
    else
    {
        throw new InvalidOperationException("Jwt:Key is required in production.");
    }
}

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ForgeHub API",
        Version = "v1",
        Description = "ForgeHub backend connected to Supabase PostgreSQL."
    });

    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        Description = "Enter JWT Bearer token",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = JwtBearerDefaults.AuthenticationScheme
        }
    };

    options.AddSecurityDefinition(jwtSecurityScheme.Reference.Id, jwtSecurityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [jwtSecurityScheme] = Array.Empty<string>()
    });
});

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions => npgsqlOptions.CommandTimeout(30))
        .EnableDetailedErrors()
        .EnableSensitiveDataLogging(builder.Environment.IsDevelopment()));

builder.Services.AddScoped<JwtHelper>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICheckInService, CheckInService>();
builder.Services.AddScoped<IMemberBranchAccessService, MemberBranchAccessService>();
builder.Services.AddScoped<MemberExperienceService>();
builder.Services.AddSingleton<BranchQrTokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ForgeHub",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ForgeHubAPI",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AppRoles.SuperAdmin, policy => policy.RequireRole(AppRoles.SuperAdmin));
    options.AddPolicy(AppRoles.GymOwner, policy => policy.RequireRole(AppRoles.GymOwner));
    options.AddPolicy(AppRoles.BranchManager, policy => policy.RequireRole(AppRoles.BranchManager));
    options.AddPolicy(AppRoles.Staff, policy => policy.RequireRole(AppRoles.Staff));
    options.AddPolicy(AppRoles.Trainer, policy => policy.RequireRole(AppRoles.Trainer));
    options.AddPolicy(AppRoles.Member, policy => policy.RequireRole(AppRoles.Member));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        if (await dbContext.Database.CanConnectAsync())
        {
            await EnsureDeploymentSchemaAsync(dbContext);
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("Deployment schema check failed: " + ex.Message);
    }
}

var seedDatabase = app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("SeedDatabase");
if (seedDatabase)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    try
    {
        Console.WriteLine("Seeding database...");
        if (await dbContext.Database.CanConnectAsync())
        {
            await DataSeeder.SeedAsync(dbContext);
            Console.WriteLine("Seeding completed.");
        }
        else
        {
            Console.WriteLine("Cannot connect to DB. Skipping seeding.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("Seeding failed: " + ex.Message);
    }
}

app.UseCors("DevCors");
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSwagger();
app.UseSwaggerUI();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<ActiveUserMiddleware>();

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "ForgeHub.API",
    timestamp = DateTime.UtcNow
}));

app.MapControllers();

app.Run();

static async Task EnsureDeploymentSchemaAsync(ApplicationDbContext dbContext)
{
    await dbContext.Database.ExecuteSqlRawAsync("""
        ALTER TABLE IF EXISTS users
          ADD COLUMN IF NOT EXISTS profile_photo_url text;

        CREATE TABLE IF NOT EXISTS device_approvals (
          id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          user_id bigint NOT NULL REFERENCES users(id),
          device_id text NOT NULL,
          is_approved boolean NOT NULL DEFAULT false,
          last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
          created_at timestamp with time zone DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS ix_device_approvals_user_id
          ON device_approvals (user_id);

        CREATE TABLE IF NOT EXISTS otp_records (
          id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          user_id bigint NOT NULL REFERENCES users(id),
          device_id text NOT NULL,
          otp_code text NOT NULL,
          expires_at timestamp with time zone NOT NULL,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          is_used boolean NOT NULL DEFAULT false
        );

        CREATE INDEX IF NOT EXISTS ix_otp_records_user_device
          ON otp_records (user_id, device_id);

        CREATE TABLE IF NOT EXISTS refresh_sessions (
          id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          user_id bigint NOT NULL REFERENCES users(id),
          refresh_token text NOT NULL UNIQUE,
          expires_at timestamp with time zone NOT NULL,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          revoked_at timestamp with time zone
        );

        CREATE INDEX IF NOT EXISTS ix_refresh_sessions_user_id
          ON refresh_sessions (user_id);

        CREATE TABLE IF NOT EXISTS location_presence (
          id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          user_id bigint NOT NULL UNIQUE REFERENCES users(id),
          latitude numeric NOT NULL,
          longitude numeric NOT NULL,
          inside_gym boolean NOT NULL,
          updated_at timestamp with time zone NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS workout_sessions (
          id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          user_id bigint NOT NULL REFERENCES users(id),
          duration_seconds integer NOT NULL,
          completed_at timestamp with time zone NOT NULL,
          created_at timestamp with time zone NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS ix_workout_sessions_user_id
          ON workout_sessions (user_id);

        CREATE TABLE IF NOT EXISTS member_profiles (
          id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          member_id bigint NOT NULL UNIQUE REFERENCES members(id),
          height_cm numeric,
          weight_kg numeric,
          fitness_goal text,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now()
        );

        ALTER TABLE IF EXISTS member_profiles
          ADD COLUMN IF NOT EXISTS target_weight_kg numeric,
          ADD COLUMN IF NOT EXISTS body_fat_percentage numeric,
          ADD COLUMN IF NOT EXISTS waist_cm numeric,
          ADD COLUMN IF NOT EXISTS chest_cm numeric,
          ADD COLUMN IF NOT EXISTS shoulder_cm numeric,
          ADD COLUMN IF NOT EXISTS hip_cm numeric,
          ADD COLUMN IF NOT EXISTS neck_cm numeric,
          ADD COLUMN IF NOT EXISTS arm_cm numeric,
          ADD COLUMN IF NOT EXISTS thigh_cm numeric,
          ADD COLUMN IF NOT EXISTS activity_level text,
          ADD COLUMN IF NOT EXISTS training_experience text,
          ADD COLUMN IF NOT EXISTS favorite_workout_type text,
          ADD COLUMN IF NOT EXISTS preferred_training_days text,
          ADD COLUMN IF NOT EXISTS preferred_workout_time text,
          ADD COLUMN IF NOT EXISTS blood_type text,
          ADD COLUMN IF NOT EXISTS medical_conditions text,
          ADD COLUMN IF NOT EXISTS allergies text,
          ADD COLUMN IF NOT EXISTS injuries text,
          ADD COLUMN IF NOT EXISTS medications text,
          ADD COLUMN IF NOT EXISTS doctor_clearance_required boolean NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS health_notes text,
          ADD COLUMN IF NOT EXISTS emergency_contact_name text,
          ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
          ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
          ADD COLUMN IF NOT EXISTS emergency_contact_alt_phone text,
          ADD COLUMN IF NOT EXISTS daily_calories_target numeric,
          ADD COLUMN IF NOT EXISTS protein_target_grams numeric,
          ADD COLUMN IF NOT EXISTS carbs_target_grams numeric,
          ADD COLUMN IF NOT EXISTS fat_target_grams numeric,
          ADD COLUMN IF NOT EXISTS water_target_ml numeric,
          ADD COLUMN IF NOT EXISTS language text,
          ADD COLUMN IF NOT EXISTS theme text,
          ADD COLUMN IF NOT EXISTS measurement_unit text,
          ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true,
          ADD COLUMN IF NOT EXISTS profile_photo_url text,
          ADD COLUMN IF NOT EXISTS profile_completion_percentage numeric,
          ADD COLUMN IF NOT EXISTS dob date,
          ADD COLUMN IF NOT EXISTS gender text,
          ADD COLUMN IF NOT EXISTS qr_code text,
          ADD COLUMN IF NOT EXISTS trainer_name text;

        INSERT INTO member_profiles (
          member_id,
          height_cm,
          weight_kg,
          fitness_goal,
          created_at,
          updated_at
        )
        SELECT
          members.id,
          176,
          74,
          'Build strength and improve conditioning',
          now(),
          now()
        FROM members
        LEFT JOIN member_profiles
          ON member_profiles.member_id = members.id
        WHERE member_profiles.member_id IS NULL;
        """);
}
