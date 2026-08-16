# Gymind.Admin

React + Vite admin dashboard for Gymind operators.

## Environment

Create `.env` in `Gymind.Admin`:

```text
VITE_API_BASE_URL=http://localhost:5156/api
```

## Run

```powershell
npm install
npm run dev
```

The dashboard expects scoped backend data from the signed-in admin user:

- SuperAdmin: all gyms
- GymOwner: `user.gym_id`
- BranchManager, Staff: `user.branch_id`
- Trainer: assigned classes and members

If dashboard cards are empty, verify the user's `gym_id` and `branch_id` claims in the backend database.
