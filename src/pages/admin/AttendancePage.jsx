import { useEffect, useRef, useState } from 'react'
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDateTime } from '../../lib/utils'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

export default function AttendancePage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayRecord, setTodayRecord] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [clockLoading, setClockLoading] = useState(false)

  useStaggerAnimation(containerRef)

  useEffect(() => { loadRecords(); loadUsers() }, [selectedUser])
  useEffect(() => { checkToday() }, [])

  async function loadUsers() {
    const { data } = await supabase.from('users').select('id, name, role')
    setUsers(data || [])
  }

  async function checkToday() {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('attendance').select('*').eq('user_id', profile.id).eq('date', today).maybeSingle()
    setTodayRecord(data)
  }

  async function loadRecords() {
    setLoading(true)
    let query = supabase.from('attendance').select(`*, users(name, role)`)
    if (selectedUser) query = query.eq('user_id', selectedUser)
    else if (['bpo_agent', 'auditor'].includes(profile?.role)) query = query.eq('user_id', profile.id)
    const { data } = await query.order('date', { ascending: false }).limit(100)
    setRecords(data || [])
    setLoading(false)
  }

  async function clockIn() {
    setClockLoading(true)
    const now = new Date()
    await supabase.from('attendance').insert({
      user_id: profile.id,
      date: now.toISOString().slice(0, 10),
      login_time: now.toISOString(),
    })
    await checkToday()
    await loadRecords()
    setClockLoading(false)
  }

  async function clockOut() {
    setClockLoading(true)
    const now = new Date()
    const loginTime = new Date(todayRecord.login_time)
    const hours = ((now - loginTime) / 1000 / 3600).toFixed(2)
    await supabase.from('attendance').update({
      logout_time: now.toISOString(),
      working_hours: parseFloat(hours),
    }).eq('id', todayRecord.id)
    await checkToday()
    await loadRecords()
    setClockLoading(false)
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item">
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">{today}</p>
      </div>

      {/* Clock In/Out Card */}
      <div className="stagger-item mb-6">
        <div className="bg-[#0B1026] rounded-2xl p-6 text-white max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-[#D4AF37]/20 rounded-xl"><Clock size={20} className="text-[#D4AF37]" /></div>
            <div>
              <p className="font-600">Today's Attendance</p>
              <p className="text-white/50 text-xs">{profile?.name}</p>
            </div>
          </div>
          {todayRecord ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Clock In</span>
                <span className="text-[#D4AF37] font-600">{formatDateTime(todayRecord.login_time)}</span>
              </div>
              {todayRecord.logout_time ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Clock Out</span>
                    <span className="text-[#D4AF37] font-600">{formatDateTime(todayRecord.logout_time)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Working Hours</span>
                    <span className="text-[#25D366] font-700">{todayRecord.working_hours}h</span>
                  </div>
                  <p className="text-center text-xs text-white/40 mt-3">✓ Attendance Completed</p>
                </>
              ) : (
                <button onClick={clockOut} disabled={clockLoading} className="btn-primary w-full justify-center mt-3 bg-[#A11D4A]">
                  <LogOut size={15} /> {clockLoading ? 'Processing…' : 'Clock Out'}
                </button>
              )}
            </div>
          ) : (
            <button onClick={clockIn} disabled={clockLoading} className="btn-gold w-full justify-center">
              <LogIn size={15} /> {clockLoading ? 'Processing…' : 'Clock In'}
            </button>
          )}
        </div>
      </div>

      {/* Filter by user (admin/supervisor only) */}
      {['super_admin', 'supervisor'].includes(profile?.role) && (
        <div className="stagger-item flex gap-3 mb-5">
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="form-input max-w-xs">
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}

      {loading ? <TableSkeleton rows={8} cols={5} /> : (
        <div className="table-container stagger-item">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-700 text-[#0B1026]">Attendance Records</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Working Hours</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? records.map(r => (
                <tr key={r.id}>
                  <td>
                    <p className="font-500">{r.users?.name || '—'}</p>
                    <p className="text-xs text-slate-400 capitalize">{r.users?.role?.replace('_', ' ')}</p>
                  </td>
                  <td>{r.date}</td>
                  <td className="text-sm">{r.login_time ? new Date(r.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="text-sm">{r.logout_time ? new Date(r.logout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span className="text-amber-500 text-xs font-600">Active</span>}</td>
                  <td>
                    {r.working_hours ? (
                      <span className={`font-600 ${r.working_hours >= 8 ? 'text-emerald-600' : r.working_hours >= 6 ? 'text-amber-500' : 'text-red-500'}`}>
                        {r.working_hours}h
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No attendance records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
