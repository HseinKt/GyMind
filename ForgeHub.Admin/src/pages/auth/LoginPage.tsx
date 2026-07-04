import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { roleHome } from "../../utils/constants";

export function LoginPage() {
  const { session, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) navigate(roleHome[session.user.role], { replace: true });
  }, [session, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const cleanEmail = email.replace(/\s+/g, "").toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Invalid email format.");
      return;
    }
    const result = await login(cleanEmail, password);
    if (!result.ok) {
      setError(result.message ?? "Login failed.");
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-forge-sidebar p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3 text-2xl font-black"><Dumbbell className="text-orange-400" /> ForgeHub</div>
          <h1 className="mt-20 max-w-2xl text-5xl font-black tracking-tight">A serious operating system for modern gyms.</h1>
          <p className="mt-5 max-w-xl text-slate-300">Role-aware dashboards, branch operations, trainer workflows, payments, classes, and attendance. All powered by the backend API.</p>
        </div>
        <p className="text-sm text-slate-400">Admin login works from anywhere. QR and geofence are only for member attendance.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-forge-border bg-white p-8 shadow-panel">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-forge-primary">ForgeHub Admin</p>
          <h2 className="mt-2 text-3xl font-black">Sign in</h2>
          <p className="mt-2 text-sm text-forge-muted">Use your database-backed admin, owner, manager, staff, or trainer account.</p>
          <div className="mt-8 grid gap-4">
            <label>Email<Input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>
              Password
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  className="pr-11"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          </div>
          {error ? <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <Button className="mt-6 w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
        </form>
      </section>
    </main>
  );
}
