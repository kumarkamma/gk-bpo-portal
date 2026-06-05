import { useEffect, useRef, useState } from 'react'
import { Phone, Calendar, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDate, formatDateTime } from '../../lib/utils'
import { TempBadge } from '../../components/ui/Badges'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import Pagination from '../../components/ui/Pagination'
import CallLogModal from './CallLogModal'

const PAGE_SIZE = 25

export default function CallLogsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [callLead, setCallLead] = useState(null)

  useStaggerAnimation(containerRef)
  useEffect(() => { loadLogs() }, [page, search])

  async function loadLogs() {
    setLoading(true)
    let query = supabase.from('call_logs').select(`
      *, 
      leads(client_name, mobile, city, status),
      users(name)
    `, { count: 'exact' })

    if (['bpo_agent'].includes(profile?.role)) query = query.eq('agent_id', profile.id)

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setLogs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const callStatusColors = {
    Connected: 'bg-green-100 text-green-700',
    'Not Connected': 'bg-red-100 text-red-600',
    Busy: 'bg-orange-100 text-orange-700',
    'Switched Off': 'bg-gray-100 text-gray-600',
    'Invalid Number': 'bg-red-100 text-red-700',
    'Call Back Later': 'bg-blue-100 text-blue-700',
  }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Call Logs</h1>
          <p className="page-subtitle">{total.toLocaleString()} call records</p>
        </div>
      </div>

      <div className="stagger-item flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search call logs…" className="form-input pl-9" />
        </div>
      </div>

      {loading ? <TableSkeleton rows={8} cols={7} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Agent</th>
                <th>Call Status</th>
                <th>Interest</th>
                <th>Temperature</th>
                <th>Follow-Up</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map(l => (
                <tr key={l.id}>
                  <td>
                    <p className="font-500">{l.leads?.client_name || '—'}</p>
                    <p className="text-xs text-slate-400">{l.leads?.mobile}</p>
                  </td>
                  <td className="text-sm text-slate-500">{l.users?.name || '—'}</td>
                  <td>
                    <span className={`badge ${callStatusColors[l.call_status] || 'bg-gray-100 text-gray-600'}`}>
                      {l.call_status}
                    </span>
                  </td>
                  <td className="text-xs">{l.interest_status || '—'}</td>
                  <td><TempBadge temp={l.lead_temperature} /></td>
                  <td className="text-xs text-slate-500">
                    {l.followup_date ? (
                      <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(l.followup_date)}</span>
                    ) : '—'}
                  </td>
                  <td className="text-xs text-slate-400">{formatDateTime(l.created_at)}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No call logs</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={total} />
        </div>
      )}

      {callLead && <CallLogModal lead={callLead} onClose={() => { setCallLead(null); loadLogs() }} />}
    </div>
  )
}
