import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crown, Users, UserCheck, UserX, Shield, BarChart3, Clock,
  Ban, RefreshCw, ArrowRight, PhoneCall, FileText,
  CreditCard, CheckCircle, UserCog, Calendar, Upload, Settings,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDateTime, formatDate, formatCurrency, getInitials } from '../../lib/utils'

const ROLE_META = {
  super_admin: { label: 'Super Admin', color: '#8B1E3F', bg: '#FDF0F3' },
  supervisor:  { label: 'Supervisor',  color: '#0A0F1E', bg: '#EEF1F8' },
  bpo_agent:   { label: 'BPO Agent',   color: '#065F46', bg: '#ECFDF5' },
  auditor:     { label: 'Auditor',     color: '#C8A96B', bg: '#FBF7EE' },
  accounts:    { label: 'Accounts',    color: '#0F766E', bg: '#F0FDFA' },
}

const STATUS_META = {
  active:    { label: 'Active',    color: '#16A34A', bg: '#DCFCE7' },
  inactive:  { label: 'Inactive',  color: '#64748B', bg: '#F1F5F9' },
  suspended: { label: 'Suspended', color: '#D97706', bg: '#FEF3C7' },
  banned:    { label: 'Banned',    color: '#DC2626', bg: '#FEE2E2' },
}

function KpiTile({ label, value, icon: Icon, color, bg, sub }) {
  return (
    <div style={{ padding: '18px 20px', borderRadius: 14, background: bg, border: `1px solid ${color}22`, flex: 1, minWidth: 150 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={16} style={{ color }} />
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif", lineHeight: 1 }}>{value ?? '—'}</p>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 6 }}>{label}</p>
      {sub && <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

function RolePill({ role }) {
  const m = ROLE_META[role] || { label: role, color: '#64748B', bg: '#F1F5F9' }
  return (
    <span style={{ padding: '2px 9px', borderRadius: 5, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>{m.label}</span>
  )
}

function StatusDot({ status }) {
  const m = STATUS_META[status || 'active']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 5, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

function QuickAction({ label, desc, icon: Icon, color, bg, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderRadius: 12, border: `1.5px solid ${hovered ? color : color + '30'}`,
        background: hovered ? bg : '#fff', cursor: 'pointer', transition: 'all 0.15s',
        textAlign: 'left', width: '100%',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? `0 6px 20px ${color}22` : 'none',
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{label}</p>
        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{desc}</p>
      </div>
      <ArrowRight size={14} style={{ color: hovered ? color : '#CBD5E1', transition: 'color 0.15s' }} />
    </button>
  )
}

export default function SuperAdminDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [users, setUsers] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [systemStats, setSystemStats] = useState({})
  const [todayAttendance, setTodayAttendance] = useState([])

  useStaggerAnimation(containerRef)
  useEffect(() => { loadAll() }, [])

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const [
        { data: allUsers },
        { data: logs },
        { count: totalLeads },
        { count: totalClients },
        { data: payments },
        { count: totalFilings },
        { count: pendingFilings },
        { data: attendance },
        { count: totalCalls },
      ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*, users(name, role)').order('created_at', { ascending: false }).limit(15),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('final_amount,amount_paid,amount_due'),
        supabase.from('filings').select('*', { count: 'exact', head: true }),
        supabase.from('filings').select('*', { count: 'exact', head: true }).not('filing_status', 'in', '("Filed","Completed")'),
        supabase.from('attendance').select('*, users(name, role)').eq('date', today).order('login_time', { ascending: false }),
        supabase.from('call_logs').select('*', { count: 'exact', head: true }),
      ])
      setUsers(allUsers || [])
      setRecentLogs(logs || [])
      setTodayAttendance(attendance || [])
      setSystemStats({
        totalLeads: totalLeads || 0,
        totalClients: totalClients || 0,
        totalFilings: totalFilings || 0,
        pendingFilings: pendingFilings || 0,
        totalCalls: totalCalls || 0,
        collectedRevenue: payments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0,
        pendingRevenue: payments?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const totalUsers     = users.length
  const activeUsers    = users.filter(u => (u.status || 'active') === 'active').length
  const suspendedUsers = users.filter(u => u.status === 'suspended').length
  const bannedUsers    = users.filter(u => u.status === 'banned').length
  const inactiveUsers  = users.filter(u => u.status === 'inactive').length
  const roleBreakdown  = Object.entries(users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {}))
  const todayActive    = todayAttendance.filter(a => !a.logout_time).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #E8EAF0', borderTopColor: '#C8A96B', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748B', fontSize: 14 }}>Loading…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div ref={containerRef}>

      {/* Header */}
      <div className="stagger-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#0A0F1E,#111b30)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(10,15,30,0.25)' }}>
            <Crown size={22} style={{ color: '#C8A96B' }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', fontFamily: "'Poppins',sans-serif", lineHeight: 1.2 }}>Super Admin Control Center</p>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Full portal oversight — {profile?.name}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => loadAll(true)} className="btn btn-outline btn-sm" disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => navigate('/users')} className="btn btn-gold btn-sm">
            <UserCog size={13} /> Manage Users
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="stagger-item" style={{ padding: '14px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#0A0F1E,#111b30)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#25D366', boxShadow: '0 0 0 3px rgba(37,211,102,0.2)', display: 'inline-block' }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Portal Online</span>
        </div>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
        {[
          { label: 'Active Users',      value: `${activeUsers}` },
          { label: 'Checked-in Today',  value: todayAttendance.length },
          { label: 'Working Now',       value: todayActive },
          { label: 'Restricted',        value: bannedUsers + suspendedUsers > 0 ? `${bannedUsers + suspendedUsers}` : 'None' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{label}:</span>
            <span style={{ color: '#C8A96B', fontSize: 12, fontWeight: 700 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* User KPIs */}
      <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>USER STATUS</p>
      <div className="stagger-item" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiTile label="Total Users"  value={totalUsers}     icon={Users}       color="#0A0F1E" bg="#EEF1F8" />
        <KpiTile label="Active"       value={activeUsers}    icon={CheckCircle} color="#16A34A" bg="#DCFCE7" sub="Can login" />
        <KpiTile label="Suspended"    value={suspendedUsers} icon={Clock}       color="#D97706" bg="#FEF3C7" sub="Temp blocked" />
        <KpiTile label="Banned"       value={bannedUsers}    icon={Ban}         color="#DC2626" bg="#FEE2E2" sub="Perm blocked" />
        <KpiTile label="Inactive"     value={inactiveUsers}  icon={UserX}       color="#64748B" bg="#F1F5F9" sub="Deactivated" />
      </div>

      {/* Portal KPIs */}
      <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>PORTAL PERFORMANCE</p>
      <div className="stagger-item" style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <KpiTile label="Total Leads"    value={systemStats.totalLeads?.toLocaleString()}   icon={Users}      color="#0A0F1E" bg="#EEF1F8" />
        <KpiTile label="Active Clients" value={systemStats.totalClients?.toLocaleString()} icon={UserCheck}  color="#0F766E" bg="#F0FDFA" />
        <KpiTile label="Calls Logged"   value={systemStats.totalCalls?.toLocaleString()}   icon={PhoneCall}  color="#C8A96B" bg="#FBF7EE" />
        <KpiTile label="Filings"        value={systemStats.totalFilings?.toLocaleString()} icon={FileText}   color="#8B1E3F" bg="#FDF0F3" sub={`${systemStats.pendingFilings} pending`} />
        <KpiTile label="Collected"      value={formatCurrency(systemStats.collectedRevenue)} icon={CreditCard} color="#16A34A" bg="#DCFCE7" sub={`${formatCurrency(systemStats.pendingRevenue)} due`} />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>

        {/* Users Table */}
        <div className="stagger-item">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>All Portal Users</p>
            <button onClick={() => navigate('/users')} style={{ fontSize: 12, color: '#8B1E3F', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Full Management <ArrowRight size={12} />
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
              </thead>
              <tbody>
                {users.slice(0, 10).map(u => (
                  <tr key={u.id} style={{ opacity: u.status === 'banned' ? 0.55 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: u.role === 'super_admin' ? 'linear-gradient(135deg,#C8A96B,#a8893b)' : 'linear-gradient(135deg,#0A0F1E,#111b30)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: u.role === 'super_admin' ? '#0A0F1E' : '#C8A96B',
                          fontSize: 11, fontWeight: 800,
                          border: u.role === 'super_admin' ? '2px solid #C8A96B' : 'none',
                        }}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{u.name}</p>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><RolePill role={u.role} /></td>
                    <td><StatusDot status={u.status || 'active'} /></td>
                    <td style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(u.created_at)}</td>
                    <td>
                      {u.id !== profile?.id && (
                        <button onClick={() => navigate('/users')} style={{ fontSize: 11, color: '#8B1E3F', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Settings size={11} /> Manage
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length > 10 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '10px 0' }}>
                      <button onClick={() => navigate('/users')} style={{ fontSize: 12, color: '#8B1E3F', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                        +{users.length - 10} more — View all →
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Role Breakdown */}
          <div className="card stagger-item">
            <div className="card-header">
              <p className="card-title">Team by Role</p>
              <span style={{ fontSize: 11, color: '#94A3B8', background: '#F8F9FB', padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>{totalUsers} total</span>
            </div>
            <div style={{ padding: '8px 20px 16px' }}>
              {roleBreakdown.map(([role, count]) => {
                const m = ROLE_META[role] || { label: role, color: '#64748B', bg: '#F1F5F9' }
                const pct = totalUsers ? Math.round((count / totalUsers) * 100) : 0
                return (
                  <div key={role} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{m.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Today Attendance */}
          <div className="card stagger-item">
            <div className="card-header">
              <p className="card-title">Today's Attendance</p>
              <span style={{ fontSize: 11, background: todayActive > 0 ? '#DCFCE7' : '#F1F5F9', color: todayActive > 0 ? '#16A34A' : '#64748B', padding: '2px 8px', borderRadius: 5, fontWeight: 700 }}>
                {todayActive} working
              </span>
            </div>
            <div style={{ padding: '8px 16px 12px', maxHeight: 200, overflowY: 'auto' }}>
              {todayAttendance.length > 0 ? todayAttendance.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 4px', borderBottom: '1px solid #F8F9FB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FBF7EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#C8A96B' }}>
                      {getInitials(a.users?.name)}
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{a.users?.name}</p>
                      <p style={{ fontSize: 10, color: '#94A3B8' }}>{new Date(a.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  {!a.logout_time
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 7px', borderRadius: 5 }}>Active</span>
                    : <span style={{ fontSize: 10, color: '#64748B' }}>{a.working_hours}h</span>
                  }
                </div>
              )) : (
                <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>No check-ins today</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + Audit Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

        <div className="stagger-item">
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>QUICK ACTIONS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <QuickAction label="Create New User"  desc="Add portal access for a team member" icon={Users}    color="#0A0F1E" bg="#EEF1F8" onClick={() => navigate('/users')} />
            <QuickAction label="User Management"  desc="Edit roles, status, passwords"       icon={UserCog}  color="#8B1E3F" bg="#FDF0F3" onClick={() => navigate('/users')} />
            <QuickAction label="Audit Logs"        desc="Full system activity trail"          icon={Shield}   color="#8B1E3F" bg="#FDF0F3" onClick={() => navigate('/audit-logs')} />
            <QuickAction label="Attendance"        desc="Monitor team clock-in/out"           icon={Calendar} color="#0F766E" bg="#F0FDFA" onClick={() => navigate('/attendance')} />
            <QuickAction label="Reports"           desc="Revenue, leads, performance"         icon={BarChart3} color="#C8A96B" bg="#FBF7EE" onClick={() => navigate('/reports')} />
            <QuickAction label="Import / Export"   desc="Bulk data operations"                icon={Upload}   color="#0A0F1E" bg="#EEF1F8" onClick={() => navigate('/import-export')} />
          </div>
        </div>

        <div className="stagger-item">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>RECENT SYSTEM ACTIVITY</p>
            <button onClick={() => navigate('/audit-logs')} style={{ fontSize: 12, color: '#8B1E3F', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>User</th><th>Action</th><th>Table</th></tr>
              </thead>
              <tbody>
                {recentLogs.length > 0 ? recentLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                    <td>
                      <p style={{ fontSize: 12, fontWeight: 700 }}>{log.users?.name || '—'}</p>
                      {log.users?.role && <RolePill role={log.users.role} />}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                        background: /CREATE|INSERT/.test(log.action) ? '#DCFCE7' : /DELETE|BAN/.test(log.action) ? '#FEE2E2' : /UPDATE/.test(log.action) ? '#EEF1F8' : '#F1F5F9',
                        color:      /CREATE|INSERT/.test(log.action) ? '#16A34A' : /DELETE|BAN/.test(log.action) ? '#DC2626' : /UPDATE/.test(log.action) ? '#0A0F1E' : '#64748B',
                      }}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748B' }}>{log.table_name || '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 13 }}>No activity yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
