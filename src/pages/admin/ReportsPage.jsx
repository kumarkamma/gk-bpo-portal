import { useEffect, useRef, useState } from 'react'
import { Download, RefreshCw, TrendingUp, BarChart3, FileText, Users, CreditCard, Calendar, PhoneCall, CheckCircle, CalendarRange, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatCurrency } from '../../lib/utils'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

const N  = '#0A0F1E'  // Navy
const B  = '#8B1E3F'  // Burgundy
const G  = '#C8A96B'  // Gold
const NB = '#EEF1F8'  // Navy bg
const BB = '#FDF0F3'  // Burgundy bg
const GB = '#FBF7EE'  // Gold bg

const PIE_COLORS = [N, B, '#16A34A', G, '#0F766E', '#D97706', '#065F46']

const REPORT_CONFIG = {
  super_admin: {
    title: 'Reports & Analytics',
    subtitle: 'Full portal performance overview',
    exports: [
      { key: 'leads',      label: 'Leads Report',      icon: Users,       color: N },
      { key: 'clients',    label: 'Clients Report',    icon: CheckCircle, color: '#16A34A' },
      { key: 'payments',   label: 'Revenue Report',    icon: CreditCard,  color: B },
      { key: 'filings',    label: 'Filings Report',    icon: FileText,    color: G },
      { key: 'attendance', label: 'Attendance Report', icon: Calendar,    color: '#D97706' },
      { key: 'call_logs',  label: 'Call Logs Report',  icon: PhoneCall,   color: '#0F766E' },
    ],
    charts: ['leads', 'revenue', 'calls', 'attendance', 'filings'],
  },
  supervisor: {
    title: 'Team Reports',
    subtitle: 'Agent performance & team analytics',
    exports: [
      { key: 'leads',      label: 'Leads Report',      icon: Users,     color: N },
      { key: 'call_logs',  label: 'Call Logs',         icon: PhoneCall, color: B },
      { key: 'attendance', label: 'Attendance Report', icon: Calendar,  color: '#D97706' },
    ],
    charts: ['leads', 'calls', 'attendance'],
  },
  auditor: {
    title: 'Filing Reports',
    subtitle: 'Your ITR filing performance & analytics',
    exports: [
      { key: 'filings', label: 'My Filings', icon: FileText,    color: N },
      { key: 'clients', label: 'My Clients', icon: CheckCircle, color: B },
    ],
    charts: ['filings'],
  },
  bpo_agent: {
    title: 'My Performance Reports',
    subtitle: 'Your call & lead performance',
    exports: [
      { key: 'call_logs', label: 'My Call Logs', icon: PhoneCall, color: N },
      { key: 'leads',     label: 'My Leads',     icon: Users,     color: B },
    ],
    charts: ['calls', 'leads'],
  },
  accounts: {
    title: 'Financial Reports',
    subtitle: 'Revenue, collections & payment analytics',
    exports: [
      { key: 'payments', label: 'Revenue Report', icon: CreditCard,  color: N },
      { key: 'clients',  label: 'Clients Report', icon: CheckCircle, color: B },
    ],
    charts: ['revenue', 'paymentStatus'],
  },
}

const Tip = ({ active, payload, label, prefix }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: N, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
          {prefix === '₹' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function Tile({ label, value, icon: Icon, color, bg }) {
  return (
    <div style={{ flex: 1, minWidth: 140, padding: '16px 18px', borderRadius: 12, background: bg, border: `1px solid ${color}22` }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={15} style={{ color }} />
      </div>
      <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif", lineHeight: 1 }}>{value ?? '—'}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginTop: 5 }}>{label}</p>
    </div>
  )
}

function ChartCard({ title, accent, badge, badgeBg, children }) {
  return (
    <div className="card stagger-item">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 16, borderRadius: 2, background: accent }} />
          <p className="card-title">{title}</p>
        </div>
        {badge && <span style={{ fontSize: 11, background: badgeBg, color: accent, padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>{badge}</span>}
      </div>
      <div className="card-body" style={{ paddingTop: 12 }}>{children}</div>
    </div>
  )
}

export default function ReportsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [period, setPeriod] = useState('monthly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]   = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [chartData, setChartData] = useState({})
  const [summary, setSummary] = useState({})

  useStaggerAnimation(containerRef)
  useEffect(() => { loadData() }, [period])

  // when custom range is fully set, trigger load
  useEffect(() => {
    if (period === 'custom' && customFrom && customTo) loadData()
  }, [customFrom, customTo])

  const role = profile?.role || 'bpo_agent'
  const config = REPORT_CONFIG[role] || REPORT_CONFIG.super_admin

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const now = new Date()
    let since, sinceDate

    if (period === 'custom' && customFrom && customTo) {
      since     = new Date(customFrom).toISOString()
      sinceDate = customFrom
    } else if (period === 'weekly') {
      since     = new Date(now - 7 * 86400000).toISOString()
      sinceDate = since.slice(0, 10)
    } else if (period === 'daily') {
      since     = new Date(now.setHours(0, 0, 0, 0)).toISOString()
      sinceDate = since.slice(0, 10)
    } else {
      since     = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
      sinceDate = since.slice(0, 10)
    }

    try {
      const f = {}

      if (['super_admin', 'supervisor', 'bpo_agent'].includes(role)) {
        let lq = supabase.from('leads').select('created_at, status').gte('created_at', since)
        let cq = supabase.from('call_logs').select('created_at, call_status, interest_status').gte('created_at', since)
        if (role === 'bpo_agent') { lq = lq.eq('assigned_bpo', profile.id); cq = cq.eq('agent_id', profile.id) }
        const [{ data: leads }, { data: calls }] = await Promise.all([lq, cq])

        const sm = {}; leads?.forEach(l => { sm[l.status || 'Unknown'] = (sm[l.status || 'Unknown'] || 0) + 1 })
        f.leads = Object.entries(sm).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8)

        const cm = {}; calls?.forEach(c => { cm[c.call_status || 'Unknown'] = (cm[c.call_status || 'Unknown'] || 0) + 1 })
        f.calls = Object.entries(cm).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

        f.summaryLeads = leads?.length || 0
        f.summaryCalls = calls?.length || 0
        f.summaryConnected  = calls?.filter(c => c.call_status === 'Connected').length || 0
        f.summaryInterested = calls?.filter(c => c.interest_status === 'Interested').length || 0
      }

      if (['super_admin', 'accounts'].includes(role)) {
        const { data: pay } = await supabase.from('payments').select('amount_paid, payment_date, payment_status, amount_due').gte('payment_date', sinceDate)
        const rm = {}; pay?.forEach(p => { if (p.payment_date) rm[p.payment_date] = (rm[p.payment_date] || 0) + (p.amount_paid || 0) })
        f.revenue = Object.entries(rm).sort().slice(-14).map(([date, revenue]) => ({ date: date.slice(5), revenue }))
        const pm = {}; pay?.forEach(p => { pm[p.payment_status || 'Not Paid'] = (pm[p.payment_status || 'Not Paid'] || 0) + 1 })
        f.paymentStatus  = Object.entries(pm).map(([name, value]) => ({ name, value }))
        f.summaryRevenue = pay?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
        f.summaryDue     = pay?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0
      }

      if (['super_admin', 'auditor'].includes(role)) {
        let fq = supabase.from('filings').select('filing_status, created_at').gte('created_at', since)
        if (role === 'auditor') fq = fq.eq('filing_completed_by', profile.id)
        const { data: fil } = await fq
        const fm = {}; fil?.forEach(f2 => { fm[f2.filing_status || 'Unknown'] = (fm[f2.filing_status || 'Unknown'] || 0) + 1 })
        f.filings       = Object.entries(fm).map(([name, count]) => ({ name, count }))
        f.summaryFilings = fil?.length || 0
        f.summaryFiled   = fil?.filter(x => ['Filed', 'Completed'].includes(x.filing_status)).length || 0
      }

      if (['super_admin', 'supervisor'].includes(role)) {
        const { data: att } = await supabase.from('attendance').select('date, working_hours').gte('date', sinceDate)
        const am = {}; att?.forEach(a => { am[a.date] = (am[a.date] || 0) + 1 })
        f.attendance          = Object.entries(am).sort().slice(-14).map(([date, count]) => ({ date: date.slice(5), count }))
        f.summaryAttCheckins  = att?.length || 0
        f.summaryAttAvgHours  = att?.length ? (att.reduce((s, a) => s + (a.working_hours || 0), 0) / att.length).toFixed(1) : 0
      }

      setChartData(f)
      setSummary(f)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function exportReport(type) {
    const map = {
      leads:      () => role === 'bpo_agent' ? supabase.from('leads').select('*').eq('assigned_bpo', profile.id) : supabase.from('leads').select('*'),
      clients:    () => role === 'auditor'   ? supabase.from('clients').select('*').eq('assigned_auditor', profile.id) : supabase.from('clients').select('*'),
      payments:   () => supabase.from('payments').select('*, clients(client_name)'),
      filings:    () => role === 'auditor'   ? supabase.from('filings').select('*, clients(client_name)').eq('filing_completed_by', profile.id) : supabase.from('filings').select('*, clients(client_name)'),
      attendance: () => supabase.from('attendance').select('*, users(name)'),
      call_logs:  () => role === 'bpo_agent' ? supabase.from('call_logs').select('*, leads(client_name)').eq('agent_id', profile.id) : supabase.from('call_logs').select('*, leads(client_name), users(name)'),
    }
    const { data } = await map[type]()
    if (!data?.length) return
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type)
    XLSX.writeFile(wb, `GK_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const periodLabel = period === 'custom' && customFrom && customTo
    ? `${customFrom} → ${customTo}`
    : period

  const tiles = []
  if (['super_admin', 'supervisor', 'bpo_agent'].includes(role)) {
    tiles.push(
      { label: 'Total Leads', value: summary.summaryLeads,     icon: Users,       color: N,        bg: NB },
      { label: 'Calls Made',  value: summary.summaryCalls,     icon: PhoneCall,   color: G,        bg: GB },
      { label: 'Connected',   value: summary.summaryConnected, icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
      { label: 'Interested',  value: summary.summaryInterested,icon: TrendingUp,  color: B,        bg: BB },
    )
  }
  if (['super_admin', 'accounts'].includes(role)) {
    tiles.push(
      { label: 'Revenue Collected', value: formatCurrency(summary.summaryRevenue), icon: CreditCard, color: '#16A34A', bg: '#DCFCE7' },
      { label: 'Outstanding Dues',  value: formatCurrency(summary.summaryDue),     icon: TrendingUp, color: '#DC2626', bg: '#FEE2E2' },
    )
  }
  if (['super_admin', 'auditor'].includes(role)) {
    tiles.push(
      { label: 'Total Filings',    value: summary.summaryFilings, icon: FileText,    color: N,        bg: NB },
      { label: 'Filed/Completed',  value: summary.summaryFiled,   icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
    )
  }
  if (['super_admin', 'supervisor'].includes(role)) {
    tiles.push(
      { label: 'Attendance Check-ins', value: summary.summaryAttCheckins, icon: Calendar,  color: '#D97706', bg: '#FEF3C7' },
      { label: 'Avg Working Hours',    value: summary.summaryAttAvgHours ? `${summary.summaryAttAvgHours}h` : '—', icon: BarChart3, color: G, bg: GB },
    )
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="stagger-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${N},#111b30)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} style={{ color: G }} />
          </div>
          <div>
            <p className="page-title">{config.title}</p>
            <p className="page-subtitle">{config.subtitle}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period quick-select */}
          <div style={{ display: 'flex', background: '#fff', border: '1px solid #E8EAF0', borderRadius: 8, overflow: 'hidden' }}>
            {['daily', 'weekly', 'monthly'].map(p => (
              <button key={p} onClick={() => { setPeriod(p); setShowCustom(false) }} style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                background: period === p ? N : 'transparent',
                color: period === p ? '#fff' : '#64748B',
                transition: 'all 0.15s',
              }}>{p}</button>
            ))}
            <button onClick={() => { setPeriod('custom'); setShowCustom(s => !s) }} style={{
              padding: '7px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: period === 'custom' ? B : 'transparent',
              color: period === 'custom' ? '#fff' : '#64748B',
              display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
            }}>
              <CalendarRange size={13} /> Custom
            </button>
          </div>

          {/* Custom date range picker */}
          {showCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#fff', border: `1.5px solid ${B}30`, borderRadius: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>From</span>
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={e => setCustomFrom(e.target.value)}
                style={{ fontSize: 12, border: '1px solid #E8EAF0', borderRadius: 6, padding: '4px 8px', color: N, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>To</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={e => setCustomTo(e.target.value)}
                style={{ fontSize: 12, border: '1px solid #E8EAF0', borderRadius: 6, padding: '4px 8px', color: N, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              />
              {(customFrom && customTo) && (
                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, background: '#DCFCE7', padding: '2px 8px', borderRadius: 5 }}>
                  {customFrom} → {customTo}
                </span>
              )}
              <button onClick={() => { setCustomFrom(''); setCustomTo(''); setPeriod('monthly'); setShowCustom(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2, display: 'flex', alignItems: 'center' }}>
                <X size={13} />
              </button>
            </div>
          )}

          <button onClick={() => loadData(true)} className="btn btn-outline btn-sm" disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Tiles */}
      {tiles.length > 0 && (
        <div className="stagger-item" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {tiles.map((t, i) => <Tile key={i} {...t} />)}
        </div>
      )}

      {/* Export Cards */}
      <div className="stagger-item" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>DOWNLOAD REPORTS</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {config.exports.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => exportReport(key)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
              border: `1.5px solid ${color}22`, background: '#fff', cursor: 'pointer', transition: 'all 0.15s', minWidth: 160,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = color + '08'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = color + '22'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: N }}>{label}</p>
                <p style={{ fontSize: 10, color: B, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                  <Download size={9} /> Excel
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      {loading ? <TableSkeleton rows={6} cols={4} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(440px,1fr))', gap: 16 }}>

          {config.charts.includes('leads') && chartData.leads?.length > 0 && (
            <ChartCard title="Leads by Status" accent={N} badge={periodLabel} badgeBg={NB}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData.leads} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="count" fill={N} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {config.charts.includes('revenue') && chartData.revenue?.length > 0 && (
            <ChartCard title="Revenue Collected" accent={B} badge={periodLabel} badgeBg={BB}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData.revenue}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={B} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={B} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<Tip prefix="₹" />} />
                  <Area type="monotone" dataKey="revenue" stroke={B} strokeWidth={2.5} fill="url(#rg)" dot={{ fill: B, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {config.charts.includes('calls') && chartData.calls?.length > 0 && (
            <ChartCard title="Call Status Breakdown" accent={N} badge={`${chartData.summaryCalls ?? 0} calls`} badgeBg={NB}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData.calls} barSize={16} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="count" fill={N} radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {config.charts.includes('attendance') && chartData.attendance?.length > 0 && (
            <ChartCard title="Daily Attendance" accent="#D97706" badge={`${chartData.summaryAttCheckins ?? 0} check-ins`} badgeBg="#FEF3C7">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData.attendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Line type="monotone" dataKey="count" stroke="#D97706" strokeWidth={2.5} dot={{ fill: '#D97706', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {config.charts.includes('filings') && chartData.filings?.length > 0 && (
            <ChartCard title="Filings by Status" accent={G} badge={`${chartData.summaryFilings} total`} badgeBg={GB}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={chartData.filings} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="count">
                      {chartData.filings.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chartData.filings.map(({ name, count }, i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#4A5568', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: N }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          )}

          {config.charts.includes('paymentStatus') && chartData.paymentStatus?.length > 0 && (
            <ChartCard title="Payment Status Distribution" accent="#16A34A">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={chartData.paymentStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {chartData.paymentStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {chartData.paymentStatus.map(({ name, value }, i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#4A5568' }}>{name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: N }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          )}

        </div>
      )}

      {!loading && Object.keys(chartData).filter(k => Array.isArray(chartData[k]) && chartData[k].length > 0).length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: NB, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BarChart3 size={26} style={{ color: N }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: N }}>No data for this period</p>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Try switching to a wider time range</p>
        </div>
      )}
    </div>
  )
}
