import { useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, Calendar, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatCurrency } from '../../lib/utils'

export default function ReportsPage() {
  const containerRef = useRef(null)
  const [period, setPeriod] = useState('monthly')
  const [data, setData] = useState({ leads: [], calls: [], revenue: [], attendance: [] })
  const [loading, setLoading] = useState(true)

  useStaggerAnimation(containerRef)

  useEffect(() => { loadReportData() }, [period])

  async function loadReportData() {
    setLoading(true)
    const now = new Date()
    let since
    if (period === 'daily') since = new Date(now.setHours(0, 0, 0, 0)).toISOString()
    else if (period === 'weekly') since = new Date(now.setDate(now.getDate() - 7)).toISOString()
    else since = new Date(now.setMonth(now.getMonth() - 1)).toISOString()

    const [
      { data: leads },
      { data: calls },
      { data: payments },
      { data: attendance },
    ] = await Promise.all([
      supabase.from('leads').select('created_at, status').gte('created_at', since),
      supabase.from('call_logs').select('created_at, call_status, interest_status').gte('created_at', since),
      supabase.from('payments').select('amount_paid, payment_date, payment_status').gte('payment_date', since.slice(0, 10)),
      supabase.from('attendance').select('date, working_hours, user_id').gte('date', since.slice(0, 10)),
    ])

    // Build lead status breakdown
    const statusMap = {}
    leads?.forEach(l => { statusMap[l.status || 'Unknown'] = (statusMap[l.status || 'Unknown'] || 0) + 1 })
    const leadsData = Object.entries(statusMap).map(([name, count]) => ({ name, count }))

    // Call status breakdown
    const callMap = {}
    calls?.forEach(c => { callMap[c.call_status || 'Unknown'] = (callMap[c.call_status || 'Unknown'] || 0) + 1 })
    const callData = Object.entries(callMap).map(([name, count]) => ({ name, count }))

    // Revenue by day
    const revMap = {}
    payments?.forEach(p => {
      const d = p.payment_date || 'Unknown'
      revMap[d] = (revMap[d] || 0) + (p.amount_paid || 0)
    })
    const revData = Object.entries(revMap).sort().map(([date, revenue]) => ({ date, revenue }))

    setData({ leads: leadsData, calls: callData, revenue: revData, attendance: attendance || [] })
    setLoading(false)
  }

  async function exportReport(type) {
    let fetchFn
    const exports = {
      leads: () => supabase.from('leads').select('*'),
      clients: () => supabase.from('clients').select('*'),
      payments: () => supabase.from('payments').select(`*, clients(client_name)`),
      filings: () => supabase.from('filings').select(`*, clients(client_name)`),
      attendance: () => supabase.from('attendance').select(`*, users(name)`),
      call_logs: () => supabase.from('call_logs').select(`*, leads(client_name), users(name)`),
    }
    const { data } = await exports[type]()
    const ws = XLSX.utils.json_to_sheet(data || [])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type)
    XLSX.writeFile(wb, `GK_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const reportTypes = [
    { key: 'leads', label: 'Leads Report', icon: '📋' },
    { key: 'clients', label: 'Clients Report', icon: '👥' },
    { key: 'payments', label: 'Revenue Report', icon: '💰' },
    { key: 'filings', label: 'Filings Report', icon: '📄' },
    { key: 'attendance', label: 'Attendance Report', icon: '📅' },
    { key: 'call_logs', label: 'Call Logs Report', icon: '📞' },
  ]

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Generate and export business reports</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded text-xs font-600 capitalize transition-all ${period === p ? 'bg-[#0B1026] text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 stagger-item">
        {reportTypes.map(({ key, label, icon }) => (
          <button key={key} onClick={() => exportReport(key)} className="stat-card flex flex-col items-center gap-2 text-center hover:border-[#D4AF37] border border-transparent transition-all">
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-600 text-slate-600">{label}</span>
            <span className="text-xs text-[#A11D4A] font-500 flex items-center gap-1"><Download size={11} /> Excel</span>
          </button>
        ))}
      </div>

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="table-container p-5 stagger-item">
            <h3 className="text-sm font-700 text-[#0B1026] mb-4">Leads by Status ({period})</h3>
            {data.leads.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.leads} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-400 text-sm text-center py-10">No data for this period</p>}
          </div>

          <div className="table-container p-5 stagger-item">
            <h3 className="text-sm font-700 text-[#0B1026] mb-4">Revenue Collected ({period})</h3>
            {data.revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [formatCurrency(v), 'Revenue']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#A11D4A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-400 text-sm text-center py-10">No revenue data</p>}
          </div>

          <div className="table-container p-5 stagger-item">
            <h3 className="text-sm font-700 text-[#0B1026] mb-4">Call Status Breakdown ({period})</h3>
            {data.calls.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.calls} barSize={20} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#0B1026" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-400 text-sm text-center py-10">No call data</p>}
          </div>

          <div className="table-container p-5 stagger-item">
            <h3 className="text-sm font-700 text-[#0B1026] mb-4">Attendance Summary</h3>
            <div className="space-y-2">
              {data.attendance.length > 0 ? (
                <p className="text-2xl font-700 text-[#0B1026]">{data.attendance.length} <span className="text-sm font-400 text-slate-500">check-ins</span></p>
              ) : <p className="text-slate-400 text-sm py-10 text-center">No attendance data</p>}
              {data.attendance.length > 0 && (
                <p className="text-sm text-slate-500">
                  Avg working hours: {(data.attendance.reduce((s, a) => s + (a.working_hours || 0), 0) / data.attendance.length).toFixed(1)}h
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
