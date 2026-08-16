import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { dashboardApi } from "../../api/dashboardApi";
import { trainerSessionsApi } from "../../api/trainerSessionsApi";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { LoadingState } from "../../components/ui/LoadingState";
import { useApi } from "../../hooks/useApi";
import { MemberMiniCard, TrainerHeader, TrainerShell } from "./TrainerComponents";
import { latestNoteForMember, membershipWarning, remainingSessions } from "./trainerExperience";

export function TrainerMembersPage() {
  const workspace = useApi(dashboardApi.getWorkspace, []);
  const sessions = useApi(() => trainerSessionsApi.getTrainerSessions(), []);
  const [query, setQuery] = useState("");

  const members = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (workspace.data?.members ?? []).filter((member) => {
      if (!needle) return true;
      return [member.name, member.fullName, member.phone, member.email].some((value) => String(value ?? "").toLowerCase().includes(needle));
    });
  }, [query, workspace.data?.members]);

  if (workspace.loading || sessions.loading) return <LoadingState label="Loading trainer members..." />;
  if (workspace.error) return <ErrorState message={workspace.error} />;
  if (sessions.error) return <ErrorState message={sessions.error} />;

  return (
    <TrainerShell>
      <TrainerHeader title="Members" subtitle="Assigned members with the context needed before the next conversation." />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input className="min-h-12 pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" />
      </div>
      {members.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <MemberMiniCard
              key={member.id}
              member={member}
              note={latestNoteForMember(member.id, sessions.data ?? [])}
              warning={membershipWarning(member)}
              remaining={remainingSessions(member.id, sessions.data ?? [])}
            />
          ))}
        </div>
      ) : <EmptyState title="No assigned members found." />}
    </TrainerShell>
  );
}
