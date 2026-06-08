import { useEffect, useRef, useState } from 'react'
import {
  Users, UserCheck, CreditCard, TrendingUp, FileText,
  AlertTriangle, PhoneCall, Clock, ArrowUpRight,
  RefreshCw, UserCog, Shield, BarChart3, Upload, Calendar, UserPlus
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatCurrency, formatDate } from '../../lib/utils'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useNotifications } from '../../context/NotificationContext'
import { useNavigate } from 'react-router-dom'

const KPI_CONFIG = [
  { key: 'totalLeads',      label: 'Total Leads',       icon: Users,        color: '#2563EB', bg: '#EFF6FF', prefix: '',  suffix: '' },
  { key: 'totalClients',    label: 'Active Clients',     icon: UserCheck,    color: '#0F766E', bg: '#F0FDFA', prefix: '',  suffix: '' },
  { key: 'collectedRevenue',label: 'Revenue Collected',  icon: CreditCard,   color: '#16A34A', bg: '#DCFCE7', prefix: '₹', suffix: '' },
  { key: 'pendingRevenue',  label: 'Outstanding Dues',   icon: AlertTriangle,color: '#D97706', bg: '#FEF3C7', prefix: '₹', suffix: '' },
  { key: 'pendingFilings',  label: 'Pending Filings',    icon: FileText,     color: '#7C3AED', bg: '#F5F3FF', prefix: '',  suffix: '' },
  { key: 'conversionRate',  label: 'Conversion Rate',    icon: TrendingUp,   color: '#A11D4A', bg: '#FFF1F2', prefix: '',  suffix: '%' },
]

const PIE_COLORS = ['#D4AF37','#A11D4A','#2563EB','#16A34A','#7C3AED','#0F766E','#D97706','#0B1026']

const STATUS_BADGE = {
  'New Lead':           { bg: '#EFF6FF', color: '#1D4ED8' },
  'Interested':         { bg: '#DCFCE7', color: '#16A34A' },
  'Follow-Up Scheduled':{ bg: '#FEF3C7', color: '#D97706' },
  'Documents Requested':{ bg: '#FFF7ED', color: '#C2410C' },
  'Completed':          { bg: '#DCFCE7', color: '#15803D' },
  'Lost':               { bg: '#F1F5F9', color: '#64748B' },
}

function KpiCard({ kpi, value, loading }) {
  const Icon = kpi.icon
  const formatted = kpi.prefix === '₹'
    ? formatCurrency(value)
    : `${kpi.prefix}${typeof value === 'number' ? value.toLocaleString() : value}${kpi.suffix}`

  return (
    <div className="stat-card stagger-item" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: kpi.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} style={{ color: kpi.color }} />
        </div>
        <ArrowUpRight size={14} style={{ color: '#CBD5E1' }} />
      </div>
      {loading
        ? <div className="skeleton" style={{ height: 28, width: 100, marginBottom: 6 }} />
        : <p className="stat-card-value font-poppins">{formatted}</p>
      }
      <p className="stat-card-label" style={{ marginTop: 6 }}>{kpi.label}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0A1628', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#D4AF37', fontSize: 13, fontWeight: 700 }}>
          {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const { addNotification } = useNotifications()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [stats, setStats] = useState({})
  const [teamStats, setTeamStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [leadsByStatus, setLeadsByStatus] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [recentLeads, setRecentLeads] = useState([])
  const [callStats, setCallStats] = useState([])

  useStaggerAnimation(containerRef)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [
        { count: totalLeads },
        { count: totalClients },
        { data: payments },
        { count: pendingFilings },
        { data: leadStatuses },
        { data: recent },
        { data: callLogs },
        { data: teamMembers },
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('final_amount,amount_paid,amount_due,payment_status,payment_date'),
        supabase.from('filings').select('*', { count: 'exact', head: true }).not('filing_status', 'in', '("Filed","Completed")'),
        supabase.from('leads').select('status').limit(2000),
        supabase.from('leads').select('id,client_name,mobile,status,city,created_at').order('created_at', { ascending: false }).limit(8),
        supabase.from('call_logs').select('call_status,created_at').limit(500),
        supabase.from('users').select('id,name,role,status'),
      ])

      const totalRevenue   = payments?.reduce((s, p) => s + (p.final_amount || 0), 0) || 0
      const collectedRevenue = payments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
      const pendingRevenue = payments?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0

      setStats({
        totalLeads:      totalLeads || 0,
        totalClients:    totalClients || 0,
        totalRevenue,
        collectedRevenue,
        pendingRevenue,
        pendingFilings:  pendingFilings || 0,
        conversionRate:  totalLeads ? ((totalClients / totalLeads) * 100).toFixed(1) : 0,
      })

      // Lead status pie
      const sMap = {}
      leadStatuses?.forEach(({ status }) => { sMap[status] = (sMap[status] || 0) + 1 })
      setLeadsByStatus(
        Object.entries(sMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      )

      // Revenue by month (last 6)
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const now = new Date()
      const revMap = {}
      payments?.forEach(p => {
        if (!p.payment_date) return
        const d = new Date(p.payment_date)
        const key = months[d.getMonth()]
        revMap[key] = (revMap[key] || 0) + (p.amount_paid || 0)
      })
      const last6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        const k = months[d.getMonth()]
        return { month: k, revenue: revMap[k] || 0 }
      })
      setRevenueData(last6)

      // Call stats
      const cMap = {}
      callLogs?.forEach(c => { cMap[c.call_status || 'Unknown'] = (cMap[c.call_status || 'Unknown'] || 0) + 1 })
      setCallStats(Object.entries(cMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6))

      setRecentLeads(recent || [])

      // Team stats by role
      const roleMap = {}
      teamMembers?.forEach(u => {
        if (!roleMap[u.role]) roleMap[u.role] = { total: 0, active: 0 }
        roleMap[u.role].total++
        if ((u.status || 'active') === 'active') roleMap[u.role].active++
      })
      setTeamStats(Object.entries(roleMap).map(([role, counts]) => ({ role, ...counts })))

      if (isRefresh) addNotification('Dashboard data refreshed successfully', 'success', 'Dashboard')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const statusBadge = (status) => {
    const s = STATUS_BADGE[status] || { bg: '#F1F5F9', color: '#64748B' }
    return (
      <span className="badge" style={{ background: s.bg, color: s.color, fontSize: 11 }}>{status || '—'}</span>
    )
  }

  return (
    <div ref={containerRef}>
      {/* ── Page Header ── */}
      <div className="page-header stagger-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="page-title">Dashboard</p>
          <p className="page-subtitle">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.name?.split(' ')[0]} — here's today's overview</p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          disabled={refreshing}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
        {KPI_CONFIG.map(kpi => (
          <KpiCard key={kpi.key} kpi={kpi} value={stats[kpi.key]} loading={loading} />
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14 }}>
        {/* Revenue Area Chart */}
        <div className="card stagger-item">
          <div className="card-header">
            <p className="card-title">Revenue Trend — Last 6 Months</p>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, background: '#F4F6FA', padding: '3px 8px', borderRadius: 5 }}>
              {new Date().getFullYear()}
            </span>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#D4AF37" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: '#D4AF37', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leads Pie */}
        <div className="card stagger-item">
          <div className="card-header">
            <p className="card-title">Leads by Status</p>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {leadsByStatus.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={leadsByStatus} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                      {leadsByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E4E8F0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                  {leadsByStatus.slice(0, 5).map(({ name, value }, i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#4B5563', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 13 }}>No data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Super Admin Control Panel ── */}
      {profile?.role === 'super_admin' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: 'linear-gradient(180deg,#D4AF37,#A11D4A)' }} />
              <p style={{ fontSize: 14, fontWeight: 800, color: '#0A1628', fontFamily: "'Poppins',sans-serif" }}>Super Admin Control Panel</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/users')}>
              <UserCog size={12} /> Manage All Users
            </button>
          </div>

          {/* Quick access tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Create User',    icon: UserPlus,   color: '#0A1628', bg: '#EFF6FF',  path: '/users',       action: () => navigate('/users') },
              { label: 'User Management',icon: UserCog,    color: '#7C3AED', bg: '#F5F3FF',  path: '/users',       action: () => navigate('/users') },
              { label: 'Audit Logs',     icon: Shield,     color: '#A11D4A', bg: '#FFF1F2',  path: '/audit-logs',  action: () => navigate('/audit-logs') },
              { label: 'Attendance',     icon: Calendar,   color: '#0F766E', bg: '#F0FDFA',  path: '/attendance',  action: () => navigate('/attendance') },
              { label: 'Reports',        icon: BarChart3,  color: '#D97706', bg: '#FEF3C7',  path: '/reports',     action: () => navigate('/reports') },
              { label: 'Import/Export',  icon: Upload,     color: '#2563EB', bg: '#DBEAFE',  path: '/import-export',action: () => navigate('/import-export') },
            ].map(({ label, icon: Icon, color, bg, action }) => (
              <button key={label} onClick={action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 12px', borderRadius: 12, border: `1.5px solid ${color}18`, background: bg, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}18` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', textAlign: 'center' }}>{label}</span>
              </button>
            ))}
          </div>

          {/* Team breakdown */}
          {teamStats.length > 0 && (
            <div className="card">
              <div className="card-header">
                <p className="card-title">Team Breakdown by Role</p>
                <span style={{ fontSize: 11, color: '#94A3B8', background: '#F5F7FA', padding: '3px 8px', borderRadius: 5, fontWeight: 600 }}>{teamStats.reduce((s, t) => s + t.total, 0)} total</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', gap: 0, flexWrap: 'wrap' }}>
                {teamStats.map(({ role, total, active }) => {
                  const meta = { super_admin: { label:'Super Admin',color:'#7C3AED',bg:'#F5F3FF' }, supervisor: { label:'Supervisor',color:'#1D4ED8',bg:'#EFF6FF' }, bpo_agent: { label:'BPO Agent',color:'#065F46',bg:'#ECFDF5' }, auditor: { label:'Auditor',color:'#92400E',bg:'#FFFBEB' }, accounts: { label:'Accounts',color:'#0F766E',bg:'#F0FDFA' } }[role] || { label: role, color: '#64748B', bg: '#F1F5F9' }
                  return (
                    <div key={role} style={{ flex: 1, minWidth: 140, padding: '12px 16px', borderRight: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{meta.label}</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: meta.color, fontFamily: "'Poppins',sans-serif", lineHeight: 1 }}>{total}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{active} active</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Call Stats + Recent Leads ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
        {/* Call Stats Bar */}
        <div className="card stagger-item">
          <div className="card-header">
            <p className="card-title">Call Status Breakdown</p>
            <PhoneCall size={14} style={{ color: '#94A3B8' }} />
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {callStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={callStats} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E4E8F0' }} />
                  <Bar dataKey="count" fill="#0A1628" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 13 }}>No call data</div>
            )}
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="table-container stagger-item">
          <div className="table-header">
            <p className="table-title">Recent Leads</p>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>Last 8 entries</span>
          </div>
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 6 }} />)}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.length > 0 ? recentLeads.map((lead, i) => (
                  <tr key={lead.id}>
                    <td style={{ color: '#CBD5E1', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: '#F4F6FA', border: '1px solid #E4E8F0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: '#0B1026', flexShrink: 0,
                        }}>
                          {lead.client_name?.charAt(0) || '?'}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{lead.client_name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#4B5563', fontFamily: 'monospace', fontSize: 12 }}>{lead.mobile}</td>
                    <td style={{ color: '#64748B', fontSize: 12 }}>{lead.city || '—'}</td>
                    <td>{statusBadge(lead.status)}</td>
                    <td style={{ color: '#94A3B8', fontSize: 11 }}>{formatDate(lead.created_at)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>No leads yet — import your first batch</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
