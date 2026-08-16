import { classesApi } from "../../api/classesApi";
import { ClassForm } from "../../components/forms/ClassForm";
import { EntityPage } from "../shared/EntityPage";
import type { GymClass } from "../../types/class";
export function OwnerClassesPage() { return <EntityPage<GymClass> title="Classes" loader={classesApi.getClasses} createLabel="Create class" columns={[{ key: "name", label: "Class" }, { key: "trainerName", label: "Trainer" }, { key: "time", label: "Time" }, { key: "capacity", label: "Capacity" }, { key: "status", label: "Status", badge: true }]} form={(close, reload) => <ClassForm onSubmit={async (v) => { await classesApi.createClass(v); close(); await reload(); }} />} actions={[{ label: "Cancel", variant: "danger", onClick: classesApi.cancelClass, hidden: (row) => row.status === "CANCELLED" }]} />; }
