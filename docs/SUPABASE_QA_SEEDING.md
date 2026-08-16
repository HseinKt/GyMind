# Supabase QA Seeding

Use this only on a local, development, or test Supabase database. Do not run it on production.

## How To Run

1. Open your Supabase project.
2. In the left sidebar, open **SQL Editor**.
3. Open this local file:
   `C:\Users\USER\OneDrive\Desktop\IN-448\Gymind\database\seeds\supabase_qa_seed.sql`
4. Copy the full SQL content.
5. Paste it into Supabase SQL Editor.
6. Click **Run**.
7. Review the verification query results at the bottom.

## Password

All QA accounts use:

```text
Test@123456
```

The SQL inserts a valid BCrypt hash into `users.password_hash`.

## Test Credentials

| Email | Password | Role | Scenario |
|---|---|---|---|
| qa.superadmin@gymind.test | Test@123456 | SuperAdmin | Platform admin |
| qa.owner.ablahfitness@gymind.test | Test@123456 | GymOwner | Gymind Ablah Fitness owner |
| qa.owner.localgym@gymind.test | Test@123456 | GymOwner | Gymind Local Gym owner |
| qa.owner.sologym@gymind.test | Test@123456 | GymOwner | Gymind Solo Gym owner |
| qa.manager.ablahmain@gymind.test | Test@123456 | BranchManager | Ablah Main manager |
| qa.staff.ablahmain@gymind.test | Test@123456 | Staff | Ablah Main staff |
| qa.trainer.elie@gymind.test | Test@123456 | Trainer | Elie Haddad |
| qa.trainer.marc@gymind.test | Test@123456 | Trainer | Marc Khoury |
| qa.trainer.rana@gymind.test | Test@123456 | Trainer | Rana Nader |
| qa.member.active.monthly@gymind.test | Test@123456 | Member | Active monthly membership |
| qa.member.daypass@gymind.test | Test@123456 | Member | Active same-day pass |
| qa.member.3months@gymind.test | Test@123456 | Member | Active 3-month membership |
| qa.member.vip@gymind.test | Test@123456 | Member | VIP all Gym 1 branches |
| qa.member.expiring2days@gymind.test | Test@123456 | Member | Ends in 2 days |
| qa.member.expiringtomorrow@gymind.test | Test@123456 | Member | Ends tomorrow |
| qa.member.expired@gymind.test | Test@123456 | Member | Expired membership |
| qa.member.frozen@gymind.test | Test@123456 | Member | Frozen membership |
| qa.member.cancelled@gymind.test | Test@123456 | Member | Cancelled membership |
| qa.member.noplan@gymind.test | Test@123456 | Member | No membership |
| qa.member.history@gymind.test | Test@123456 | Member | Expired history plus current active |
| qa.member.running@gymind.test | Test@123456 | Member | Active session timer |
| qa.member.vip.beirut@gymind.test | Test@123456 | Member | VIP Beirut branch |
| qa.member.gym2.monthly@gymind.test | Test@123456 | Member | Gym 2 member |
| qa.member.gym3.solo@gymind.test | Test@123456 | Member | Gym 3 member |

## What Gets Created

- Gyms: Gymind Ablah Fitness, Gymind Local Gym, Gymind Solo Gym.
- Branches: Ablah Main, Ablah East, Beirut, Ablah Strength, Ablah Cardio, Ablah Solo.
- Plans: day pass, monthly, 3-month, VIP, student, freeze allowed, Gym 2, and Gym 3 plans.
- Members and memberships for active, expiring, expired, frozen, cancelled, no-plan, history, VIP, and running timer scenarios.
- Check-ins: completed sessions, crossing-midnight session, active running session, active VIP branch session.
- Classes: strength, HIIT, boxing, yoga, bodybuilding, spinning, CrossFit, completed abs/core.
- Bookings, payments, and notifications.

## Verification

The SQL ends with verification queries:

- `qa_users`
- `qa_gyms`
- `qa_branches`
- `qa_plans`
- `qa_members`
- `qa_classes`
- `qa_open_sessions`

## Schema Limitations

The current backend schema does not expose these columns/tables:

- `gyms.code`
- `branches.code`
- `membership_plans.code`
- `membership_plans.currency`
- `membership_plans.duration_days`
- `membership_plans.freeze_allowed`
- `membership_plans.max_freeze_days`
- `classes.code`
- `class_sessions`
- `payments.status`

Because of that, the SQL uses the actual schema safely:

- QA codes are represented by stable names and `membership_plans.access_type`.
- Plan duration is approximated through `duration_months`.
- Class sessions are represented as rows in `classes` with `start_time` and `end_time`.
- Payment statuses are represented in `payments.method` and `payments.notes`.
