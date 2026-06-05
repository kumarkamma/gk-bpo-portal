import { useEffect, useRef, useState } from 'react'
import { Users, PhoneCall, UserCheck, TrendingUp, Clock, AlertTriangle, BarChart3, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatCurrency } from '../../lib/utils'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { LeadStatusBadge } from '../../components/ui/Badges'

export default function SupervisorDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState([])
  const [followupsDue, setFollowupsDue] = useState([])
  const [callsData, setCallsData] = useState([])

  useStaggerAnimation(containerRef)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
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
        supabase.from('leads').select('id, client_name, mobile, status, next_followup_date').eq('next_followup_date', today).limit(5),
        supabase.from('payments').select('final_amount, amount_paid, amount_due'),
        supabase.from('attendance').select('user_id').eq('date', today).is('logout_time', null),
      ])

      const connected = todayCalls?.filter(c => c.call_status === 'Connected').length || 0
      const interested = todayCalls?.filter(c => c.interest_status === 'Interested').length || 0
      const pending = payments?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0

      // Per-agent call count today
      const agentCallMap = {}
      todayCalls?.forEach(c => {
        agentCallMap[c.agent_id] = (agentCallMap[c.agent_id] || 0) + 1
      })

      const agentsWithStats = (agentList || []).map(a => ({
        ...a,
        callsToday: agentCallMap[a.id] || 0,
        online: attendance?.some(att => att.user_id === a.id),
      }))

      setStats({
        totalLeads: totalLeads || 0,
        totalClients: totalClients || 0,
        callsToday: todayCalls?.length || 0,
        connected,
        interested,
        followupsDue: followups?.length || 0,
        revenuePipeline: pending,
        agentsOnline: attendance?.length || 0,
      })

      setAgents(agentsWithStats)
      setFollowupsDue(followups || [])

      // Build call status chart
      const statusMap = {}
      todayCalls?.forEach(c => { statusMap[c.call_status || 'Unknown'] = (statusMap[c.call_status || 'Unknown'] || 0) + 1 })
      setCallsData(Object.entries(statusMap).map(([name, count]) => ({ name, count })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" text="Loading dashboard…" /></div>

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item">
        <h1 className="page-title">Supervisor Dashboard</h1>
        <p className="page-subtitle">Team overview for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Agents Online" value={stats.agentsOnline} icon={Users} color="green" />
        <StatCard title="Calls Today" value={stats.callsToday} icon={PhoneCall} color="navy" />
        <StatCard title="Connected" value={stats.connected} icon={UserCheck} color="gold" />
        <StatCard title="Interested" value={stats.interested} icon={TrendingUp} color="burgundy" />
        <StatCard title="Follow-Ups Due" value={stats.followupsDue} icon={Clock} color="orange" />
        <StatCard title="Total Leads" value={stats.totalLeads} icon={Users} color="navy" />
        <StatCard title="Total Clients" value={stats.totalClients} icon={UserCheck} color="gold" />
        <StatCard title="Revenue Pipeline" value={stats.revenuePlugin} icon={TrendingUp} color="purple" prefix="₹" animate={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Call Status Chart */}
        <div className="table-container p-5 stagger-item lg:col-span-2">
          <h3 className="text-sm font-bold text-[#0B1026] mb-4">Today's Call Status Breakdown</h3>
          {callsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={callsData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No calls logged today</div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="table-container p-5 stagger-item">
          <h3 className="text-sm font-bold text-[#0B1026] mb-4">Agent Performance Today</h3>
          <div className="space-y-3">
            {agents.length > 0 ? agents.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f8f9fc' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#0B1026] flex items-center justify-center text-[#D4AF37] text-xs font-bold">
                    {a.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0B1026]">{a.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${a.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-xs text-slate-400">{a.online ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#0B1026]">{a.callsToday}</p>
                  <p className="text-xs text-slate-400">calls</p>
                </div>
              </div>
            )) : (
              <p className="text-slate-400 text-sm text-center py-6">No agents found</p>
            )}
          </div>
        </div>
      </div>

      {/* Follow-ups Due Today */}
      <div className="table-container stagger-item">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100">
          <Calendar size={16} className="text-[#A11D4A]" />
          <h3 className="text-sm font-bold text-[#0B1026]">Follow-Ups Due Today</h3>
          {stats.followupsDue > 0 && (
            <span className="ml-auto badge bg-red-100 text-red-600">{stats.followupsDue} due</span>
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
                <td className="font-medium">{l.client_name}</td>
                <td>{l.mobile}</td>
                <td><LeadStatusBadge status={l.status} /></td>
                <td className="text-sm text-slate-500">{l.next_followup_date}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">No follow-ups due today</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
