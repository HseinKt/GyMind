import { checkInsApi } from "../../api/checkInsApi";
import { EntityPage } from "../shared/EntityPage";
import type { CheckIn } from "../../types/checkIn";
export function TodayAttendancePage() { return <EntityPage<CheckIn> title="Today Attendance" loader={checkInsApi.getTodayAttendance} columns={[{ key: "memberName", label: "Member" }, { key: "status", label: "Status", badge: true }, { key: "at", label: "Time" }, { key: "source", label: "Source" }]} />; }
