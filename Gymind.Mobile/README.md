# Gymind.Mobile

Production-oriented Expo React Native member app. This app is member-only and talks only to Gymind.API. It does not use Supabase SDKs, direct database access, fake data, hardcoded member data, or admin screens.

## Environment

Create `.env` in `Gymind.Mobile`:

```text
EXPO_PUBLIC_GYMIND_API_BASE_URL=http://YOUR_PC_IPV4:5156
```

Physical devices cannot use `localhost` to reach the backend on your PC. Use your PC's IPv4 address on the same Wi-Fi.

Before starting Expo, test this from the phone browser:

```text
http://YOUR_PC_IPV4:5156/swagger
```

## Run

```powershell
npm install
npx expo start -c
```

## Architecture

- Expo Router screens live in `app/` and delegate to feature screens in `src/features/`.
- API calls are isolated in `src/api/`.
- Secure auth state uses Zustand plus Expo SecureStore.
- React Query owns server state, retries, refresh, invalidation, loading, empty, and error surfaces.
- StyleSheet-based design system lives in `src/theme/` and reusable UI components live in `src/components/`.

## Backend Endpoints

- Auth: `POST /api/Auth/member/login`, `POST /api/Auth/refresh`, `POST /api/Auth/logout`, `GET /api/Auth/me`
- Home: `GET /api/Auth/me`, `GET /api/member-profile`, `GET /api/Membership`, `GET /api/Stats`, `GET /api/member/bookings`, `GET /api/Notifications/me`, `GET /api/CheckIns/active`
- Membership: `GET /api/Membership`
- Branch access: `GET /api/member/branches/access`
- QR/check-in: `POST /api/Qr/scan`, `GET /api/CheckIns/active`, `POST /api/CheckIns/checkout`, `POST /api/CheckIns/auto-checkout`, `POST /api/Location/update`
- Classes: `GET /api/member/classes`, `GET /api/member/bookings`, `POST /api/member/classes/{classId}/book`, `POST /api/member/bookings/{bookingId}/cancel`, `POST /api/member/classes/{classId}/cancel`
- Notifications: `GET /api/Notifications/me`, `PUT /api/Notifications/{notificationId}/read`
- Profile: `GET /api/member-profile`, `PUT /api/member-profile`
- Insights: `GET /api/member-profile/insights`
- History: `GET /api/CheckIns`

QR attendance requires camera permission and foreground location permission. Location is used only for gym check-in and checkout validation, not login.
