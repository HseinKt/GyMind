import { Card } from "../../components/ui/Card";

export function ForgotPasswordPage() {
  return <main className="grid min-h-screen place-items-center p-6"><Card><h1 className="text-2xl font-black">Forgot password</h1><p className="mt-2 text-forge-muted">Password reset requires a backend endpoint. TODO backend: add POST /api/auth/admin/forgot-password.</p></Card></main>;
}
