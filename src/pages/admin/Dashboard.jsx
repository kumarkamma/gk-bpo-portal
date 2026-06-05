import { useEffect, useRef, useState } from 'react'
import { Users, UserCheck, CreditCard, TrendingUp, FileText, PhoneCall, Clock, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatCurrency } from '../../lib/utils'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { ROLES } from '../../lib/constants'

const PIE_COLORS = ['#D4AF37', '#A11D4A', '#0B1026', '#25D366', '#F59E0B', '#6366f1', '#ef4444', '#14b8a6']

export default function AdminDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [leadsByStatus, setLeadsByStatus] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [recentLeads, setRecentLeads] = useState([])

  useStaggerAnimation(containerRef)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [
        { count: totalLeads },
        { count: totalClients },
        { data: payments },
        { count: pendingFilings },
        { data: leadStatuses },
        { data: recent },
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('final_amount, amount_paid, amount_due, payment_status'),
        supabase.from('filings').select('*', { count: 'exact', head: true }).neq('filing_status', 'Completed'),
        supabase.from('leads').select('status').limit(1000),
        supabase.from('leads').select('client_name, mobile, status, created_at').order('created_at', { ascending: false }).limit(5),
      ])

      const totalRevenue = payments?.reduce((s, p) => s + (p.final_amount || 0), 0) || 0
      const collectedRevenue = payments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
      const pendingRevenue = payments?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0
      const converted = payments?.filter(p => p.payment_status === 'Fully Paid').length || 0

      setStats({
        totalLeads: totalLeads || 0,
        totalClients: totalClients || 0,
        totalRevenue,
        collectedRevenue,
        pendingRevenue,
        pendingFilings: pendingFilings || 0,
        conversionRate: totalLeads ? ((totalClients / totalLeads) * 100).toFixed(1) : 0,
      })

      // Lead status breakdown
      const statusMap = {}
      leadStatuses?.forEach(({ status }) => { statusMap[status] = (statusMap[status] || 0) + 1 })
      setLeadsByStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8))

      // Mock monthly revenue trend
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      setRevenueData(months.map((month, i) => ({ month, revenue: Math.round((collectedRevenue / 6) * (0.7 + i * 0.1)) })))
      setRecentLeads(recent || [])
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
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {profile?.name} — here's today's overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Leads" value={stats.totalLeads} icon={Users} color="navy" />
        <StatCard title="Total Clients" value={stats.totalClients} icon={UserCheck} color="gold" />
        <StatCard title="Revenue Collected" value={stats.collectedRevenue} icon={CreditCard} color="green" prefix="₹" animate={false} />
        <StatCard title="Pending Revenue" value={stats.pendingRevenue} icon={AlertTriangle} color="burgundy" prefix="₹" animate={false} />
        <StatCard title="Pending Filings" value={stats.pendingFilings} icon={FileText} color="orange" />
        <StatCard title="Conversion Rate" value={stats.conversionRate} icon={TrendingUp} color="purple" suffix="%" animate={false} />
        <StatCard title="Total Revenue" value={stats.totalRevenue} icon={TrendingUp} color="gold" prefix="₹" animate={false} />
        <StatCard title="Total Clients" value={stats.totalClients} icon={Users} color="navy" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Revenue Trend */}
        <div className="table-container p-5 stagger-item lg:col-span-2">
          <h3 className="text-sm font-700 text-[#0B1026] mb-4">Revenue Trend (2024)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#D4AF37" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Status */}
        <div className="table-container p-5 stagger-item">
          <h3 className="text-sm font-700 text-[#0B1026] mb-4">Leads by Status</h3>
          {leadsByStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={leadsByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {leadsByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {leadsByStatus.slice(0, 4).map(({ name, value }, i) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-xs text-slate-600 truncate max-w-[120px]">{name}</span>
                    </div>
                    <span className="text-xs font-600 text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-slate-400 text-sm text-center py-8">No data</p>}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="table-container stagger-item">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-700 text-[#0B1026]">Recent Leads</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Mobile</th>
              <th>Status</th>
              <th>Date Added</th>
            </tr>
          </thead>
          <tbody>
            {recentLeads.length > 0 ? recentLeads.map((lead, i) => (
              <tr key={i}>
                <td className="font-500">{lead.client_name || '—'}</td>
                <td>{lead.mobile || '—'}</td>
                <td>
                  <span className="badge bg-blue-100 text-blue-700">{lead.status || 'New Lead'}</span>
                </td>
                <td className="text-slate-500">{new Date(lead.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">No leads yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
