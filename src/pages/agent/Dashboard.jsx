import { useEffect, useRef, useState } from 'react'
import { PhoneCall, Users, Clock, TrendingUp, Phone, Calendar, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDate } from '../../lib/utils'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { LeadStatusBadge, TempBadge } from '../../components/ui/Badges'
import CallLogModal from '../admin/CallLogModal'

export default function AgentDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myLeads, setMyLeads] = useState([])
  const [followups, setFollowups] = useState([])
  const [callLead, setCallLead] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])

  useStaggerAnimation(containerRef)
  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
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
        supabase.from('call_logs').select('call_status, interest_status, created_at, leads(client_name)').eq('agent_id', profile.id).order('created_at', { ascending: false }).limit(5),
      ])

      const connected = todayCalls?.filter(c => c.call_status === 'Connected').length || 0
      const interested = todayCalls?.filter(c => c.interest_status === 'Interested').length || 0

      setStats({
        totalLeads: totalLeads || 0,
        callsToday: todayCalls?.length || 0,
        connected,
        interested,
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
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" text="Loading your dashboard…" /></div>

  const callStatusColors = { Connected: 'bg-green-100 text-green-700', 'Not Connected': 'bg-red-100 text-red-600', Busy: 'bg-orange-100 text-orange-700' }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item">
        <h1 className="page-title">My Dashboard</h1>
        <p className="page-subtitle">Welcome back, {profile?.name} — let's hit today's targets!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="My Leads" value={stats.totalLeads} icon={Users} color="navy" />
        <StatCard title="Calls Today" value={stats.callsToday} icon={PhoneCall} color="gold" />
        <StatCard title="Connected" value={stats.connected} icon={CheckCircle} color="green" />
        <StatCard title="Interested" value={stats.interested} icon={TrendingUp} color="burgundy" />
        <StatCard title="Follow-Ups Today" value={stats.followupsDue} icon={Clock} color="orange" />
        <StatCard title="Conversion Rate" value={stats.conversionRate} icon={TrendingUp} color="purple" suffix="%" animate={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Follow-Ups Due Today */}
        <div className="table-container stagger-item">
          <div className="flex items-center gap-2 p-4 border-b border-slate-100">
            <Calendar size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-[#0B1026]">Follow-Ups Due Today</h3>
            {stats.followupsDue > 0 && <span className="ml-auto badge bg-amber-100 text-amber-700">{stats.followupsDue}</span>}
          </div>
          <div className="divide-y divide-slate-50">
            {followups.length > 0 ? followups.map(l => (
              <div key={l.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-sm text-[#0B1026]">{l.client_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{l.mobile}</p>
                </div>
                <button
                  onClick={() => setCallLead(l)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: '#dcfce7', color: '#15803d' }}
                >
                  <Phone size={12} /> Call Now
                </button>
              </div>
            )) : (
              <div className="py-10 text-center text-slate-400 text-sm">No follow-ups due today 🎉</div>
            )}
          </div>
        </div>

        {/* Hot / Warm Leads */}
        <div className="table-container stagger-item">
          <div className="flex items-center gap-2 p-4 border-b border-slate-100">
            <AlertCircle size={16} className="text-[#A11D4A]" />
            <h3 className="text-sm font-bold text-[#0B1026]">Priority Leads</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {myLeads.length > 0 ? myLeads.map(l => (
              <div key={l.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-sm text-[#0B1026]">{l.client_name}</p>
                  <LeadStatusBadge status={l.status} />
                </div>
                <button
                  onClick={() => setCallLead(l)}
                  className="p-2 rounded-lg transition-all hover:bg-green-50"
                  style={{ color: '#94a3b8' }}
                >
                  <Phone size={15} />
                </button>
              </div>
            )) : (
              <div className="py-10 text-center text-slate-400 text-sm">No priority leads</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Call Logs */}
      <div className="table-container stagger-item">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#0B1026]">Recent Call Activity</h3>
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
            {recentLogs.length > 0 ? recentLogs.map((l, i) => (
              <tr key={i}>
                <td className="font-medium">{l.leads?.client_name || '—'}</td>
                <td><span className={`badge ${callStatusColors[l.call_status] || 'bg-gray-100 text-gray-600'}`}>{l.call_status}</span></td>
                <td className="text-xs text-slate-500">{l.interest_status || '—'}</td>
                <td className="text-xs text-slate-400">{formatDate(l.created_at)}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">No calls logged yet today</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {callLead && <CallLogModal lead={callLead} onClose={() => { setCallLead(null); loadDashboard() }} />}
    </div>
  )
}
