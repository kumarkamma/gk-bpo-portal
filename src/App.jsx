import { Component } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import AppRoutes from './routes'

// ── Global Error Boundary ─────────────────────────────────────
class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[GK Portal Error]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F8F9FC', fontFamily: "'Poppins', sans-serif", padding: 24,
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
            background: 'linear-gradient(135deg,#0A1628,#162340)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
            An unexpected error occurred in the portal. Your data is safe — please refresh to continue.
          </p>
          {this.state.error && (
            <pre style={{
              textAlign: 'left', background: '#FEE2E2', color: '#DC2626',
              borderRadius: 8, padding: '12px 16px', fontSize: 11,
              overflowX: 'auto', marginBottom: 20, border: '1px solid #FECACA',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#0A1628,#162340)', color: '#D4AF37',
              fontSize: 14, fontWeight: 700, letterSpacing: '0.02em',
            }}
          >
            Reload Portal
          </button>
        </div>
      </div>
    )
  }
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
