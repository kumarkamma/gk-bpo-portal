import { useState, useEffect, useRef } from 'react'
import { Menu, Bell, X, Trash2, CheckCheck, Clock, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { getInitials } from '../../lib/utils'
import { useLocation, useNavigate } from 'react-router-dom'

const PAGE_NAMES = {
  '/dashboard':            'Dashboard',
  '/supervisor-dashboard': 'Dashboard',
  '/agent-dashboard':      'Dashboard',
  '/auditor-dashboard':    'Dashboard',
  '/accounts-dashboard':   'Dashboard',
  '/leads':                'Leads',
  '/clients':              'Clients',
  '/calls':                'Call Logs',
  '/followups':            'Follow-Ups',
  '/filings':              'ITR Filings',
  '/payments':             'Payments',
  '/attendance':           'Attendance',
  '/reports':              'Reports',
  '/import-export':        'Import / Export',
  '/audit-logs':           'Audit Logs',
  '/users':                'User Management',
  '/profile':              'My Profile',
}

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  supervisor:  'Supervisor',
  bpo_agent:   'BPO Agent',
  auditor:     'Auditor',
  accounts:    'Accounts',
}

const ROLE_COLORS = {
  super_admin: { bg: '#F5F3FF', color: '#7C3AED' },
  supervisor:  { bg: '#EFF6FF', color: '#1D4ED8' },
  bpo_agent:   { bg: '#ECFDF5', color: '#065F46' },
  auditor:     { bg: '#FFFBEB', color: '#92400E' },
  accounts:    { bg: '#F0FDFA', color: '#0F766E' },
}

const TYPE_ICON = {
  info:    { icon: Info,          bg: '#DBEAFE', color: '#2563EB' },
  success: { icon: CheckCircle,   bg: '#DCFCE7', color: '#16A34A' },
  warning: { icon: AlertTriangle, bg: '#FEF3C7', color: '#D97706' },
  error:   { icon: AlertCircle,   bg: '#FEE2E2', color: '#DC2626' },
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Topbar({ onMenuToggle }) {
  const { profile } = useAuth()
  const { notifications, unreadCount, markRead, clearOne, clearAll } = useNotifications()
  const [time, setTime] = useState(new Date())
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const pageName = PAGE_NAMES[location.pathname] || 'Portal'
  const roleStyle = ROLE_COLORS[profile?.role] || { bg: '#F1F5F9', color: '#64748B' }

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function openNotif() {
    setShowNotif(p => !p)
    // Mark all as read when opened
    if (!showNotif) notifications.filter(n => !n.read).forEach(n => markRead(n.id))
  }

  return (
    <header style={{
      height: 58,
      background: '#fff',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 22px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      flexShrink: 0,
    }}>

      {/* ── LEFT ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onMenuToggle}
          style={{
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid #E2E8F0', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748B', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F5F7FA'; e.currentTarget.style.borderColor = '#D4AF37' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0' }}
        >
          <Menu size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>GK Portal</span>
          <span style={{ color: '#CBD5E1', fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, color: '#0A1628', fontWeight: 700 }}>{pageName}</span>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Date */}
        <div style={{ padding: '5px 12px', background: '#F5F7FA', borderRadius: 6, border: '1px solid #E2E8F0' }}>
          <p style={{ fontSize: 11, color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* ── NOTIFICATION BELL ── */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={openNotif}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${showNotif ? '#D4AF37' : '#E2E8F0'}`,
              background: showNotif ? '#FFFBEB' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: showNotif ? '#D4AF37' : '#64748B',
              position: 'relative', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!showNotif) { e.currentTarget.style.background = '#F5F7FA'; e.currentTarget.style.borderColor = '#D4AF37' } }}
            onMouseLeave={e => { if (!showNotif) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E2E8F0' } }}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 16, height: 16, borderRadius: 8,
                background: '#A11D4A', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: '#fff', padding: '0 3px',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotif && (
            <div style={{
              position: 'absolute', top: 44, right: 0,
              width: 360, maxHeight: 480,
              background: '#fff', borderRadius: 12,
              border: '1px solid #E2E8F0',
              boxShadow: '0 16px 48px rgba(10,22,40,0.16), 0 4px 14px rgba(10,22,40,0.08)',
              zIndex: 100, display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderBottom: '1px solid #F1F5F9',
                background: 'linear-gradient(135deg, #0A1628, #162340)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell size={14} style={{ color: '#D4AF37' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Poppins',sans-serif" }}>Notifications</span>
                  {notifications.length > 0 && (
                    <span style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                      {notifications.length}
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(161,29,74,0.5)'; e.currentTarget.style.color = '#A11D4A'; e.currentTarget.style.background = 'rgba(161,29,74,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  >
                    <Trash2 size={11} /> Clear All
                  </button>
                )}
              </div>

              {/* Expiry notice */}
              {notifications.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: '#FFFBEB', borderBottom: '1px solid #FEF3C7' }}>
                  <Clock size={10} style={{ color: '#D97706', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: '#92400E' }}>Notifications auto-clear after 48 hours</span>
                </div>
              )}

              {/* List */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Bell size={20} style={{ color: '#CBD5E1' }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>All caught up!</p>
                    <p style={{ fontSize: 12, color: '#94A3B8' }}>No notifications in the last 48 hours</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    const t = TYPE_ICON[n.type] || TYPE_ICON.info
                    const TypeIcon = t.icon
                    return (
                      <div
                        key={n.id}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '12px 16px',
                          background: n.read ? 'transparent' : 'rgba(212,175,55,0.04)',
                          borderBottom: '1px solid #F8FAFC',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(212,175,55,0.04)'}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <TypeIcon size={14} style={{ color: t.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {n.title && <p style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', marginBottom: 2 }}>{n.title}</p>}
                          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{n.message}</p>
                          <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{timeAgo(n.timestamp)}</p>
                        </div>
                        <button
                          onClick={() => clearOne(n.id)}
                          style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', flexShrink: 0, transition: 'all 0.15s' }}
                          title="Dismiss"
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#CBD5E1' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>{notifications.length} notification{notifications.length !== 1 ? 's' : ''} · last 48 hours</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: '#E2E8F0' }} />

        {/* ── USER AVATAR ── click → profile */}
        <div
          onClick={() => navigate('/profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F5F7FA'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0A1628, #162340)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#D4AF37', fontSize: 11, fontWeight: 800, flexShrink: 0,
            border: '2px solid rgba(212,175,55,0.2)',
          }}>
            {getInitials(profile?.name)}
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', lineHeight: 1.3 }}>{profile?.name || 'User'}</p>
            <span style={{
              display: 'inline-block',
              fontSize: 10, fontWeight: 600,
              color: roleStyle.color, background: roleStyle.bg,
              padding: '1px 7px', borderRadius: 4,
            }}>
              {ROLE_LABELS[profile?.role] || profile?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
