using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Gymind.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDietPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: true),
                    action = table.Column<string>(type: "text", nullable: true),
                    table_name = table.Column<string>(type: "text", nullable: true),
                    record_id = table.Column<long>(type: "bigint", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "class_bookings",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    class_id = table.Column<long>(type: "bigint", nullable: true),
                    member_id = table.Column<long>(type: "bigint", nullable: true),
                    status = table.Column<string>(type: "text", nullable: true),
                    booked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    attended = table.Column<bool>(type: "boolean", nullable: false),
                    attended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_class_bookings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "classes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    branch_id = table.Column<long>(type: "bigint", nullable: true),
                    trainer_user_id = table.Column<long>(type: "bigint", nullable: true),
                    name = table.Column<string>(type: "text", nullable: true),
                    capacity = table.Column<int>(type: "integer", nullable: true),
                    start_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    end_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_classes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "employees",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: true),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    branch_id = table.Column<long>(type: "bigint", nullable: true),
                    position = table.Column<string>(type: "text", nullable: true),
                    salary = table.Column<decimal>(type: "numeric", nullable: true),
                    hire_date = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employees", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notification_recipients",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    notification_id = table.Column<long>(type: "bigint", nullable: true),
                    user_id = table.Column<long>(type: "bigint", nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification_recipients", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    branch_id = table.Column<long>(type: "bigint", nullable: true),
                    title = table.Column<string>(type: "text", nullable: true),
                    message = table.Column<string>(type: "text", nullable: true),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "trainer_sessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    trainer_user_id = table.Column<long>(type: "bigint", nullable: true),
                    member_id = table.Column<long>(type: "bigint", nullable: true),
                    branch_id = table.Column<long>(type: "bigint", nullable: true),
                    session_type = table.Column<string>(type: "text", nullable: true),
                    session_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trainer_sessions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "branches",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    address = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: true),
                    range_km = table.Column<decimal>(type: "numeric", nullable: true),
                    capacity = table.Column<int>(type: "integer", nullable: true),
                    area_sqm = table.Column<decimal>(type: "numeric", nullable: true),
                    lat = table.Column<double>(type: "double precision", nullable: true),
                    lng = table.Column<double>(type: "double precision", nullable: true),
                    open_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    close_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    qr_code_token = table.Column<string>(type: "text", nullable: true),
                    qr_code_created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    qr_code_updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    qr_code_is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_branches", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "check_ins",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    member_id = table.Column<long>(type: "bigint", nullable: true),
                    branch_id = table.Column<long>(type: "bigint", nullable: true),
                    check_in_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    check_out_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_seen_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: true),
                    method = table.Column<string>(type: "text", nullable: true),
                    check_out_method = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_check_ins", x => x.id);
                    table.ForeignKey(
                        name: "FK_check_ins_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "device_approvals",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    device_id = table.Column<string>(type: "text", nullable: false),
                    is_approved = table.Column<bool>(type: "boolean", nullable: false),
                    last_updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_device_approvals", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "diet_plans",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    member_id = table.Column<long>(type: "bigint", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    daily_calories_target = table.Column<int>(type: "integer", nullable: true),
                    protein_grams = table.Column<int>(type: "integer", nullable: true),
                    carbs_grams = table.Column<int>(type: "integer", nullable: true),
                    fat_grams = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_diet_plans", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "gym_subscriptions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    plan_name = table.Column<string>(type: "text", nullable: true),
                    amount = table.Column<decimal>(type: "numeric", nullable: true),
                    currency = table.Column<string>(type: "text", nullable: true),
                    due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    paid_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: true),
                    notice_started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    locked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_gym_subscriptions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "gyms",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    owner_user_id = table.Column<long>(type: "bigint", nullable: true),
                    logo_url = table.Column<string>(type: "text", nullable: true),
                    city = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_gyms", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "membership_plans",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    name = table.Column<string>(type: "text", nullable: true),
                    price = table.Column<decimal>(type: "numeric", nullable: true),
                    duration_months = table.Column<int>(type: "integer", nullable: true),
                    access_type = table.Column<string>(type: "text", nullable: true),
                    includes_classes = table.Column<bool>(type: "boolean", nullable: false),
                    includes_pt = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_membership_plans", x => x.id);
                    table.ForeignKey(
                        name: "FK_membership_plans_gyms_gym_id",
                        column: x => x.gym_id,
                        principalTable: "gyms",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    branch_id = table.Column<long>(type: "bigint", nullable: true),
                    role_id = table.Column<long>(type: "bigint", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: true),
                    profile_photo_url = table.Column<string>(type: "text", nullable: true),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                    table.ForeignKey(
                        name: "FK_users_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_users_gyms_gym_id",
                        column: x => x.gym_id,
                        principalTable: "gyms",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_users_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "membership_plan_branches",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    membership_plan_id = table.Column<long>(type: "bigint", nullable: false),
                    branch_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_membership_plan_branches", x => x.id);
                    table.ForeignKey(
                        name: "FK_membership_plan_branches_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_membership_plan_branches_membership_plans_membership_plan_id",
                        column: x => x.membership_plan_id,
                        principalTable: "membership_plans",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "location_presence",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    latitude = table.Column<decimal>(type: "numeric", nullable: false),
                    longitude = table.Column<decimal>(type: "numeric", nullable: false),
                    inside_gym = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_location_presence", x => x.id);
                    table.ForeignKey(
                        name: "FK_location_presence_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "members",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    home_branch_id = table.Column<long>(type: "bigint", nullable: true),
                    user_id = table.Column<long>(type: "bigint", nullable: true),
                    full_name = table.Column<string>(type: "text", nullable: true),
                    gender = table.Column<string>(type: "text", nullable: true),
                    dob = table.Column<DateOnly>(type: "date", nullable: true),
                    phone = table.Column<string>(type: "text", nullable: true),
                    email = table.Column<string>(type: "text", nullable: true),
                    qr_code = table.Column<string>(type: "text", nullable: true),
                    join_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_members", x => x.id);
                    table.ForeignKey(
                        name: "FK_members_branches_home_branch_id",
                        column: x => x.home_branch_id,
                        principalTable: "branches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_members_gyms_gym_id",
                        column: x => x.gym_id,
                        principalTable: "gyms",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_members_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "otp_records",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    device_id = table.Column<string>(type: "text", nullable: false),
                    otp_code = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_used = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_otp_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_otp_records_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "refresh_sessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    refresh_token = table.Column<string>(type: "text", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refresh_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_refresh_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "workout_sessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workout_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_workout_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "member_memberships",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    member_id = table.Column<long>(type: "bigint", nullable: true),
                    plan_id = table.Column<long>(type: "bigint", nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "text", nullable: true),
                    freeze_days = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_member_memberships", x => x.id);
                    table.ForeignKey(
                        name: "FK_member_memberships_members_member_id",
                        column: x => x.member_id,
                        principalTable: "members",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_member_memberships_membership_plans_plan_id",
                        column: x => x.plan_id,
                        principalTable: "membership_plans",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "member_profiles",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    member_id = table.Column<long>(type: "bigint", nullable: false),
                    height_cm = table.Column<decimal>(type: "numeric", nullable: true),
                    weight_kg = table.Column<decimal>(type: "numeric", nullable: true),
                    fitness_goal = table.Column<string>(type: "text", nullable: true),
                    target_weight_kg = table.Column<decimal>(type: "numeric", nullable: true),
                    body_fat_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    waist_cm = table.Column<decimal>(type: "numeric", nullable: true),
                    chest_cm = table.Column<decimal>(type: "numeric", nullable: true),
                    shoulder_cm = table.Column<decimal>(type: "numeric", nullable: true),
                    hip_cm = table.Column<decimal>(type: "numeric", nullable: true),
                    neck_cm = table.Column<decimal>(type: "numeric", nullable: true),
                    arm_cm = table.Column<decimal>(type: "numeric", nullable: true),
                    thigh_cm = table.Column<decimal>(type: "numeric", nullable: true),
                    activity_level = table.Column<string>(type: "text", nullable: true),
                    training_experience = table.Column<string>(type: "text", nullable: true),
                    favorite_workout_type = table.Column<string>(type: "text", nullable: true),
                    preferred_training_days = table.Column<string>(type: "text", nullable: true),
                    preferred_workout_time = table.Column<string>(type: "text", nullable: true),
                    blood_type = table.Column<string>(type: "text", nullable: true),
                    medical_conditions = table.Column<string>(type: "text", nullable: true),
                    allergies = table.Column<string>(type: "text", nullable: true),
                    injuries = table.Column<string>(type: "text", nullable: true),
                    medications = table.Column<string>(type: "text", nullable: true),
                    doctor_clearance_required = table.Column<bool>(type: "boolean", nullable: false),
                    health_notes = table.Column<string>(type: "text", nullable: true),
                    emergency_contact_name = table.Column<string>(type: "text", nullable: true),
                    emergency_contact_relationship = table.Column<string>(type: "text", nullable: true),
                    emergency_contact_phone = table.Column<string>(type: "text", nullable: true),
                    emergency_contact_alt_phone = table.Column<string>(type: "text", nullable: true),
                    daily_calories_target = table.Column<decimal>(type: "numeric", nullable: true),
                    protein_target_grams = table.Column<decimal>(type: "numeric", nullable: true),
                    carbs_target_grams = table.Column<decimal>(type: "numeric", nullable: true),
                    fat_target_grams = table.Column<decimal>(type: "numeric", nullable: true),
                    water_target_ml = table.Column<decimal>(type: "numeric", nullable: true),
                    language = table.Column<string>(type: "text", nullable: true),
                    theme = table.Column<string>(type: "text", nullable: true),
                    measurement_unit = table.Column<string>(type: "text", nullable: true),
                    notifications_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    profile_photo_url = table.Column<string>(type: "text", nullable: true),
                    profile_completion_percentage = table.Column<decimal>(type: "numeric", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_member_profiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_member_profiles_members_member_id",
                        column: x => x.member_id,
                        principalTable: "members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    gym_id = table.Column<long>(type: "bigint", nullable: true),
                    branch_id = table.Column<long>(type: "bigint", nullable: true),
                    member_id = table.Column<long>(type: "bigint", nullable: true),
                    membership_id = table.Column<long>(type: "bigint", nullable: true),
                    received_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    amount = table.Column<decimal>(type: "numeric", nullable: true),
                    method = table.Column<string>(type: "text", nullable: true),
                    paid_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_payments_branches_branch_id",
                        column: x => x.branch_id,
                        principalTable: "branches",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_payments_gyms_gym_id",
                        column: x => x.gym_id,
                        principalTable: "gyms",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_payments_member_memberships_membership_id",
                        column: x => x.membership_id,
                        principalTable: "member_memberships",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_payments_members_member_id",
                        column: x => x.member_id,
                        principalTable: "members",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_payments_users_received_by_user_id",
                        column: x => x.received_by_user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_branches_gym_id",
                table: "branches",
                column: "gym_id");

            migrationBuilder.CreateIndex(
                name: "IX_branches_qr_code_token",
                table: "branches",
                column: "qr_code_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_check_ins_branch_id",
                table: "check_ins",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_check_ins_check_in_time",
                table: "check_ins",
                column: "check_in_time");

            migrationBuilder.CreateIndex(
                name: "IX_check_ins_member_id",
                table: "check_ins",
                column: "member_id",
                unique: true,
                filter: "check_out_time IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_class_bookings_class_id_member_id",
                table: "class_bookings",
                columns: new[] { "class_id", "member_id" },
                unique: true,
                filter: "status IN ('BOOKED', 'Booked')");

            migrationBuilder.CreateIndex(
                name: "IX_classes_branch_id",
                table: "classes",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_classes_start_time",
                table: "classes",
                column: "start_time");

            migrationBuilder.CreateIndex(
                name: "IX_classes_trainer_user_id",
                table: "classes",
                column: "trainer_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_device_approvals_user_id",
                table: "device_approvals",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_diet_plans_member_id",
                table: "diet_plans",
                column: "member_id");

            migrationBuilder.CreateIndex(
                name: "IX_gym_subscriptions_gym_id",
                table: "gym_subscriptions",
                column: "gym_id");

            migrationBuilder.CreateIndex(
                name: "IX_gyms_owner_user_id",
                table: "gyms",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_location_presence_user_id",
                table: "location_presence",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_member_memberships_end_date",
                table: "member_memberships",
                column: "end_date");

            migrationBuilder.CreateIndex(
                name: "IX_member_memberships_member_id",
                table: "member_memberships",
                column: "member_id");

            migrationBuilder.CreateIndex(
                name: "IX_member_memberships_plan_id",
                table: "member_memberships",
                column: "plan_id");

            migrationBuilder.CreateIndex(
                name: "IX_member_memberships_status",
                table: "member_memberships",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_member_profiles_member_id",
                table: "member_profiles",
                column: "member_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_members_gym_id",
                table: "members",
                column: "gym_id");

            migrationBuilder.CreateIndex(
                name: "IX_members_home_branch_id",
                table: "members",
                column: "home_branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_members_user_id",
                table: "members",
                column: "user_id",
                unique: true,
                filter: "user_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_membership_plan_branches_branch_id",
                table: "membership_plan_branches",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_membership_plan_branches_membership_plan_id_branch_id",
                table: "membership_plan_branches",
                columns: new[] { "membership_plan_id", "branch_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_membership_plans_gym_id",
                table: "membership_plans",
                column: "gym_id");

            migrationBuilder.CreateIndex(
                name: "IX_otp_records_user_id",
                table: "otp_records",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_branch_id",
                table: "payments",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_gym_id",
                table: "payments",
                column: "gym_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_member_id",
                table: "payments",
                column: "member_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_membership_id",
                table: "payments",
                column: "membership_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_paid_at",
                table: "payments",
                column: "paid_at");

            migrationBuilder.CreateIndex(
                name: "IX_payments_received_by_user_id",
                table: "payments",
                column: "received_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_sessions_user_id",
                table: "refresh_sessions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_branch_id",
                table: "users",
                column: "branch_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email");

            migrationBuilder.CreateIndex(
                name: "IX_users_gym_id",
                table: "users",
                column: "gym_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_role_id",
                table: "users",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_workout_sessions_user_id",
                table: "workout_sessions",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_branches_gyms_gym_id",
                table: "branches",
                column: "gym_id",
                principalTable: "gyms",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_check_ins_members_member_id",
                table: "check_ins",
                column: "member_id",
                principalTable: "members",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_device_approvals_users_user_id",
                table: "device_approvals",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_diet_plans_members_member_id",
                table: "diet_plans",
                column: "member_id",
                principalTable: "members",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_gym_subscriptions_gyms_gym_id",
                table: "gym_subscriptions",
                column: "gym_id",
                principalTable: "gyms",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_gyms_users_owner_user_id",
                table: "gyms",
                column: "owner_user_id",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_branches_gyms_gym_id",
                table: "branches");

            migrationBuilder.DropForeignKey(
                name: "FK_users_gyms_gym_id",
                table: "users");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "check_ins");

            migrationBuilder.DropTable(
                name: "class_bookings");

            migrationBuilder.DropTable(
                name: "classes");

            migrationBuilder.DropTable(
                name: "device_approvals");

            migrationBuilder.DropTable(
                name: "diet_plans");

            migrationBuilder.DropTable(
                name: "employees");

            migrationBuilder.DropTable(
                name: "gym_subscriptions");

            migrationBuilder.DropTable(
                name: "location_presence");

            migrationBuilder.DropTable(
                name: "member_profiles");

            migrationBuilder.DropTable(
                name: "membership_plan_branches");

            migrationBuilder.DropTable(
                name: "notification_recipients");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "otp_records");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "refresh_sessions");

            migrationBuilder.DropTable(
                name: "trainer_sessions");

            migrationBuilder.DropTable(
                name: "workout_sessions");

            migrationBuilder.DropTable(
                name: "member_memberships");

            migrationBuilder.DropTable(
                name: "members");

            migrationBuilder.DropTable(
                name: "membership_plans");

            migrationBuilder.DropTable(
                name: "gyms");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "branches");

            migrationBuilder.DropTable(
                name: "roles");
        }
    }
}
