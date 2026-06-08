import { useEffect, useRef, useState } from 'react'
import { Phone, Calendar, Search, Filter, RefreshCw, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDate, formatDateTime } from '../../lib/utils'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import Pagination from '../../components/ui/Pagination'
import CallLogModal from './CallLogModal'
import { CALL_STATUSES } from '../../lib/constants'

const PAGE_SIZE = 25

const CALL_STATUS_STYLE = {
  'Connected':      { bg: '#DCFCE7', color: '#16A34A' },
  'Not Connected':  { bg: '#FEE2E2', color: '#DC2626' },
  'Busy':           { bg: '#FEF3C7', color: '#D97706' },
  'Switched Off':   { bg: '#F1F5F9', color: '#64748B' },
  'Invalid Number': { bg: '#FEE2E2', color: '#B91C1C' },
  'Wrong Number':   { bg: '#FEE2E2', color: '#B91C1C' },
  'Not Reachable':  { bg: '#F1F5F9', color: '#64748B' },
  'Rejected':       { bg: '#FFF1F2', color: '#A11D4A' },
  'Call Back Later':{ bg: '#EFF6FF', color: '#2563EB' },
}

const INTEREST_STYLE = {
  'Interested':          { bg: '#DCFCE7', color: '#16A34A' },
  'Not Interested':      { bg: '#FEE2E2', color: '#DC2626' },
  'Existing CA':         { bg: '#F5F3FF', color: '#7C3AED' },
  'Already Filed':       { bg: '#F1F5F9', color: '#64748B' },
  'Follow-Up Required':  { bg: '#FEF3C7', color: '#D97706' },
}

const TEMP_STYLE = {
  Hot:  { bg: '#FEE2E2', color: '#B91C1C' },
  Warm: { bg: '#FEF3C7', color: '#D97706' },
  Cold: { bg: '#DBEAFE', color: '#1D4ED8' },
}

export default function CallLogsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [callLead, setCallLead] = useState(null)
  const [quickLeads, setQuickLeads] = useState([])
  const [showQuickCall, setShowQuickCall] = useState(false)

  useStaggerAnimation(containerRef)
  useEffect(() => { loadLogs() }, [page, search, statusFilter])

  async function loadLogs() {
    setLoading(true)
    let q = supabase.from('call_logs').select(`
      id, call_status, interest_status, lead_temperature, followup_date,
      whatsapp_sent, proposal_sent, remarks, created_at,
      leads(id, client_name, mobile, city, status),
      users(name)
    `, { count: 'exact' })

    if (profile?.role === 'bpo_agent') q = q.eq('agent_id', profile.id)
    if (statusFilter) q = q.eq('call_status', statusFilter)

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setLogs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  async function loadQuickLeads() {
    let q = supabase.from('leads').select('id,client_name,mobile,status').limit(50).order('created_at', { ascending: false })
    if (profile?.role === 'bpo_agent') q = q.eq('assigned_bpo', profile.id)
    const { data } = await q
    setQuickLeads(data || [])
    setShowQuickCall(true)
  }

  const badge = (value, styleMap) => {
    const s = styleMap[value] || { bg: '#F1F5F9', color: '#64748B' }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
        {value || '—'}
      </span>
    )
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-title">Call Logs</p>
          <p className="page-subtitle">{total.toLocaleString()} call records</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={loadLogs}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-gold" onClick={loadQuickLeads}>
            <Plus size={14} /> Log a Call
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search client name…" className="form-input" style={{ paddingLeft: 34, minWidth: 240 }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="form-input" style={{ minWidth: 180 }}>
          <option value="">All Call Statuses</option>
          {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {statusFilter && (
          <button className="btn btn-outline btn-sm" onClick={() => { setStatusFilter(''); setPage(1) }}>Clear</button>
        )}
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries({
          'Connected':      { bg: '#DCFCE7', color: '#16A34A' },
          'Not Connected':  { bg: '#FEE2E2', color: '#DC2626' },
          'Busy':           { bg: '#FEF3C7', color: '#D97706' },
          'Call Back Later':{ bg: '#EFF6FF', color: '#2563EB' },
        }).map(([status, style]) => {
          const count = logs.filter(l => l.call_status === status).length
          return count > 0 ? (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: style.bg, border: `1px solid ${style.bg}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: style.color }}>{count}</span>
              <span style={{ fontSize: 11, color: style.color }}>{status}</span>
            </div>
          ) : null
        })}
      </div>

      {/* Table */}
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
                <th>Flags</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {l.leads?.client_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{l.leads?.client_name || '—'}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{l.leads?.mobile}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{l.users?.name || '—'}</td>
                  <td>{badge(l.call_status, CALL_STATUS_STYLE)}</td>
                  <td>{badge(l.interest_status, INTEREST_STYLE)}</td>
                  <td>{badge(l.lead_temperature, TEMP_STYLE)}</td>
                  <td>
                    {l.followup_date ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={11} style={{ color: '#D4AF37' }} />
                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{formatDate(l.followup_date)}</span>
                      </div>
                    ) : <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {l.whatsapp_sent && <span style={{ padding: '2px 7px', borderRadius: 4, background: '#DCFCE7', color: '#16A34A', fontSize: 10, fontWeight: 700 }}>WA</span>}
                      {l.proposal_sent && <span style={{ padding: '2px 7px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 700 }}>PR</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: '#94A3B8' }}>{formatDateTime(l.created_at)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Phone size={24} style={{ color: '#CBD5E1' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>No call logs yet</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>Start by logging a call from your leads</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={total} />
        </div>
      )}

      {/* Quick lead picker for Log a Call */}
      {showQuickCall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(10,22,40,0.2)', width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: 'linear-gradient(135deg,#0A1628,#162340)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={15} style={{ color: '#D4AF37' }} />
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 14, fontFamily: "'Poppins',sans-serif" }}>Select Lead to Call</span>
              </div>
              <button onClick={() => setShowQuickCall(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}>✕</button>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <input placeholder="Search leads…" className="form-input" style={{ width: '100%' }} onChange={e => {
                const v = e.target.value.toLowerCase()
                setQuickLeads(ql => ql.filter(l => l.client_name.toLowerCase().includes(v) || l.mobile.includes(v)))
              }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {quickLeads.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { setCallLead(l); setShowQuickCall(false) }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{l.client_name}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{l.mobile}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 5, background: '#DCFCE7', color: '#16A34A' }}>Call</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {callLead && <CallLogModal lead={callLead} onClose={() => { setCallLead(null); loadLogs() }} />}
    </div>
  )
}
