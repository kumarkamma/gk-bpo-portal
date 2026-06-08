import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'

import AdminDashboard from './pages/admin/Dashboard'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import SupervisorDashboard from './pages/supervisor/Dashboard'
import AgentDashboard from './pages/agent/Dashboard'
import AuditorDashboard from './pages/auditor/Dashboard'
import AccountsDashboard from './pages/accounts/Dashboard'

import LeadsPage from './pages/admin/LeadsPage'
import ClientsPage from './pages/admin/ClientsPage'
import CallLogsPage from './pages/admin/CallLogsPage'
import FilingsPage from './pages/admin/FilingsPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import AttendancePage from './pages/admin/AttendancePage'
import ReportsPage from './pages/admin/ReportsPage'
import ImportExportPage from './pages/admin/ImportExportPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import UsersPage from './pages/admin/UsersPage'
import FollowUpsPage from './pages/admin/FollowUpsPage'
import ProfilePage from './pages/ProfilePage'

const ROLE_DASHBOARD = {
  super_admin: '/super-admin',
  _admin_legacy: '/dashboard',
  supervisor: '/supervisor-dashboard',
  bpo_agent: '/agent-dashboard',
  auditor: '/auditor-dashboard',
  accounts: '/accounts-dashboard',
}

const ROLE_DASHBOARD_COMPONENT = {
  super_admin: SuperAdminDashboard,
  _admin_legacy: AdminDashboard,
  supervisor: SupervisorDashboard,
  bpo_agent: AgentDashboard,
  auditor: AuditorDashboard,
  accounts: AccountsDashboard,
}

function RoleRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  const dest = ROLE_DASHBOARD[profile.role] || '/dashboard'
  return <Navigate to={dest} replace />
}

function WrappedPage({ component: Component }) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  )
}

function RoleDashboard({ role }) {
  const Component = ROLE_DASHBOARD_COMPONENT[role] || AdminDashboard
  return <WrappedPage component={Component} />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Role-based dashboards */}
      <Route path="/super-admin" element={<WrappedPage component={SuperAdminDashboard} />} />
      <Route path="/dashboard" element={<WrappedPage component={AdminDashboard} />} />
      <Route path="/supervisor-dashboard" element={<RoleDashboard role="supervisor" />} />
      <Route path="/agent-dashboard" element={<RoleDashboard role="bpo_agent" />} />
      <Route path="/auditor-dashboard" element={<RoleDashboard role="auditor" />} />
      <Route path="/accounts-dashboard" element={<RoleDashboard role="accounts" />} />

      {/* Shared pages */}
      <Route path="/leads"         element={<WrappedPage component={LeadsPage} />} />
      <Route path="/clients"       element={<WrappedPage component={ClientsPage} />} />
      <Route path="/calls"         element={<WrappedPage component={CallLogsPage} />} />
      <Route path="/followups"     element={<WrappedPage component={FollowUpsPage} />} />
      <Route path="/filings"       element={<WrappedPage component={FilingsPage} />} />
      <Route path="/payments"      element={<WrappedPage component={PaymentsPage} />} />
      <Route path="/attendance"    element={<WrappedPage component={AttendancePage} />} />
      <Route path="/reports"       element={<WrappedPage component={ReportsPage} />} />
      <Route path="/import-export" element={<WrappedPage component={ImportExportPage} />} />
      <Route path="/audit-logs"    element={<WrappedPage component={AuditLogsPage} />} />
      <Route path="/users"         element={<WrappedPage component={UsersPage} />} />
      <Route path="/profile"       element={<WrappedPage component={ProfilePage} />} />

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}
