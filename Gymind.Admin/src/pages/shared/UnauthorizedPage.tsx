import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";

export function UnauthorizedPage() {
  const { session } = useAuth();
  const isMember = session?.user.role === "Member";
  return (
    <Card>
      <h1 className="text-2xl font-black">{isMember ? "Access Denied" : "Unauthorized"}</h1>
      <p className="mt-2 text-forge-muted">
        {isMember
          ? "You do not have permission to access the admin dashboard. Please use the Gymind mobile app."
          : "You do not have permission to access this admin page."}
      </p>
    </Card>
  );
}
