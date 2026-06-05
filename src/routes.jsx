import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { ROLES } from './lib/constants'

import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/admin/Dashboard'
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

function RoleDashboard() {
  const { profile } = useAuth()
  const role = profile?.role

  const dashboardMap = {
    [ROLES.SUPER_ADMIN]: <AdminDashboard />,
    [ROLES.SUPERVISOR]: <SupervisorDashboard />,
    [ROLES.BPO_AGENT]: <AgentDashboard />,
    [ROLES.AUDITOR]: <AuditorDashboard />,
    [ROLES.ACCOUNTS]: <AccountsDashboard />,
  }

  return dashboardMap[role] || <AdminDashboard />
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout><RoleDashboard /></AppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="/leads" element={<ProtectedRoute><AppLayout><LeadsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><AppLayout><ClientsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/calls" element={<ProtectedRoute><AppLayout><CallLogsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/followups" element={<ProtectedRoute><AppLayout><FollowUpsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/filings" element={<ProtectedRoute><AppLayout><FilingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><AppLayout><PaymentsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><AppLayout><AttendancePage /></AppLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/import-export" element={<ProtectedRoute><AppLayout><ImportExportPage /></AppLayout></ProtectedRoute>} />
      <Route
        path="/audit-logs"
        element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><AppLayout><AuditLogsPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/users"
        element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><AppLayout><UsersPage /></AppLayout></ProtectedRoute>}
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default AppRoutes
