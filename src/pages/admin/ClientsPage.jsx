import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Search, Edit2, UserCheck, X, RefreshCw, Download } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { SERVICES, ROLES } from '../../lib/constants'
import { formatDate, logAudit } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

const PAGE_SIZE = 25

const STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand',
  'West Bengal','Other']

const CLIENT_STATUSES = ['New Client','Active','Under Processing','ITR Filed','Completed','On Hold']

const STATUS_STYLE = {
  'New Client':        { bg: '#EFF6FF', color: '#1D4ED8' },
  'Active':            { bg: '#DCFCE7', color: '#16A34A' },
  'Under Processing':  { bg: '#F5F3FF', color: '#7C3AED' },
  'ITR Filed':         { bg: '#DCFCE7', color: '#15803D' },
  'Completed':         { bg: '#D1FAE5', color: '#065F46' },
  'On Hold':           { bg: '#FEF3C7', color: '#D97706' },
}

const clientSchema = z.object({
  client_name:      z.string().min(2, 'Name required'),
  mobile:           z.string().min(10, 'Valid mobile required'),
  pan_number:       z.string().optional(),
  email:            z.string().email().optional().or(z.literal('')),
  city:             z.string().optional(),
  state:            z.string().optional(),
  assessment_year:  z.string().optional(),
  service_type:     z.string().optional(),
  assigned_auditor: z.string().optional(),
  current_status:   z.string().optional(),
})

export default function ClientsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [auditors, setAuditors] = useState([])

  useStaggerAnimation(containerRef)
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(clientSchema) })

  const isAuditor = profile?.role === ROLES.AUDITOR
  const canEdit = [ROLES.SUPER_ADMIN, ROLES.SUPERVISOR].includes(profile?.role)

  useEffect(() => { loadAuditors() }, [])
  useEffect(() => { loadClients() }, [page, search, statusFilter])

  const loadAuditors = useCallback(async () => {
    const { data } = await supabase.from('users').select('id,name').eq('role', 'auditor').eq('status', 'active')
    setAuditors(data || [])
  }, [])

  const loadClients = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('clients').select('*', { count: 'exact' })
    if (isAuditor) q = q.eq('assigned_auditor', profile.id)
    if (search) q = q.or(`client_name.ilike.%${search}%,pan_number.ilike.%${search}%,mobile.ilike.%${search}%`)
    if (statusFilter) q = q.eq('current_status', statusFilter)
    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setClients(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [page, search, statusFilter, isAuditor, profile?.id])

  async function onSubmit(values) {
    setSaving(true)
    if (selected) {
      await supabase.from('clients').update(values).eq('id', selected.id)
      await logAudit(profile.id, 'UPDATE', 'clients', selected.id, selected, values)
    } else {
      const { data } = await supabase.from('clients').insert({ ...values, current_status: values.current_status || 'New Client' }).select().single()
      if (data) await logAudit(profile.id, 'INSERT', 'clients', data.id, null, data)
    }
    setSaving(false)
    setShowModal(false)
    setSelected(null)
    reset()
    loadClients()
  }

  function openEdit(c) {
    setSelected(c)
    Object.entries(c).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  async function exportExcel() {
    let q = supabase.from('clients').select('*')
    if (isAuditor) q = q.eq('assigned_auditor', profile.id)
    const { data } = await q
    if (!data?.length) return
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clients')
    XLSX.writeFile(wb, `GK_Clients_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const StatusBadge = ({ status }) => {
    const s = STATUS_STYLE[status] || { bg: '#F1F5F9', color: '#64748B' }
    return (
      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
        {status || '—'}
      </span>
    )
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-title">Clients</p>
          <p className="page-subtitle">{total.toLocaleString()} registered clients in system</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>
            <Download size={13} /> Export
          </button>
          {canEdit && (
            <button className="btn btn-gold" onClick={() => { setSelected(null); reset(); setShowModal(true) }}>
              <Plus size={14} /> Add Client
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search name, PAN, mobile…" className="form-input" style={{ paddingLeft: 34, minWidth: 260 }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="form-input" style={{ minWidth: 180 }}>
          <option value="">All Statuses</option>
          {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || statusFilter) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }}>
            <X size={12} /> Clear
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={loadClients} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={8} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Client</th>
                <th>PAN</th>
                <th>Mobile</th>
                <th>Service</th>
                <th>Auditor</th>
                <th>AY</th>
                <th>Status</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {clients.length > 0 ? clients.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: '#CBD5E1', fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {c.client_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{c.client_name}</p>
                        {c.city && <p style={{ fontSize: 11, color: '#94A3B8' }}>{c.city}{c.state ? `, ${c.state}` : ''}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569', fontWeight: 600 }}>{c.pan_number || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{c.mobile}</td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{c.service_type || '—'}</td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{auditors.find(a => a.id === c.assigned_auditor)?.name || <span style={{ color: '#CBD5E1' }}>Unassigned</span>}</td>
                  <td style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{c.assessment_year || '—'}</td>
                  <td><StatusBadge status={c.current_status} /></td>
                  {canEdit && (
                    <td>
                      <button
                        onClick={() => openEdit(c)}
                        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserCheck size={24} style={{ color: '#CBD5E1' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>No clients found</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>{search || statusFilter ? 'Try adjusting your filters' : 'Convert a lead to add your first client'}</p>
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
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelected(null); reset() }} title={selected ? 'Edit Client' : 'Add New Client'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Client Name</label>
              <input {...register('client_name')} className={`form-input ${errors.client_name ? 'error' : ''}`} placeholder="Rajesh Kumar" />
              {errors.client_name && <span className="form-error">{errors.client_name.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Mobile Number</label>
              <input {...register('mobile')} className={`form-input ${errors.mobile ? 'error' : ''}`} placeholder="9876543210" />
              {errors.mobile && <span className="form-error">{errors.mobile.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input {...register('pan_number')} className="form-input" placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input {...register('email')} type="email" className="form-input" placeholder="rajesh@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input {...register('city')} className="form-input" placeholder="Mumbai" />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <select {...register('state')} className="form-input">
                <option value="">Select State</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assessment Year</label>
              <input {...register('assessment_year')} className="form-input" placeholder="2024-25" />
            </div>
            <div className="form-group">
              <label className="form-label">Service Type</label>
              <select {...register('service_type')} className="form-input">
                <option value="">Select service</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign Auditor</label>
              <select {...register('assigned_auditor')} className="form-input">
                <option value="">— Unassigned —</option>
                {auditors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Current Status</label>
              <select {...register('current_status')} className="form-input">
                {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); reset() }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : selected ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
