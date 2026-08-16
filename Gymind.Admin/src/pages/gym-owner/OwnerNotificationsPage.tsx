import { notificationsApi } from "../../api/notificationsApi";
import { NotificationForm } from "../../components/forms/NotificationForm";
import { EntityPage } from "../shared/EntityPage";
import type { Notification } from "../../types/notification";
export function OwnerNotificationsPage() { return <EntityPage<Notification> title="Notifications" loader={notificationsApi.getNotifications} createLabel="Send notification" columns={[{ key: "title", label: "Title" }, { key: "message", label: "Message" }, { key: "createdAt", label: "Created" }]} form={(close, reload) => <NotificationForm onSubmit={async (v) => { await notificationsApi.createNotification(v); close(); await reload(); }} />} />; }
