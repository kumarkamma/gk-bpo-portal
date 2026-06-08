import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
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

// All 5 active roles
const ALL_ROLES = ['super_admin', 'supervisor', 'bpo_agent', 'auditor', 'accounts']
const ADMIN_ROLES = ['super_admin', 'supervisor']
const FINANCE_ROLES = ['super_admin', 'accounts']
const FILING_ROLES = ['super_admin', 'auditor']
const LEADS_ROLES = ['super_admin', 'supervisor', 'bpo_agent']

const ROLE_DASHBOARD = {
  super_admin: '/super-admin',
  supervisor: '/supervisor-dashboard',
  bpo_agent: '/agent-dashboard',
  auditor: '/auditor-dashboard',
  accounts: '/accounts-dashboard',
}

function RoleRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_DASHBOARD[profile.role] || '/dashboard'} replace />
}

// ⚠️ DEV MODE — ProtectedRoute disabled for testing, re-enable before production
function Page({ component: Component }) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* ── Dashboards ── */}
      <Route path="/super-admin"         element={<Page component={SuperAdminDashboard} roles={['super_admin']} />} />
      <Route path="/dashboard"           element={<Page component={AdminDashboard}      roles={['super_admin']} />} />
      <Route path="/supervisor-dashboard"element={<Page component={SupervisorDashboard} roles={['super_admin', 'supervisor']} />} />
      <Route path="/agent-dashboard"     element={<Page component={AgentDashboard}      roles={['super_admin', 'bpo_agent']} />} />
      <Route path="/auditor-dashboard"   element={<Page component={AuditorDashboard}    roles={['super_admin', 'auditor']} />} />
      <Route path="/accounts-dashboard"  element={<Page component={AccountsDashboard}   roles={['super_admin', 'accounts']} />} />

      {/* ── Operations ── */}
      <Route path="/leads"         element={<Page component={LeadsPage}     roles={LEADS_ROLES} />} />
      <Route path="/clients"       element={<Page component={ClientsPage}   roles={[...ADMIN_ROLES, 'auditor', 'accounts']} />} />
      <Route path="/calls"         element={<Page component={CallLogsPage}  roles={LEADS_ROLES} />} />
      <Route path="/followups"     element={<Page component={FollowUpsPage} roles={LEADS_ROLES} />} />

      {/* ── Finance ── */}
      <Route path="/filings"  element={<Page component={FilingsPage}  roles={[...FILING_ROLES, 'supervisor']} />} />
      <Route path="/payments" element={<Page component={PaymentsPage} roles={[...FINANCE_ROLES, 'supervisor']} />} />

      {/* ── Management ── */}
      <Route path="/attendance"    element={<Page component={AttendancePage}   roles={ALL_ROLES} />} />
      <Route path="/reports"       element={<Page component={ReportsPage}      roles={ALL_ROLES} />} />
      <Route path="/import-export" element={<Page component={ImportExportPage} roles={['super_admin', 'supervisor']} />} />
      <Route path="/audit-logs"    element={<Page component={AuditLogsPage}    roles={['super_admin']} />} />
      <Route path="/users"         element={<Page component={UsersPage}        roles={['super_admin']} />} />

      {/* ── Account ── */}
      <Route path="/profile" element={<Page component={ProfilePage} roles={ALL_ROLES} />} />

      {/* Catch-all */}
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}
