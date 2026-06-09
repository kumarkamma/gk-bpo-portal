import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Clock, LogIn, LogOut, Calendar, Users, TrendingUp, CheckCircle,
  AlertCircle, RefreshCw, Download, BarChart2, Timer
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDateTime } from '../../lib/utils'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

const PIE_COLORS = ['#16A34A', '#D97706', '#DC2626', '#94A3B8']

const ROLE_LABELS = {
  super_admin: 'Super Admin', supervisor: 'Supervisor',
  bpo_agent: 'BPO Agent', auditor: 'Auditor', accounts: 'Accounts',
}

export default function AttendancePage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayRecord, setTodayRecord] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [clockLoading, setClockLoading] = useState(false)
  const [tab, setTab] = useState('today') // today | history | analytics
  const [liveTime, setLiveTime] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const isAdmin = ['super_admin', 'supervisor'].includes(profile?.role)
  useStaggerAnimation(containerRef)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { loadAll() }, [selectedUser])
  useEffect(() => { if (profile?.id) checkToday() }, [profile?.id])

  const loadAll = useCallback(async () => {
    await Promise.all([loadUsers(), loadRecords()])
  }, [selectedUser])

  async function loadUsers() {
    if (!isAdmin) return
    const { data } = await supabase.from('users').select('id,name,role').eq('status', 'active').order('name')
    setUsers(data || [])
  }

  async function checkToday() {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('attendance').select('*')
      .eq('user_id', profile.id).eq('date', today).maybeSingle()
    setTodayRecord(data)
  }

  async function loadRecords(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    let q = supabase.from('attendance').select('*, users(name,role)')
    if (selectedUser) q = q.eq('user_id', selectedUser)
    else if (!isAdmin) q = q.eq('user_id', profile?.id)
    const { data } = await q.order('date', { ascending: false }).order('login_time', { ascending: false }).limit(200)
    setRecords(data || [])
    setLoading(false)
    setRefreshing(false)
  }

  async function clockIn() {
    setClockLoading(true)
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const { data: existing } = await supabase.from('attendance').select('id')
      .eq('user_id', profile.id).eq('date', today).maybeSingle()
    if (!existing) {
      await supabase.from('attendance').insert({
        user_id: profile.id, date: today, login_time: now.toISOString(),
      })
    }
    await checkToday()
    await loadRecords()
    setClockLoading(false)
  }

  async function clockOut() {
    setClockLoading(true)
    const now = new Date()
    const loginTime = new Date(todayRecord.login_time)
    const hours = parseFloat(((now - loginTime) / 3_600_000).toFixed(2))
    await supabase.from('attendance').update({
      logout_time: now.toISOString(), working_hours: hours,
    }).eq('id', todayRecord.id)
    await checkToday()
    await loadRecords()
    setClockLoading(false)
  }

  async function exportExcel() {
    let q = supabase.from('attendance').select('*, users(name,role)')
    if (!isAdmin) q = q.eq('user_id', profile?.id)
    const { data } = await q.order('date', { ascending: false })
    if (!data?.length) return
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
      Employee: r.users?.name, Role: r.users?.role,
      Date: r.date,
      'Clock In': r.login_time ? new Date(r.login_time).toLocaleTimeString('en-IN') : '',
      'Clock Out': r.logout_time ? new Date(r.logout_time).toLocaleTimeString('en-IN') : '',
      'Working Hours': r.working_hours || '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `GK_Attendance_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Analytics
  const todayRecords   = records.filter(r => r.date === new Date().toISOString().slice(0, 10))
  const activeNow      = todayRecords.filter(r => r.login_time && !r.logout_time).length
  const checkedInToday = todayRecords.length
  const avgHours       = records.filter(r => r.working_hours).length
    ? (records.filter(r => r.working_hours).reduce((s, r) => s + (r.working_hours || 0), 0) / records.filter(r => r.working_hours).length).toFixed(1)
    : 0

  // Hours distribution for pie
  const hoursBuckets = [
    { name: '8h+', value: records.filter(r => r.working_hours >= 8).length },
    { name: '6-8h', value: records.filter(r => r.working_hours >= 6 && r.working_hours < 8).length },
    { name: '<6h', value: records.filter(r => r.working_hours > 0 && r.working_hours < 6).length },
    { name: 'Incomplete', value: records.filter(r => r.login_time && !r.logout_time).length },
  ].filter(b => b.value > 0)

  // Last 7 days bar
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().slice(0, 10)
    const dayRecs = records.filter(r => r.date === ds)
    return {
      date: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      checkins: dayRecs.length,
      hours: dayRecs.filter(r => r.working_hours).length
        ? parseFloat((dayRecs.reduce((s, r) => s + (r.working_hours || 0), 0) / dayRecs.filter(r => r.working_hours).length).toFixed(1))
        : 0,
    }
  })

  const hoursColor = (h) => h >= 8 ? '#16A34A' : h >= 6 ? '#D97706' : '#DC2626'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  // Current session duration
  const sessionDuration = todayRecord?.login_time && !todayRecord?.logout_time
    ? (() => {
        const diff = liveTime - new Date(todayRecord.login_time)
        const h = Math.floor(diff / 3_600_000)
        const m = Math.floor((diff % 3_600_000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      })()
    : null

  const TAB_STYLE = (active) => ({
    padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: `1.5px solid ${active ? '#D4AF37' : '#E2E8F0'}`,
    background: active ? 'rgba(212,175,55,0.08)' : '#fff',
    color: active ? '#B8942E' : '#64748B',
    cursor: 'pointer', transition: 'all 0.15s',
  })

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-title">Attendance</p>
          <p className="page-subtitle">{today}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => loadRecords(true)} disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* Top row: Clock card + KPI cards */}
      <div className="stagger-item" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 20 }}>

        {/* Clock In/Out card */}
        <div style={{ borderRadius: 16, background: 'linear-gradient(135deg,#0A1628,#162340)', padding: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,175,55,0.1) 0%,transparent 70%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Today's Attendance</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{profile?.name}</p>
            </div>
          </div>

          {/* Live clock */}
          <p style={{ color: '#D4AF37', fontSize: 28, fontWeight: 800, fontFamily: "'Poppins',sans-serif", letterSpacing: '0.04em', marginBottom: 4 }}>
            {liveTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 16 }}>
            {liveTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </p>

          {todayRecord ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Clocked In</span>
                <span style={{ color: '#D4AF37', fontSize: 12, fontWeight: 700 }}>
                  {new Date(todayRecord.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {sessionDuration && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Session Time</span>
                  <span style={{ color: '#25D366', fontSize: 13, fontWeight: 800, fontFamily: "'Poppins',sans-serif" }}>{sessionDuration}</span>
                </div>
              )}
              {todayRecord.logout_time ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Clocked Out</span>
                    <span style={{ color: '#D4AF37', fontSize: 12, fontWeight: 700 }}>
                      {new Date(todayRecord.logout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Total Hours</span>
                    <span style={{ color: '#25D366', fontSize: 14, fontWeight: 800 }}>{todayRecord.working_hours}h</span>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)' }}>
                    <p style={{ color: '#25D366', fontSize: 12, fontWeight: 700 }}>✓ Attendance Complete</p>
                  </div>
                </>
              ) : (
                <button onClick={clockOut} disabled={clockLoading} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: clockLoading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#8B1E3F,#6f1832)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}>
                  <LogOut size={15} /> {clockLoading ? 'Processing…' : 'Clock Out'}
                </button>
              )}
            </div>
          ) : (
            <button onClick={clockIn} disabled={clockLoading} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: clockLoading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#C8A96B,#a8893b)', color: '#0A1628', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}>
              <LogIn size={15} /> {clockLoading ? 'Processing…' : 'Clock In'}
            </button>
          )}
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {[
            { label: 'Active Now',         value: activeNow,      icon: Timer,       color: '#25D366', bg: 'rgba(37,211,102,0.08)',   border: 'rgba(37,211,102,0.2)' },
            { label: 'Checked In Today',   value: checkedInToday, icon: CheckCircle, color: '#D4AF37', bg: 'rgba(212,175,55,0.08)',   border: 'rgba(212,175,55,0.2)' },
            { label: 'Total Records',      value: records.length, icon: Calendar,    color: '#2563EB', bg: '#EFF6FF',                 border: '#BFDBFE' },
            { label: 'Avg Working Hours',  value: `${avgHours}h`, icon: TrendingUp,  color: '#7C3AED', bg: '#F5F3FF',                 border: '#DDD6FE' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className="stat-card" style={{ background: bg, border: `1px solid ${border}`, padding: '18px 20px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={17} style={{ color }} />
              </div>
              <p style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif", lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'today',     label: 'Today',     icon: Clock },
          { key: 'history',   label: 'History',   icon: Calendar },
          { key: 'analytics', label: 'Analytics', icon: BarChart2 },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={TAB_STYLE(tab === key)}>
            <Icon size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            {label}
          </button>
        ))}
        {isAdmin && (
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="form-input" style={{ minWidth: 180, marginLeft: 'auto' }}>
            <option value="">All Employees</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role]})</option>)}
          </select>
        )}
      </div>

      {/* TODAY tab */}
      {tab === 'today' && (
        <div className="stagger-item">
          {loading ? <TableSkeleton rows={5} cols={5} /> : (
            <div className="table-container">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Today's Attendance — {new Date().toLocaleDateString('en-IN')}</p>
                <span style={{ fontSize: 11, background: '#DCFCE7', color: '#16A34A', padding: '3px 10px', borderRadius: 5, fontWeight: 700 }}>{checkedInToday} present</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayRecords.length > 0 ? todayRecords.map((r, i) => {
                    const hrs = r.working_hours
                    const isActive = r.login_time && !r.logout_time
                    return (
                      <tr key={r.id}>
                        <td style={{ color: '#CBD5E1', fontSize: 11 }}>{i + 1}</td>
                        <td>
                          <p style={{ fontWeight: 700, fontSize: 13 }}>{r.users?.name || profile?.name}</p>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>{ROLE_LABELS[r.users?.role || profile?.role]}</p>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600, color: '#D4AF37' }}>
                          {r.login_time ? new Date(r.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ fontSize: 13, color: '#64748B' }}>
                          {r.logout_time ? new Date(r.logout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ fontWeight: 700, color: hrs ? hoursColor(hrs) : '#64748B' }}>
                          {hrs ? `${hrs}h` : isActive ? sessionDuration || '—' : '—'}
                        </td>
                        <td>
                          {isActive
                            ? <span style={{ padding: '3px 10px', borderRadius: 5, background: '#DCFCE7', color: '#16A34A', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />Active</span>
                            : hrs ? <span style={{ padding: '3px 10px', borderRadius: 5, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700 }}>Completed</span>
                            : <span style={{ padding: '3px 10px', borderRadius: 5, background: '#F1F5F9', color: '#64748B', fontSize: 11, fontWeight: 700 }}>Absent</span>
                          }
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>No check-ins today yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HISTORY tab */}
      {tab === 'history' && (
        <div className="stagger-item">
          {loading ? <TableSkeleton rows={8} cols={5} /> : (
            <div className="table-container">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Attendance History — Last 200 Records</p>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Working Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length > 0 ? records.map((r, i) => {
                    const hrs = r.working_hours
                    return (
                      <tr key={r.id}>
                        <td style={{ color: '#CBD5E1', fontSize: 11 }}>{i + 1}</td>
                        <td>
                          <p style={{ fontWeight: 600, fontSize: 13 }}>{r.users?.name || profile?.name}</p>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>{ROLE_LABELS[r.users?.role || profile?.role]}</p>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{r.date}</td>
                        <td style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600 }}>
                          {r.login_time ? new Date(r.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ fontSize: 12, color: '#64748B' }}>
                          {r.logout_time ? new Date(r.logout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span style={{ color: '#D97706', fontWeight: 600, fontSize: 11 }}>Still Active</span>}
                        </td>
                        <td>
                          {hrs ? (
                            <span style={{ fontSize: 13, fontWeight: 700, color: hoursColor(hrs) }}>{hrs}h</span>
                          ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS tab */}
      {tab === 'analytics' && (
        <div className="stagger-item" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Last 7 days bar */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Last 7 Days — Check-ins</p>
              <span style={{ fontSize: 11, background: '#EEF1F8', color: '#0A1628', padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>Daily</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={last7} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }} />
                  <Bar dataKey="checkins" fill="#0A1628" radius={[5, 5, 0, 0]} name="Check-ins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hours distribution pie */}
          <div className="card">
            <div className="card-header">
              <p className="card-title">Working Hours Distribution</p>
            </div>
            <div className="card-body">
              {hoursBuckets.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={hoursBuckets} cx="50%" cy="50%" innerRadius={38} outerRadius={65} paddingAngle={3} dataKey="value">
                        {hoursBuckets.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {hoursBuckets.map(({ name, value }, i) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#475569' }}>{name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No data yet</p>}
            </div>
          </div>

          {/* Last 7 days avg hours */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <p className="card-title">Average Working Hours — Last 7 Days</p>
              <span style={{ fontSize: 11, background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>Target: 8h</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={last7} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 10]} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }} formatter={v => [`${v}h`, 'Avg Hours']} />
                  <Bar dataKey="hours" radius={[5, 5, 0, 0]} name="Avg Hours"
                    fill="#C8A96B"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
