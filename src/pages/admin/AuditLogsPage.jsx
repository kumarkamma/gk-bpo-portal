import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, Shield, RefreshCw, X, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDateTime } from '../../lib/utils'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import Pagination from '../../components/ui/Pagination'

const PAGE_SIZE = 30

const ACTION_STYLE = {
  INSERT:             { bg: '#DCFCE7', color: '#16A34A' },
  CREATE_USER:        { bg: '#DCFCE7', color: '#16A34A' },
  UPDATE:             { bg: '#EFF6FF', color: '#2563EB' },
  UPDATE_USER:        { bg: '#EFF6FF', color: '#2563EB' },
  ASSIGN:             { bg: '#F5F3FF', color: '#7C3AED' },
  DELETE:             { bg: '#FEE2E2', color: '#DC2626' },
  SET_STATUS_BANNED:  { bg: '#FEE2E2', color: '#DC2626' },
  SET_STATUS_SUSPENDED: { bg: '#FEF3C7', color: '#D97706' },
  SET_STATUS_ACTIVE:  { bg: '#DCFCE7', color: '#16A34A' },
  SET_STATUS_INACTIVE:{ bg: '#F1F5F9', color: '#64748B' },
  PASSWORD_RESET_SENT:{ bg: '#FEF3C7', color: '#D97706' },
}

const ACTION_FILTERS = [
  { label: 'All',      value: '' },
  { label: 'Creates',  value: 'INSERT' },
  { label: 'Updates',  value: 'UPDATE' },
  { label: 'User Mgmt',value: 'USER' },
  { label: 'Deletions',value: 'DELETE' },
]

export default function AuditLogsPage() {
  const containerRef = useRef(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  useStaggerAnimation(containerRef)
  useEffect(() => { loadLogs() }, [page, search, actionFilter])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('audit_logs').select('*, users(name, role)', { count: 'exact' })
    if (search) q = q.or(`action.ilike.%${search}%,table_name.ilike.%${search}%`)
    if (actionFilter) q = q.ilike('action', `%${actionFilter}%`)
    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setLogs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [page, search, actionFilter])

  const ActionBadge = ({ action }) => {
    const key = Object.keys(ACTION_STYLE).find(k => action?.toUpperCase().startsWith(k)) || ''
    const s = ACTION_STYLE[key] || { bg: '#F1F5F9', color: '#64748B' }
    return (
      <span style={{ display: 'inline-flex', padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
        {action?.replace(/_/g, ' ') || '—'}
      </span>
    )
  }

  const TABLE_COLORS = {
    leads: '#EFF6FF', clients: '#F0FDFA', payments: '#FEF3C7',
    filings: '#F5F3FF', users: '#FFF1F2', call_logs: '#DCFCE7',
    attendance: '#F0FDFA', audit_logs: '#F1F5F9',
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={19} style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <p className="page-title">Audit Logs</p>
            <p className="page-subtitle">{total.toLocaleString()} total system activity records</p>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={loadLogs}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search action, table…"
            className="form-input"
            style={{ paddingLeft: 34, minWidth: 240 }}
          />
        </div>

        {/* Action filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ACTION_FILTERS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => { setActionFilter(value); setPage(1) }}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${actionFilter === value ? '#D4AF37' : '#E2E8F0'}`,
                background: actionFilter === value ? 'rgba(212,175,55,0.08)' : '#fff',
                color: actionFilter === value ? '#B8942E' : '#64748B',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {(search || actionFilter) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setActionFilter(''); setPage(1) }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={5} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map((l, i) => (
                <tr key={l.id}>
                  <td style={{ color: '#CBD5E1', fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>{formatDateTime(l.created_at)}</td>
                  <td>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{l.users?.name || '—'}</p>
                    {l.users?.role && (
                      <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 1, textTransform: 'capitalize' }}>
                        {l.users.role.replace('_', ' ')}
                      </p>
                    )}
                  </td>
                  <td><ActionBadge action={l.action} /></td>
                  <td>
                    {l.table_name ? (
                      <span style={{
                        padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                        background: TABLE_COLORS[l.table_name] || '#F1F5F9',
                        color: '#475569', fontFamily: 'monospace',
                      }}>
                        {l.table_name}
                      </span>
                    ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>
                    {l.record_id ? `${l.record_id.slice(0, 8)}…` : '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={24} style={{ color: '#CBD5E1' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>No audit logs found</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>System actions will appear here as users interact with the portal</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={total} />
        </div>
      )}
    </div>
  )
}
