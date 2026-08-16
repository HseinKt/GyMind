# Gymind Demo Day QA Checklist

## Auth
- SuperAdmin can login at `POST /api/Auth/admin/login`.
- GymOwner, BranchManager, Staff, and Trainer can login through the admin dashboard.
- Member can login at `POST /api/Auth/member/login` from the mobile app.
- Non-member roles are rejected by the mobile app.
- Refresh token works and revoked/expired refresh tokens force login.
- Legacy Auth endpoints are not public.

## Role Dashboards
- SuperAdmin sees platform-wide dashboard, gyms, users, reports, audit logs, and settings.
- GymOwner sees only owned gym data.
- BranchManager sees only assigned branch data.
- Staff sees member registration/search, payments, attendance, branch QR, and today attendance.
- Trainer sees assigned classes, members, sessions, notes, and profile data only.

## Staff Member Onboarding
- Staff creates a member inside their branch scope.
- Created member gets a matching mobile `User` with role `Member`.
- Active membership is created.
- Optional payment is recorded.
- Duplicate email/phone is rejected.
- Returned temporary password lets the member login to mobile.

## QR Attendance
- Admin Branch QR renders a real scannable QR.
- Regenerating QR invalidates old printed QR.
- Valid QR + in-range location checks member in.
- Invalid QR shows a clear error.
- Outside geofence shows a clear error.
- Inactive membership is blocked.
- Branch closed is blocked.
- Branch full is blocked.
- Already checked in is blocked.
- One-open-check-in unique index prevents duplicate open sessions.

## Manual Checkout
- SuperAdmin can manually checkout any open check-in.
- GymOwner can checkout only own gym members.
- BranchManager and Staff can checkout only assigned branch members.
- Manual checkout writes an audit log.
- Member manual checkout stops foreground auto-checkout watching and refreshes active check-in, home, history, branch access, and membership data.

## Auto Checkout
- `POST /api/CheckIns/auto-checkout` inside the branch radius returns `checkedOut: false`, includes distance/radius/branch fields, and writes `AUTO_CHECK_OUT_STILL_INSIDE`.
- One outside-radius foreground reading in mobile does not call auto-checkout.
- Three consecutive outside-radius foreground readings in mobile calls auto-checkout once.
- Successful auto-checkout writes `AUTO_CHECK_OUT`, uses server UTC time instead of the client timestamp, and refreshes active check-in, home, history, branch access, and membership data.
- No active check-in leaves the watcher stopped and does not call auto-checkout.
- Denied foreground location permission shows a clear message and does not request background location.

## Member Mobile
- Home dashboard loads partial data without crashing.
- Membership status and visits display correctly.
- Accessible branch capacity displays correctly.
- QR scan asks for camera and location permissions.
- Manual checkout calls the backend.
- Notifications load and mark-as-read works.
- Profile edit saves body, health, emergency, preference, and nutrition fields.
- Insights handle null and missing fields.

## API/Data Safety
- Frontends do not query Supabase directly.
- Public API responses do not expose password hashes.
- Production fails fast when JWT key or Supabase connection string is missing.
- DataSeeder does not run in Production unless explicitly enabled.
