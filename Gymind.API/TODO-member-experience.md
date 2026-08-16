# Member Experience TODOs

These items need schema or backend workflow support before the mobile app can show or enforce them safely.

- Add a member-scoped payments endpoint, for example `GET /api/mobile/member/payments`, that resolves the authenticated member and returns only that member's payment history. The existing `GET /api/Payments` is admin-scoped by gym/branch and is not safe for member billing history.
- Add a configurable gym session countdown source if countdowns are required. Suggested fields: `branches.default_session_minutes` or a gym-level setting such as `gyms.default_session_minutes`. Until this exists, the mobile timer shows elapsed and lap time only.
- Add a scheduled reminder workflow for memberships ending in two days. Suggested persistence: a notification/reminder key that includes `member_membership_id`, `end_date`, and `type = MEMBERSHIP_EXPIRING_2_DAYS` so reminders do not duplicate and renewed memberships do not reuse stale reminder state.
- Add gym owner SaaS subscription/payment fields before enforcing owner lockout. Suggested fields include subscription status, due date, notice period start/end, and lockout state at the gym or owner subscription level.
