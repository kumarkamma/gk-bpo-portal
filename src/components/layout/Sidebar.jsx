import { useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import {
  LayoutDashboard, Users, PhoneCall, UserCheck, FileText, CreditCard,
  BarChart3, Upload, LogOut, Shield, UserCog, ClipboardList,
  Calendar, ChevronLeft, ChevronRight, User, TrendingUp,
  BookOpen, Briefcase, Target, Crown, ScrollText
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/constants'
import { getInitials } from '../../lib/utils'

const NAV_CONFIG = {
  [ROLES.SUPER_ADMIN]: [
    {
      section: 'OVERVIEW',
      items: [
        { label: 'Super Admin Hub',  icon: Crown,           path: '/super-admin' },
        { label: 'Dashboard',        icon: LayoutDashboard, path: '/dashboard' },
      ],
    },
    {
      section: 'OPERATIONS',
      items: [
        { label: 'Leads',           icon: Target,        path: '/leads' },
        { label: 'Clients',         icon: UserCheck,     path: '/clients' },
        { label: 'Call Logs',       icon: PhoneCall,     path: '/calls' },
        { label: 'Follow-Ups',      icon: ClipboardList, path: '/followups' },
      ],
    },
    {
      section: 'FINANCE',
      items: [
        { label: 'ITR Filings',     icon: FileText,      path: '/filings' },
        { label: 'Payments',        icon: CreditCard,    path: '/payments' },
      ],
    },
    {
      section: 'MANAGEMENT',
      items: [
        { label: 'Attendance',      icon: Calendar,      path: '/attendance' },
        { label: 'Reports',         icon: BarChart3,     path: '/reports' },
        { label: 'Import / Export', icon: Upload,        path: '/import-export' },
        { label: 'Audit Logs',      icon: Shield,        path: '/audit-logs' },
        { label: 'User Management', icon: UserCog,       path: '/users' },
        { label: 'Consent Monitor', icon: ScrollText,    path: '/consent-monitor' },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { label: 'My Profile',      icon: User,       path: '/profile' },
        { label: 'Privacy & Policy',icon: ScrollText, path: '/privacy-policy' },
      ],
    },
  ],
  [ROLES.SUPERVISOR]: [
    {
      section: 'OVERVIEW',
      items: [
        { label: 'Dashboard',       icon: LayoutDashboard, path: '/supervisor-dashboard' },
      ],
    },
    {
      section: 'OPERATIONS',
      items: [
        { label: 'Leads',           icon: Target,        path: '/leads' },
        { label: 'Clients',         icon: UserCheck,     path: '/clients' },
        { label: 'Call Logs',       icon: PhoneCall,     path: '/calls' },
        { label: 'Follow-Ups',      icon: ClipboardList, path: '/followups' },
      ],
    },
    {
      section: 'FINANCE',
      items: [
        { label: 'ITR Filings',     icon: FileText,      path: '/filings' },
        { label: 'Payments',        icon: CreditCard,    path: '/payments' },
      ],
    },
    {
      section: 'TEAM',
      items: [
        { label: 'Attendance',      icon: Calendar,      path: '/attendance' },
        { label: 'Reports',         icon: BarChart3,     path: '/reports' },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { label: 'My Profile',      icon: User,       path: '/profile' },
        { label: 'Privacy & Policy',icon: ScrollText, path: '/privacy-policy' },
      ],
    },
  ],
  [ROLES.BPO_AGENT]: [
    {
      section: 'OVERVIEW',
      items: [
        { label: 'My Dashboard',    icon: LayoutDashboard, path: '/agent-dashboard' },
      ],
    },
    {
      section: 'MY WORK',
      items: [
        { label: 'My Leads',        icon: Target,        path: '/leads' },
        { label: 'My Clients',      icon: UserCheck,     path: '/clients' },
        { label: 'Call Logs',       icon: PhoneCall,     path: '/calls' },
        { label: 'Follow-Ups',      icon: ClipboardList, path: '/followups' },
      ],
    },
    {
      section: 'REPORTS',
      items: [
        { label: 'My Reports',      icon: BarChart3,     path: '/reports' },
      ],
    },
    {
      section: 'ATTENDANCE',
      items: [
        { label: 'My Attendance',   icon: Calendar,      path: '/attendance' },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { label: 'My Profile',      icon: User,       path: '/profile' },
        { label: 'Privacy & Policy',icon: ScrollText, path: '/privacy-policy' },
      ],
    },
  ],
  [ROLES.AUDITOR]: [
    {
      section: 'OVERVIEW',
      items: [
        { label: 'My Dashboard',    icon: LayoutDashboard, path: '/auditor-dashboard' },
      ],
    },
    {
      section: 'FILING WORK',
      items: [
        { label: 'My Clients',      icon: Briefcase,     path: '/clients' },
        { label: 'ITR Filings',     icon: FileText,      path: '/filings' },
        { label: 'Documents',       icon: BookOpen,      path: '/import-export' },
      ],
    },
    {
      section: 'REPORTS',
      items: [
        { label: 'My Reports',      icon: BarChart3,     path: '/reports' },
      ],
    },
    {
      section: 'ATTENDANCE',
      items: [
        { label: 'My Attendance',   icon: Calendar,      path: '/attendance' },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { label: 'My Profile',      icon: User,       path: '/profile' },
        { label: 'Privacy & Policy',icon: ScrollText, path: '/privacy-policy' },
      ],
    },
  ],
  [ROLES.ACCOUNTS]: [
    {
      section: 'OVERVIEW',
      items: [
        { label: 'My Dashboard',    icon: LayoutDashboard, path: '/accounts-dashboard' },
      ],
    },
    {
      section: 'FINANCE',
      items: [
        { label: 'Payments',        icon: CreditCard,    path: '/payments' },
        { label: 'Clients',         icon: UserCheck,     path: '/clients' },
        { label: 'ITR Filings',     icon: FileText,      path: '/filings' },
      ],
    },
    {
      section: 'REPORTS',
      items: [
        { label: 'Financial Reports', icon: TrendingUp,  path: '/reports' },
      ],
    },
    {
      section: 'ATTENDANCE',
      items: [
        { label: 'My Attendance',   icon: Calendar,      path: '/attendance' },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { label: 'My Profile',      icon: User,       path: '/profile' },
        { label: 'Privacy & Policy',icon: ScrollText, path: '/privacy-policy' },
      ],
    },
  ],
}

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  supervisor:  'Supervisor',
  bpo_agent:   'BPO Agent',
  auditor:     'Auditor',
  accounts:    'Accounts',
}

export default function Sidebar({ collapsed, onToggle }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Determine role: real profile > URL detection > super_admin default
  // We deliberately do NOT use localStorage here — it caused stale role bugs
  const finalRole = (() => {
    if (profile?.role) return profile.role
    // Detect from current URL — covers both dashboard URLs and shared pages
    // when navigated from a role dashboard in dev mode
    if (pathname.startsWith('/super-admin') || pathname.startsWith('/dashboard'))   return ROLES.SUPER_ADMIN
    if (pathname.startsWith('/supervisor-dashboard'))  return ROLES.SUPERVISOR
    if (pathname.startsWith('/agent-dashboard'))       return ROLES.BPO_AGENT
    if (pathname.startsWith('/auditor-dashboard'))     return ROLES.AUDITOR
    if (pathname.startsWith('/accounts-dashboard'))    return ROLES.ACCOUNTS
    // For shared pages, check document.referrer or sessionStorage set when entering a role dashboard
    const sessionRole = sessionStorage.getItem('gk_active_role')
    if (sessionRole) return sessionRole
    return ROLES.SUPER_ADMIN
  })()

  // When entering a role dashboard, save to sessionStorage so shared pages keep the same sidebar
  useEffect(() => {
    if (profile?.role) {
      sessionStorage.setItem('gk_active_role', profile.role)
      return
    }
    if (pathname.startsWith('/supervisor-dashboard'))  sessionStorage.setItem('gk_active_role', ROLES.SUPERVISOR)
    else if (pathname.startsWith('/agent-dashboard'))  sessionStorage.setItem('gk_active_role', ROLES.BPO_AGENT)
    else if (pathname.startsWith('/auditor-dashboard'))sessionStorage.setItem('gk_active_role', ROLES.AUDITOR)
    else if (pathname.startsWith('/accounts-dashboard'))sessionStorage.setItem('gk_active_role', ROLES.ACCOUNTS)
    else if (pathname.startsWith('/super-admin') || pathname.startsWith('/dashboard')) sessionStorage.setItem('gk_active_role', ROLES.SUPER_ADMIN)
  }, [pathname, profile?.role])

  const sections = NAV_CONFIG[finalRole] || NAV_CONFIG[ROLES.SUPER_ADMIN]

  // Dashboard home path per role — logo click goes here
  const ROLE_HOME = {
    super_admin: '/super-admin',
    supervisor:  '/supervisor-dashboard',
    bpo_agent:   '/agent-dashboard',
    auditor:     '/auditor-dashboard',
    accounts:    '/accounts-dashboard',
  }
  const homePath = ROLE_HOME[finalRole] || '/super-admin'

  // Logo slide-in animation on mount/refresh
  const logoRef = useRef(null)
  useEffect(() => {
    if (!logoRef.current) return
    gsap.fromTo(
      logoRef.current,
      { x: -60, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.05 }
    )
  }, []) // runs once on mount = page load / refresh

  async function handleSignOut() {
    sessionStorage.removeItem('gk_active_role')
    localStorage.removeItem('gk_dev_role')
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside style={{
      background: 'linear-gradient(180deg, #0A0F1E 0%, #0d1426 55%, #0A0F1E 100%)',
      width: collapsed ? 64 : 248,
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRight: '1px solid rgba(200,169,107,0.12)',
      position: 'relative',
    }}>

      {/* ── LOGO — click goes to dashboard, slides in on mount ── */}
      <div
        ref={logoRef}
        onClick={() => navigate(homePath)}
        title="Go to Dashboard"
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          padding: collapsed ? '10px 0' : '12px 14px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          minHeight: 66, flexShrink: 0,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,169,107,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <img
          src="/mylogo.jpeg"
          alt="GK Tax Solutions"
          style={{
            height: collapsed ? 36 : 46,
            width: 'auto',
            display: 'block',
            flexShrink: 0,
            transition: 'height 0.25s',
            filter: 'drop-shadow(0 2px 8px rgba(139,30,63,0.4))',
          }}
        />
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 13, lineHeight: 1.2, whiteSpace: 'nowrap', fontFamily: "'Poppins',sans-serif" }}>GK Tax Solutions</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', whiteSpace: 'nowrap', marginTop: 2 }}>BPO Operations Portal</p>
          </div>
        )}
      </div>

      {/* ── COLLAPSE TOGGLE ── */}
      <button
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute', right: -12, top: 76,
          width: 24, height: 24, borderRadius: '50%',
          background: '#fff', border: '1.5px solid #E5E5E3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#475569', zIndex: 10,
          boxShadow: '0 2px 8px rgba(51,68,105,0.14)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#C8A96B'; e.currentTarget.style.color = '#C8A96B' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EAF0'; e.currentTarget.style.color = '#475569' }}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* ── NAV ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 8px' }}>
        {sections.map(({ section, items }) => (
          <div key={section} style={{ marginBottom: 2 }}>
            {!collapsed && (
              <p style={{
                padding: '10px 10px 4px',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
                userSelect: 'none',
              }}>{section}</p>
            )}
            {collapsed && <div style={{ height: 8 }} />}
            {items.map(({ label, icon: Icon, path }) => (
              <NavLink
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                style={collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── USER CARD + LOGOUT ── */}
      <div style={{
        padding: '8px 8px 10px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        {profile && (
          <NavLink to="/profile" style={{ textDecoration: 'none' }}>
            {!collapsed ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 10px', marginBottom: 6,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10, border: '1px solid rgba(200,169,107,0.12)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,169,107,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #8B1E3F, #6f1832)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 800,
                  boxShadow: '0 0 0 2px rgba(200,169,107,0.25)',
                }}>
                  {getInitials(profile.name)}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <p style={{ color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{profile.name}</p>
                  <p style={{ color: '#C8A96B', fontSize: 10, fontWeight: 500, letterSpacing: '0.03em', whiteSpace: 'nowrap', marginTop: 2 }}>{ROLE_LABELS[profile.role] || profile.role}</p>
                </div>
                <User size={12} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <div
                  title={`${profile.name} — ${ROLE_LABELS[profile.role]}`}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B1E3F, #6f1832)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 0 0 2px rgba(200,169,107,0.25)',
                  }}
                >
                  {getInitials(profile.name)}
                </div>
              </div>
            )}
          </NavLink>
        )}

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Log Out' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            width: '100%', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,0.35)',
            fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,30,63,0.15)'; e.currentTarget.style.color = '#C8A96B' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  )
}
