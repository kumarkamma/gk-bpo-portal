import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const ROLE_HOME = {
  super_admin: '/super-admin',
  supervisor:  '/supervisor-dashboard',
  bpo_agent:   '/agent-dashboard',
  auditor:     '/auditor-dashboard',
  accounts:    '/accounts-dashboard',
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FC' }}>
        <LoadingSpinner size="lg" text="Loading portal…" />
      </div>
    )
  }

  // Not logged in → login page
  if (!user) return <Navigate to="/login" replace />

  // Wrong role → redirect to own dashboard
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={ROLE_HOME[profile.role] || '/dashboard'} replace />
  }

  return children
}
