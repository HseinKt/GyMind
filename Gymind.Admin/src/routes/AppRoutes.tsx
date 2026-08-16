import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RoleGuard } from "../auth/RoleGuard";
import { AdminLayout } from "../layouts/AdminLayout";
import { LoginPage } from "../pages/auth/LoginPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { AuditLogsPage } from "../pages/superadmin/AuditLogsPage";
import { GymsPage } from "../pages/superadmin/GymsPage";
import { PlatformUsersPage } from "../pages/superadmin/PlatformUsersPage";
import { SuperAdminDashboard } from "../pages/superadmin/SuperAdminDashboard";
import { GymOwnerDashboard } from "../pages/gym-owner/GymOwnerDashboard";
import { OwnerBranchesPage } from "../pages/gym-owner/OwnerBranchesPage";
import { OwnerMembersPage } from "../pages/gym-owner/OwnerMembersPage";
import { OwnerMembershipPlansPage } from "../pages/gym-owner/OwnerMembershipPlansPage";
import { OwnerNotificationsPage } from "../pages/gym-owner/OwnerNotificationsPage";
import { OwnerPaymentsPage } from "../pages/gym-owner/OwnerPaymentsPage";
import { OwnerStaffPage } from "../pages/gym-owner/OwnerStaffPage";
import { OwnerTrainersPage } from "../pages/gym-owner/OwnerTrainersPage";
import { BranchCheckInsPage } from "../pages/branch-manager/BranchCheckInsPage";
import { BranchClassesPage } from "../pages/branch-manager/BranchClassesPage";
import { BranchManagerDashboard } from "../pages/branch-manager/BranchManagerDashboard";
import { BranchMembersPage } from "../pages/branch-manager/BranchMembersPage";
import { BranchNotificationsPage } from "../pages/branch-manager/BranchNotificationsPage";
import { BranchPaymentsPage } from "../pages/branch-manager/BranchPaymentsPage";
import { BranchReportsPage } from "../pages/branch-manager/BranchReportsPage";
import { BranchStaffPage } from "../pages/branch-manager/BranchStaffPage";
import { BranchTrainersPage } from "../pages/branch-manager/BranchTrainersPage";
import { ManualCheckInPage } from "../pages/staff/ManualCheckInPage";
import { MemberSearchPage } from "../pages/staff/MemberSearchPage";
import { MemberAssessmentsPage } from "../pages/staff/MemberAssessmentsPage";
import { RegisterMemberPage } from "../pages/staff/RegisterMemberPage";
import { RenewMembershipPage } from "../pages/staff/RenewMembershipPage";
import { StaffPaymentsPage } from "../pages/staff/StaffPaymentsPage";
import { TrainerMemberDetailPage } from "../pages/trainer/TrainerMemberDetailPage";
import { TrainerMembersPage } from "../pages/trainer/TrainerMembersPage";
import { TrainerProfilePage } from "../pages/trainer/TrainerProfilePage";
import { TrainerQuickNotePage } from "../pages/trainer/TrainerQuickNotePage";
import { TrainerSchedulePage } from "../pages/trainer/TrainerSchedulePage";
import { TrainerSessionPage } from "../pages/trainer/TrainerSessionPage";
import { TrainerTodayPage } from "../pages/trainer/TrainerTodayPage";
import { NotFoundPage } from "../pages/shared/NotFoundPage";
import { BranchQrPage } from "../pages/shared/BranchQrPage";
import { SettingsPage } from "../pages/shared/SettingsPage";
import { UnauthorizedPage } from "../pages/shared/UnauthorizedPage";
import { useAuth } from "../hooks/useAuth";
import { roleHome } from "../utils/constants";

function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? roleHome[session.user.role] : "/login"} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/access-denied" element={<UnauthorizedPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route element={<RoleGuard allowed={["SuperAdmin"]} />}>
            <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/gyms" element={<GymsPage />} />
            <Route path="/superadmin/gym-owners" element={<Navigate to="/superadmin/gyms" replace />} />
            <Route path="/superadmin/platform-users" element={<PlatformUsersPage />} />
            <Route path="/superadmin/branch-qr" element={<BranchQrPage />} />
            <Route path="/superadmin/audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route element={<RoleGuard allowed={["GymOwner"]} />}>
            <Route path="/gym-owner/dashboard" element={<GymOwnerDashboard />} />
            <Route path="/gym-owner/branches" element={<OwnerBranchesPage />} />
            <Route path="/gym-owner/branch-qr" element={<BranchQrPage />} />
            <Route path="/branches/:branchId/qr" element={<BranchQrPage />} />
            <Route path="/gym-owner/members" element={<OwnerMembersPage />} />
            <Route path="/gym-owner/membership-plans" element={<OwnerMembershipPlansPage />} />
            <Route path="/gym-owner/payments" element={<OwnerPaymentsPage />} />
            <Route path="/gym-owner/classes" element={<Navigate to="/unauthorized" replace />} />
            <Route path="/gym-owner/trainers" element={<OwnerTrainersPage />} />
            <Route path="/gym-owner/staff" element={<OwnerStaffPage />} />
            <Route path="/gym-owner/notifications" element={<OwnerNotificationsPage />} />
          </Route>
          <Route element={<RoleGuard allowed={["BranchManager"]} />}>
            <Route path="/branch-manager/dashboard" element={<BranchManagerDashboard />} />
            <Route path="/branch-manager/members" element={<BranchMembersPage />} />
            <Route path="/branch-manager/check-ins" element={<BranchCheckInsPage />} />
            <Route path="/branch-manager/classes" element={<BranchClassesPage />} />
            <Route path="/branch-manager/staff" element={<BranchStaffPage />} />
            <Route path="/branch-manager/trainers" element={<BranchTrainersPage />} />
            <Route path="/branch-manager/payments" element={<BranchPaymentsPage />} />
            <Route path="/branch-manager/notifications" element={<BranchNotificationsPage />} />
            <Route path="/branch-manager/reports" element={<BranchReportsPage />} />
            <Route path="/branch-manager/branch-qr" element={<BranchQrPage />} />
          </Route>
          <Route element={<RoleGuard allowed={["Staff"]} />}>
            <Route path="/staff/dashboard" element={<Navigate to="/staff/member-search" replace />} />
            <Route path="/staff/member-search" element={<MemberSearchPage />} />
            <Route path="/staff/assessments" element={<MemberAssessmentsPage />} />
            <Route path="/staff/register-member" element={<RegisterMemberPage />} />
            <Route path="/staff/renew-membership" element={<RenewMembershipPage />} />
            <Route path="/staff/payments" element={<StaffPaymentsPage />} />
            <Route path="/staff/manual-check-in" element={<ManualCheckInPage />} />
            <Route path="/staff/today-attendance" element={<Navigate to="/staff/member-search" replace />} />
            <Route path="/staff/branch-qr" element={<BranchQrPage />} />
          </Route>
          <Route element={<RoleGuard allowed={["Trainer"]} />}>
            <Route path="/trainer" element={<Navigate to="/trainer/dashboard" replace />} />
            <Route path="/trainer/dashboard" element={<TrainerTodayPage />} />
            <Route path="/trainer/today" element={<Navigate to="/trainer/dashboard" replace />} />
            <Route path="/trainer/schedule" element={<TrainerSchedulePage />} />
            <Route path="/trainer/members" element={<TrainerMembersPage />} />
            <Route path="/trainer/member/:memberId" element={<TrainerMemberDetailPage />} />
            <Route path="/trainer/session/:sessionId" element={<TrainerSessionPage />} />
            <Route path="/trainer/notes/new" element={<TrainerQuickNotePage />} />
            <Route path="/trainer/profile" element={<TrainerProfilePage />} />
            <Route path="/trainer/classes" element={<Navigate to="/trainer/schedule" replace />} />
            <Route path="/trainer/notes" element={<Navigate to="/trainer/notes/new" replace />} />
          </Route>
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
