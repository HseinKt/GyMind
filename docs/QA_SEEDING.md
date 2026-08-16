# QA Seeding

The development seeder creates the QA/demo dataset automatically when `Gymind.API` starts in `Development` or when `SeedDatabase` is enabled.

Run from `Gymind.API`:

```powershell
dotnet run
```

Use only local/dev/test databases. Do not run this against production.

All QA users use:

```text
Test@123456
```

## QA Accounts

| Role | Email | Password |
|---|---|---|
| SuperAdmin | qa.superadmin@gymind.test | Test@123456 |
| GymOwner | qa.owner.ablahfitness@gymind.test | Test@123456 |
| GymOwner | qa.owner.localgym@gymind.test | Test@123456 |
| GymOwner | qa.owner.sologym@gymind.test | Test@123456 |
| BranchManager | qa.manager.ablahmain@gymind.test | Test@123456 |
| Staff | qa.staff.ablahmain@gymind.test | Test@123456 |
| Trainer | qa.trainer.elie@gymind.test | Test@123456 |
| Trainer | qa.trainer.marc@gymind.test | Test@123456 |
| Trainer | qa.trainer.rana@gymind.test | Test@123456 |
| Member | qa.member.active.monthly@gymind.test | Test@123456 |
| Member | qa.member.daypass@gymind.test | Test@123456 |
| Member | qa.member.3months@gymind.test | Test@123456 |
| Member | qa.member.vip@gymind.test | Test@123456 |
| Member | qa.member.expiring2days@gymind.test | Test@123456 |
| Member | qa.member.expiringtomorrow@gymind.test | Test@123456 |
| Member | qa.member.expired@gymind.test | Test@123456 |
| Member | qa.member.frozen@gymind.test | Test@123456 |
| Member | qa.member.cancelled@gymind.test | Test@123456 |
| Member | qa.member.noplan@gymind.test | Test@123456 |
| Member | qa.member.history@gymind.test | Test@123456 |
| Member | qa.member.running@gymind.test | Test@123456 |
| Member | qa.member.vip.beirut@gymind.test | Test@123456 |
| Member | qa.member.gym2.monthly@gymind.test | Test@123456 |
| Member | qa.member.gym3.solo@gymind.test | Test@123456 |

## Gyms And Branches

- Gymind Ablah Fitness: Ablah Main Branch, Ablah East Branch, Beirut Branch.
- Gymind Local Gym: Ablah Strength Branch, Ablah Cardio Branch.
- Gymind Solo Gym: Ablah Solo Branch.

## Plans

- Gym 1: QA One Day Pass, QA Monthly Basic, QA 3-Month Standard, QA VIP All Branches, QA Student Plan, QA Frozen Allowed Plan.
- Gym 2: QA Gym2 One Day Pass, QA Monthly Local, QA VIP Local All Branches.
- Gym 3: QA Solo One Day Pass, QA Monthly Solo.

VIP plans are linked to every branch under their gym through `membership_plan_branches`. Branch-specific plans are linked only to their allowed branch.

## Key Member Scenarios

- `qa.member.running@gymind.test` has an active check-in from about 35 minutes ago.
- `qa.member.vip@gymind.test` can test all-branch access under Gymind Ablah Fitness.
- `qa.member.history@gymind.test` has old expired memberships plus a current active membership.
- `qa.member.expiring2days@gymind.test` and `qa.member.expiringtomorrow@gymind.test` test warning states.
- `qa.member.expired@gymind.test`, `qa.member.frozen@gymind.test`, `qa.member.cancelled@gymind.test`, and `qa.member.noplan@gymind.test` test blocked or empty membership states.

## Legacy Demo Accounts

The older demo seeder still creates:

| Role | Email | Password |
|---|---|---|
| SuperAdmin | platform@gymind.com | Forge123! |
| GymOwner | owner@gymind.com | Forge123! |
| BranchManager | manager@gymind.com | Forge123! |
| Staff | staff@gymind.com | Forge123! |
| Trainer | trainer@gymind.com | Forge123! |
| Member | member1@gymind.com | P@ssw0rd123! |
