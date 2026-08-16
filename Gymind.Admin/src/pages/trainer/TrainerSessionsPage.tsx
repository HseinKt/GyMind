import { trainerSessionsApi, type TrainerSession } from "../../api/trainerSessionsApi";
import { EntityPage } from "../shared/EntityPage";
export function TrainerSessionsPage() { return <EntityPage<TrainerSession> title="Sessions" loader={trainerSessionsApi.getTrainerSessions} columns={[{ key: "sessionType", label: "Type" }, { key: "memberId", label: "Member" }, { key: "sessionDate", label: "Date" }, { key: "notes", label: "Notes" }]} />; }
