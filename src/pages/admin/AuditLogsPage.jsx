import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDateTime } from '../../lib/utils'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import Pagination from '../../components/ui/Pagination'

const PAGE_SIZE = 30

export default function AuditLogsPage() {
  const containerRef = useRef(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  useStaggerAnimation(containerRef)
  useEffect(() => { loadLogs() }, [page, search])

  async function loadLogs() {
    setLoading(true)
    let query = supabase.from('audit_logs').select(`*, users(name)`, { count: 'exact' })
    if (search) query = query.or(`action.ilike.%${search}%,table_name.ilike.%${search}%`)
    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setLogs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const actionColors = {
    INSERT: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    LOGIN: 'bg-purple-100 text-purple-700',
  }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Complete trail of all system activities</p>
      </div>

      <div className="stagger-item flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search action or table…" className="form-input pl-9" />
        </div>
      </div>

      {loading ? <TableSkeleton rows={8} cols={6} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map(l => (
                <tr key={l.id}>
                  <td className="text-xs text-slate-500">{formatDateTime(l.created_at)}</td>
                  <td className="font-500 text-sm">{l.users?.name || '—'}</td>
                  <td><span className={`badge ${actionColors[l.action?.toUpperCase()] || 'bg-gray-100 text-gray-600'}`}>{l.action}</span></td>
                  <td className="font-mono text-xs bg-slate-50 px-2 py-1 rounded">{l.table_name}</td>
                  <td className="font-mono text-xs text-slate-400">{l.record_id?.slice(0, 8)}…</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No audit logs</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={total} />
        </div>
      )}
    </div>
  )
}
