import { useEffect, useRef, useState } from 'react'
import { PhoneCall, Users, Clock, TrendingUp, Phone, Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDate } from '../../lib/utils'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import CallLogModal from '../admin/CallLogModal'

const KPI = [
  { key: 'totalLeads',     label: 'My Leads',         icon: Users,      color: '#0A1628', bg: '#EFF6FF' },
  { key: 'callsToday',     label: 'Calls Today',       icon: PhoneCall,  color: '#C9A84C', bg: '#FFFBEB' },
  { key: 'connected',      label: 'Connected',         icon: CheckCircle,color: '#16A34A', bg: '#DCFCE7' },
  { key: 'interested',     label: 'Interested',        icon: TrendingUp, color: '#A11D4A', bg: '#FFF1F2' },
  { key: 'followupsDue',   label: 'Follow-Ups Today',  icon: Clock,      color: '#D97706', bg: '#FEF3C7' },
  { key: 'conversionRate', label: 'Conversion Rate',   icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF', suffix: '%' },
]

function KpiCard({ kpi, value }) {
  const Icon = kpi.icon
  const display = `${kpi.prefix || ''}${typeof value === 'number' ? value.toLocaleString() : (value || 0)}${kpi.suffix || ''}`
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

const CALL_STATUS_STYLE = {
  'Connected':     { bg: '#DCFCE7', color: '#16A34A' },
  'Not Connected': { bg: '#FEE2E2', color: '#DC2626' },
  'Busy':          { bg: '#FEF3C7', color: '#D97706' },
  'Switched Off':  { bg: '#F1F5F9', color: '#64748B' },
}

export default function AgentDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [myLeads, setMyLeads] = useState([])
  const [followups, setFollowups] = useState([])
  const [callLead, setCallLead] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
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
        { data: todayCalls },
        { data: followupLeads },
        { data: hotLeads },
        { data: recentCallLogs },
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_bpo', profile.id),
        supabase.from('call_logs').select('call_status, interest_status').eq('agent_id', profile.id).gte('created_at', todayStart.toISOString()),
        supabase.from('leads').select('id, client_name, mobile, status, next_followup_date').eq('assigned_bpo', profile.id).eq('next_followup_date', today).limit(5),
        supabase.from('leads').select('id, client_name, mobile, status').eq('assigned_bpo', profile.id).in('status', ['Interested', 'Follow-Up Scheduled', 'Documents Requested']).limit(8),
        supabase.from('call_logs').select('call_status, interest_status, created_at, leads(client_name)').eq('agent_id', profile.id).order('created_at', { ascending: false }).limit(6),
      ])

      const connected = todayCalls?.filter(c => c.call_status === 'Connected').length || 0
      const interested = todayCalls?.filter(c => c.interest_status === 'Interested').length || 0

      setStats({
        totalLeads: totalLeads || 0,
        callsToday: todayCalls?.length || 0,
        connected, interested,
        followupsDue: followupLeads?.length || 0,
        conversionRate: todayCalls?.length ? ((interested / todayCalls.length) * 100).toFixed(1) : 0,
      })
      setMyLeads(hotLeads || [])
      setFollowups(followupLeads || [])
      setRecentLogs(recentCallLogs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}><LoadingSpinner size="lg" text="Loading your dashboard…" /></div>

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="page-header stagger-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="page-title">My Dashboard</p>
          <p className="page-subtitle">Welcome back, {profile?.name?.split(' ')[0]} — let's hit today's targets!</p>
        </div>
        <button onClick={() => loadDashboard(true)} className="btn btn-outline btn-sm" disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14, marginBottom: 20 }}>
        {KPI.map(kpi => <KpiCard key={kpi.key} kpi={kpi} value={stats[kpi.key]} />)}
      </div>

      {/* Two column section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Follow-Ups Due Today */}
        <div className="card stagger-item">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={15} style={{ color: '#D97706' }} />
              <p className="card-title">Follow-Ups Due Today</p>
            </div>
            {stats.followupsDue > 0 && (
              <span className="badge" style={{ background: '#FEF3C7', color: '#D97706' }}>{stats.followupsDue}</span>
            )}
          </div>
          <div style={{ padding: '4px 0' }}>
            {followups.length > 0 ? followups.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{l.client_name}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontFamily: 'monospace' }}>{l.mobile}</p>
                </div>
                <button
                  onClick={() => setCallLead(l)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#DCFCE7', color: '#16A34A', fontSize: 12, fontWeight: 700 }}
                >
                  <Phone size={12} /> Call Now
                </button>
              </div>
            )) : (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No follow-ups due today 🎉</div>
            )}
          </div>
        </div>

        {/* Priority Leads */}
        <div className="card stagger-item">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} style={{ color: '#A11D4A' }} />
              <p className="card-title">Priority Leads</p>
            </div>
            <span style={{ fontSize: 11, color: '#94A3B8', background: '#F5F7FA', padding: '3px 8px', borderRadius: 5, fontWeight: 600 }}>{myLeads.length} leads</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {myLeads.length > 0 ? myLeads.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{l.client_name}</p>
                  <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', marginTop: 4, display: 'inline-flex' }}>{l.status}</span>
                </div>
                <button
                  onClick={() => setCallLead(l)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#DCFCE7'; e.currentTarget.style.color = '#16A34A' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                >
                  <Phone size={14} />
                </button>
              </div>
            )) : (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No priority leads</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Call Logs */}
      <div className="table-container stagger-item">
        <div className="table-header">
          <p className="table-title">Recent Call Activity</p>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>Last 6 calls</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Call Status</th>
              <th>Interest</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.length > 0 ? recentLogs.map((l, i) => {
              const s = CALL_STATUS_STYLE[l.call_status] || { bg: '#F1F5F9', color: '#64748B' }
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{l.leads?.client_name || '—'}</td>
                  <td><span className="badge" style={{ background: s.bg, color: s.color }}>{l.call_status}</span></td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{l.interest_status || '—'}</td>
                  <td style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(l.created_at)}</td>
                </tr>
              )
            }) : (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>No calls logged yet today</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {callLead && <CallLogModal lead={callLead} onClose={() => { setCallLead(null); loadDashboard() }} />}
    </div>
  )
}
