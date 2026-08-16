import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { API_BASE_URL } from "../../api/apiClient";
import { useAuth } from "../../hooks/useAuth";

export function SettingsPage() {
  const { session } = useAuth();
  return <><PageHeader title="Settings" description="Session and API environment." /><Card><dl className="grid gap-3 text-sm"><div><dt className="font-bold">API base URL</dt><dd>{API_BASE_URL}</dd></div><div><dt className="font-bold">Role</dt><dd>{session?.user.role}</dd></div></dl></Card></>;
}
