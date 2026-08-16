# Gymind Mobile RN Testing Checklist

## AUTH
- Member can login using email
- Member can login using phone if backend supports it
- Non-member role is rejected from mobile app
- Token persists after app restart
- Refresh token works
- Logout clears session

## QR
- Camera permission denied state
- Location permission denied state
- Successful QR scan
- Invalid QR
- Expired QR
- Already checked in
- Branch closed
- Branch full
- Membership inactive
- Membership does not include branch
- Backend offline

## BRANCH ACCESS
- Member sees only accessible branches
- Capacity percentage displays correctly
- Full branch disables check-in
- Closed branch disables check-in

## PROFILE
- Profile loads from backend
- Profile update works
- Emergency contact updates
- Health info updates
- Numeric validations work
- Sensitive fields are not displayed publicly

## INSIGHTS
- Insights load from backend
- Missing fields are displayed
- Calculated values render correctly
- App does not crash if values are null

## CLASSES
- Classes list loads
- Class details load
- Booking works
- Cancel booking works
- Empty state works

## NOTIFICATIONS
- Notifications load
- Mark as read works
- Empty state works

## GENERAL
- Pull-to-refresh works
- API error states work
- Loading states work
- App works on iOS and Android
- App works with local backend URL
- App works with LAN/tunnel backend URL
