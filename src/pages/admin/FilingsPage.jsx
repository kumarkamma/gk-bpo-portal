import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Search, Edit2, FileText, X, RefreshCw, Download } from 'lucide-react'
import { useForm } from 'react-hook-form'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { FILING_STATUSES, ROLES } from '../../lib/constants'
import { formatDate, logAudit } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { FilingBadge } from '../../components/ui/Badges'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

const PAGE_SIZE = 25
const ITR_TYPES = ['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7']

const STATUS_STYLE = {
  'Documents Pending': { bg: '#FEF3C7', color: '#D97706' },
  'Documents Received':{ bg: '#DBEAFE', color: '#1D4ED8' },
  'Under Review':      { bg: '#EFF6FF', color: '#2563EB' },
  'Under Processing':  { bg: '#F5F3FF', color: '#7C3AED' },
  'Filed':             { bg: '#DCFCE7', color: '#16A34A' },
  'Completed':         { bg: '#D1FAE5', color: '#065F46' },
}

export default function FilingsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [filings, setFilings] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState([])

  useStaggerAnimation(containerRef)
  const { register, handleSubmit, reset, setValue } = useForm()

  const isAuditor = profile?.role === ROLES.AUDITOR
  const canAdd = [ROLES.SUPER_ADMIN, ROLES.AUDITOR].includes(profile?.role)

  useEffect(() => { loadClients() }, [])
  useEffect(() => { loadFilings() }, [page, search, statusFilter])

  const loadClients = useCallback(async () => {
    let q = supabase.from('clients').select('id,client_name,pan_number')
    if (isAuditor) q = q.eq('assigned_auditor', profile.id)
    const { data } = await q.order('client_name').limit(200)
    setClients(data || [])
  }, [isAuditor, profile?.id])

  const loadFilings = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('filings').select('*, clients(client_name,pan_number,mobile)', { count: 'exact' })
    if (isAuditor) q = q.eq('filing_completed_by', profile.id)
    if (statusFilter) q = q.eq('filing_status', statusFilter)
    if (search) q = q.or(`ack_number.ilike.%${search}%`)
    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setFilings(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [page, search, statusFilter, isAuditor, profile?.id])

  async function onSubmit(values) {
    setSaving(true)
    if (selected) {
      await supabase.from('filings').update({ ...values, reviewed_by: profile.id }).eq('id', selected.id)
      await logAudit(profile.id, 'UPDATE', 'filings', selected.id, selected, values)
    } else {
      const { data } = await supabase.from('filings').insert({ ...values, filing_completed_by: profile.id }).select().single()
      if (data) await logAudit(profile.id, 'INSERT', 'filings', data.id, null, data)
    }
    setSaving(false)
    setShowModal(false)
    setSelected(null)
    reset()
    loadFilings()
  }

  function openEdit(f) {
    setSelected(f)
    Object.entries(f).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  async function exportExcel() {
    let q = supabase.from('filings').select('*, clients(client_name,pan_number)')
    if (isAuditor) q = q.eq('filing_completed_by', profile.id)
    const { data } = await q
    if (!data?.length) return
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Filings')
    XLSX.writeFile(wb, `GK_Filings_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-title">ITR Filings</p>
          <p className="page-subtitle">{total.toLocaleString()} filing records</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>
            <Download size={13} /> Export
          </button>
          {canAdd && (
            <button className="btn btn-gold" onClick={() => { setSelected(null); reset(); setShowModal(true) }}>
              <Plus size={14} /> New Filing
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search acknowledgement no…" className="form-input" style={{ paddingLeft: 34, minWidth: 260 }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="form-input" style={{ minWidth: 200 }}>
          <option value="">All Filing Statuses</option>
          {FILING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || statusFilter) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }}>
            <X size={12} /> Clear
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={loadFilings} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={7} cols={7} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Client</th>
                <th>AY</th>
                <th>ITR Type</th>
                <th>Filing Date</th>
                <th>ACK Number</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filings.length > 0 ? filings.map((f, i) => (
                <tr key={f.id}>
                  <td style={{ color: '#CBD5E1', fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {f.clients?.client_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{f.clients?.client_name || '—'}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{f.clients?.pan_number || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{f.assessment_year || '—'}</td>
                  <td>
                    {f.itr_type ? (
                      <span style={{ padding: '3px 9px', borderRadius: 5, background: '#F5F3FF', color: '#7C3AED', fontSize: 11, fontWeight: 700 }}>{f.itr_type}</span>
                    ) : <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{formatDate(f.filing_date)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569', fontWeight: 600 }}>{f.ack_number || '—'}</td>
                  <td><FilingBadge status={f.filing_status} /></td>
                  <td>
                    <button
                      onClick={() => openEdit(f)}
                      style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}
                    >
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={24} style={{ color: '#CBD5E1' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>No filings found</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>{search || statusFilter ? 'Try adjusting your filters' : 'Create the first filing record'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={total} />
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelected(null); reset() }} title={selected ? 'Update Filing' : 'New Filing'} size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Client</label>
              <select {...register('client_id')} className="form-input">
                <option value="">— Select Client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.client_name} {c.pan_number ? `· ${c.pan_number}` : ''}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Assessment Year</label>
                <input {...register('assessment_year')} className="form-input" placeholder="2024-25" />
              </div>
              <div className="form-group">
                <label className="form-label">ITR Type</label>
                <select {...register('itr_type')} className="form-input">
                  <option value="">Select type</option>
                  {ITR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Filing Status</label>
                <select {...register('filing_status')} className="form-input">
                  {FILING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Filing Date</label>
                <input {...register('filing_date')} type="date" className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Acknowledgement Number</label>
              <input {...register('ack_number')} className="form-input" placeholder="Leave blank if not filed yet" />
            </div>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea {...register('remarks')} rows={2} className="form-input" style={{ resize: 'none' }} placeholder="Optional notes…" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); reset() }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : selected ? 'Update Filing' : 'Create Filing'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
