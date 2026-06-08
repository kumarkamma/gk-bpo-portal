import { useEffect, useRef, useState } from 'react'
import { Users, PhoneCall, UserCheck, TrendingUp, Clock, BarChart3, Calendar, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatCurrency } from '../../lib/utils'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const KPI = [
  { key: 'agentsOnline',    label: 'Agents Online',    icon: Users,      color: '#0F766E', bg: '#F0FDFA' },
  { key: 'callsToday',      label: 'Calls Today',       icon: PhoneCall,  color: '#0A1628', bg: '#EFF6FF' },
  { key: 'connected',       label: 'Connected',         icon: UserCheck,  color: '#C9A84C', bg: '#FFFBEB' },
  { key: 'interested',      label: 'Interested',        icon: TrendingUp, color: '#A11D4A', bg: '#FFF1F2' },
  { key: 'followupsDue',    label: 'Follow-Ups Due',    icon: Clock,      color: '#D97706', bg: '#FEF3C7' },
  { key: 'totalLeads',      label: 'Total Leads',       icon: BarChart3,  color: '#2563EB', bg: '#EFF6FF' },
  { key: 'totalClients',    label: 'Total Clients',     icon: UserCheck,  color: '#16A34A', bg: '#DCFCE7' },
  { key: 'revenuePipeline', label: 'Revenue Pipeline',  icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF', prefix: '₹' },
]

function KpiCard({ kpi, value }) {
  const Icon = kpi.icon
  const display = kpi.prefix === '₹'
    ? `₹${(value >= 100000 ? (value / 100000).toFixed(1) + 'L' : (value || 0).toLocaleString('en-IN'))}`
    : (value || 0).toLocaleString()
  return (
    <div className="stat-card stagger-item">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} style={{ color: kpi.color }} />
        </div>
      </div>
      <p className="stat-card-value font-poppins">{display}</p>
      <p className="stat-card-label" style={{ marginTop: 6 }}>{kpi.label}</p>
    </div>
  )
}

export default function SupervisorDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState([])
  const [followupsDue, setFollowupsDue] = useState([])
  const [callsData, setCallsData] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  useStaggerAnimation(containerRef)
  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

      const [
        { count: totalLeads },
        { count: totalClients },
        { data: agentList },
        { data: todayCalls },
        { data: followups },
        { data: payments },
        { data: attendance },
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('id, name, role').eq('role', 'bpo_agent'),
        supabase.from('call_logs').select('call_status, interest_status, agent_id').gte('created_at', todayStart.toISOString()),
        supabase.from('leads').select('id, client_name, mobile, status, next_followup_date').eq('next_followup_date', today).limit(6),
        supabase.from('payments').select('amount_due'),
        supabase.from('attendance').select('user_id').eq('date', today).is('logout_time', null),
      ])

      const connected = todayCalls?.filter(c => c.call_status === 'Connected').length || 0
      const interested = todayCalls?.filter(c => c.interest_status === 'Interested').length || 0
      const pipeline = payments?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0

      const agentCallMap = {}
      todayCalls?.forEach(c => { agentCallMap[c.agent_id] = (agentCallMap[c.agent_id] || 0) + 1 })
      const agentsWithStats = (agentList || []).map(a => ({
        ...a,
        callsToday: agentCallMap[a.id] || 0,
        online: attendance?.some(att => att.user_id === a.id),
      }))

      setStats({
        totalLeads: totalLeads || 0, totalClients: totalClients || 0,
        callsToday: todayCalls?.length || 0, connected, interested,
        followupsDue: followups?.length || 0, revenuePipeline: pipeline,
        agentsOnline: attendance?.length || 0,
      })
      setAgents(agentsWithStats)
      setFollowupsDue(followups || [])

      const statusMap = {}
      todayCalls?.forEach(c => { statusMap[c.call_status || 'Unknown'] = (statusMap[c.call_status || 'Unknown'] || 0) + 1 })
      setCallsData(Object.entries(statusMap).map(([name, count]) => ({ name, count })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}><LoadingSpinner size="lg" text="Loading dashboard…" /></div>

  const STATUS_DOT = { Connected: '#16A34A', 'Not Connected': '#DC2626', Busy: '#D97706', 'Switched Off': '#64748B' }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="page-header stagger-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="page-title">Supervisor Dashboard</p>
          <p className="page-subtitle">Team overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={() => loadDashboard(true)} className="btn btn-outline btn-sm" disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14, marginBottom: 20 }}>
        {KPI.map(kpi => <KpiCard key={kpi.key} kpi={kpi} value={stats[kpi.key]} />)}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 14 }}>
        {/* Call Status Bar Chart */}
        <div className="card stagger-item">
          <div className="card-header">
            <p className="card-title">Today's Call Status Breakdown</p>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, background: '#F5F7FA', padding: '3px 8px', borderRadius: 5 }}>Live</span>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {callsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={callsData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#C9A84C" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>No calls logged today</div>
            )}
          </div>
        </div>

        {/* Agent Performance */}
        <div className="card stagger-item">
          <div className="card-header">
            <p className="card-title">Agent Performance</p>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>Today</span>
          </div>
          <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agents.length > 0 ? agents.slice(0, 6).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontSize: 11, fontWeight: 800 }}>
                    {a.name?.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>{a.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.online ? '#16A34A' : '#CBD5E1', display: 'inline-block' }} />
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>{a.online ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', fontFamily: "'Poppins',sans-serif" }}>{a.callsToday}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8' }}>calls</p>
                </div>
              </div>
            )) : (
              <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No agents found</p>
            )}
          </div>
        </div>
      </div>

      {/* Follow-Ups Due Today */}
      <div className="table-container stagger-item">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: '#A11D4A' }} />
            <p className="table-title">Follow-Ups Due Today</p>
          </div>
          {stats.followupsDue > 0 && (
            <span className="badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>{stats.followupsDue} due</span>
          )}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Mobile</th>
              <th>Status</th>
              <th>Follow-Up Date</th>
            </tr>
          </thead>
          <tbody>
            {followupsDue.length > 0 ? followupsDue.map(l => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{l.client_name}</td>
                <td style={{ fontFamily: 'monospace', color: '#475569' }}>{l.mobile}</td>
                <td><span className="badge" style={{ background: '#FEF3C7', color: '#92400E' }}>{l.status}</span></td>
                <td style={{ color: '#64748B', fontSize: 12 }}>{l.next_followup_date}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>No follow-ups due today</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
