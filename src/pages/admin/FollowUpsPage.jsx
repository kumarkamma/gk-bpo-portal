import { useEffect, useRef, useState } from 'react'
import { Calendar, Phone, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDate } from '../../lib/utils'
import { LeadStatusBadge, TempBadge } from '../../components/ui/Badges'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import CallLogModal from './CallLogModal'

export default function FollowUpsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('today')
  const [callLead, setCallLead] = useState(null)

  useStaggerAnimation(containerRef)
  useEffect(() => { loadFollowUps() }, [filter])

  async function loadFollowUps() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

    let query = supabase.from('leads')
      .select('*')
      .not('next_followup_date', 'is', null)

    if (profile?.role === 'bpo_agent') query = query.eq('assigned_bpo', profile.id)

    if (filter === 'today') query = query.eq('next_followup_date', today)
    else if (filter === 'tomorrow') query = query.eq('next_followup_date', tomorrow)
    else if (filter === 'week') query = query.gte('next_followup_date', today).lte('next_followup_date', weekEnd)
    else if (filter === 'overdue') query = query.lt('next_followup_date', today)

    const { data } = await query.order('next_followup_date', { ascending: true })
    setFollowups(data || [])
    setLoading(false)
  }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Follow-Ups</h1>
          <p className="page-subtitle">{followups.length} follow-ups {filter}</p>
        </div>
      </div>

      <div className="stagger-item flex items-center gap-2 mb-5">
        {[
          { key: 'today', label: 'Today', icon: Calendar },
          { key: 'tomorrow', label: 'Tomorrow', icon: Clock },
          { key: 'week', label: 'This Week', icon: Calendar },
          { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-600 transition-all ${filter === key ? 'bg-[#0B1026] text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-[#D4AF37]'}`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {loading ? <TableSkeleton rows={6} cols={6} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Temperature</th>
                <th>Follow-Up Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {followups.length > 0 ? followups.map(l => {
                const isOverdue = new Date(l.next_followup_date) < new Date()
                return (
                  <tr key={l.id} className={isOverdue && filter !== 'overdue' ? 'bg-red-50/40' : ''}>
                    <td>
                      <p className="font-500">{l.client_name}</p>
                      <p className="text-xs text-slate-400">{l.city || ''}</p>
                    </td>
                    <td>{l.mobile}</td>
                    <td><LeadStatusBadge status={l.status} /></td>
                    <td>—</td>
                    <td>
                      <span className={`text-sm font-500 ${isOverdue ? 'text-red-500' : 'text-slate-600'}`}>
                        {formatDate(l.next_followup_date)}
                        {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setCallLead(l)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-600 hover:bg-green-100 transition-colors"
                      >
                        <Phone size={12} /> Call
                      </button>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No follow-ups for {filter}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {callLead && <CallLogModal lead={callLead} onClose={() => { setCallLead(null); loadFollowUps() }} />}
    </div>
  )
}
