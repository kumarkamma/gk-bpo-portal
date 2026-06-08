import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Search, Download, Phone, Edit2, Users, X, Filter, ArrowUpRight, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { LEAD_STATUSES, SERVICES, ROLES } from '../../lib/constants'
import { formatDate, logAudit } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { LeadStatusBadge } from '../../components/ui/Badges'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import CallLogModal from './CallLogModal'

const PAGE_SIZE = 25

const leadSchema = z.object({
  client_name:      z.string().min(2, 'Name required'),
  mobile:           z.string().length(10, 'Enter 10-digit mobile'),
  alternate_mobile: z.string().optional(),
  email:            z.string().email().optional().or(z.literal('')),
  city:             z.string().optional(),
  state:            z.string().optional(),
  occupation:       z.string().optional(),
  source:           z.string().optional(),
  pan_available:    z.boolean().optional(),
  status:           z.string().optional(),
})

const SOURCES = ['Website', 'Referral', 'Walk-in', 'Cold Call', 'Facebook', 'Google Ads', 'WhatsApp', 'Other']
const STATES = ['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal','Other']

export default function LeadsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [callLead, setCallLead] = useState(null)
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState([])
  const [checkedIds, setCheckedIds] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignLeadTarget, setAssignLeadTarget] = useState(null)
  const [assignAgent, setAssignAgent] = useState('')

  const isAgent = profile?.role === ROLES.BPO_AGENT
  const canAdmin = [ROLES.SUPER_ADMIN, ROLES.SUPERVISOR].includes(profile?.role)

  useStaggerAnimation(containerRef)
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(leadSchema) })

  useEffect(() => { loadAgents() }, [])
  useEffect(() => { loadLeads() }, [page, search, statusFilter])

  const loadAgents = useCallback(async () => {
    const { data } = await supabase.from('users').select('id,name').eq('role', 'bpo_agent').eq('status', 'active')
    setAgents(data || [])
  }, [])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('leads').select('*', { count: 'exact' })
    if (isAgent) q = q.eq('assigned_bpo', profile.id)
    if (search) q = q.or(`client_name.ilike.%${search}%,mobile.ilike.%${search}%`)
    if (statusFilter) q = q.eq('status', statusFilter)
    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setLeads(data || [])
    setTotalRows(count || 0)
    setLoading(false)
  }, [page, search, statusFilter, isAgent, profile?.id])

  const onSubmit = async (values) => {
    setSaving(true)
    if (selectedLead) {
      await supabase.from('leads').update(values).eq('id', selectedLead.id)
      await logAudit(profile.id, 'UPDATE', 'leads', selectedLead.id, selectedLead, values)
    } else {
      const { data } = await supabase.from('leads').insert({ ...values, status: values.status || 'New Lead', lead_owner: profile.id }).select().single()
      if (data) await logAudit(profile.id, 'INSERT', 'leads', data.id, null, data)
    }
    setSaving(false)
    setShowModal(false)
    setSelectedLead(null)
    reset()
    loadLeads()
  }

  const openEdit = (lead) => {
    setSelectedLead(lead)
    Object.entries(lead).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  const openAdd = () => { setSelectedLead(null); reset(); setShowModal(true) }

  const handleAssign = async () => {
    if (!assignAgent) return
    const ids = assignLeadTarget ? [assignLeadTarget.id] : checkedIds
    await supabase.from('leads').update({ assigned_bpo: assignAgent, assigned_date: new Date().toISOString().slice(0, 10) }).in('id', ids)
    await logAudit(profile.id, 'ASSIGN', 'leads', ids.join(','), null, { assigned_to: assignAgent })
    setShowAssignModal(false); setAssignLeadTarget(null); setAssignAgent(''); setCheckedIds([])
    loadLeads()
  }

  const toggleCheck = (id) => setCheckedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const toggleAll = () => setCheckedIds(checkedIds.length === leads.length ? [] : leads.map(l => l.id))

  const S = {
    page: { },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
    actions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    filters: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
    searchWrap: { position: 'relative' },
    searchIcon: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' },
    searchInput: { paddingLeft: 34, minWidth: 260 },
    chip: (active) => ({
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px',
      borderRadius: 8, border: `1.5px solid ${active ? '#D4AF37' : '#E2E8F0'}`,
      background: active ? 'rgba(212,175,55,0.08)' : '#fff',
      color: active ? '#B8942E' : '#64748B', fontSize: 12, fontWeight: 600,
      cursor: 'pointer', transition: 'all 0.15s',
    }),
    actionBtn: { width: 30, height: 30, borderRadius: 7, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' },
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <p className="page-title">Leads</p>
          <p className="page-subtitle">{totalRows.toLocaleString()} total leads in pipeline</p>
        </div>
        <div style={S.actions}>
          {checkedIds.length > 0 && canAdmin && (
            <button className="btn btn-navy btn-sm" onClick={() => setShowAssignModal(true)}>
              <Users size={13} /> Assign ({checkedIds.length})
            </button>
          )}
          {!isAgent && (
            <button className="btn btn-outline btn-sm" onClick={() => {}}>
              <Download size={13} /> Export
            </button>
          )}
          {!isAgent && (
            <button className="btn btn-gold" onClick={openAdd}>
              <Plus size={14} /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={S.filters}>
        <div style={S.searchWrap}>
          <Search size={14} style={S.searchIcon} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search name, mobile…" className="form-input" style={S.searchInput} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="form-input" style={{ minWidth: 180 }}>
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || statusFilter) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }}>
            <X size={12} /> Clear
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={loadLeads} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={8} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={leads.length > 0 && checkedIds.length === leads.length} onChange={toggleAll} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#D4AF37' }} />
                </th>
                <th>#</th>
                <th>Client Name</th>
                <th>Mobile</th>
                <th>City / State</th>
                <th>Status</th>
                <th>Assigned Agent</th>
                <th>Added On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length > 0 ? leads.map((lead, i) => (
                <tr key={lead.id} style={{ background: checkedIds.includes(lead.id) ? 'rgba(212,175,55,0.05)' : 'transparent' }}>
                  <td>
                    <input type="checkbox" checked={checkedIds.includes(lead.id)} onChange={() => toggleCheck(lead.id)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#D4AF37' }} />
                  </td>
                  <td style={{ color: '#CBD5E1', fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {lead.client_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{lead.client_name}</p>
                        {lead.email && <p style={{ fontSize: 11, color: '#94A3B8' }}>{lead.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#475569' }}>{lead.mobile}</td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{[lead.city, lead.state].filter(Boolean).join(', ') || '—'}</td>
                  <td><LeadStatusBadge status={lead.status} /></td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{agents.find(a => a.id === lead.assigned_bpo)?.name || <span style={{ color: '#CBD5E1' }}>Unassigned</span>}</td>
                  <td style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(lead.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button style={S.actionBtn} title="Log Call" onClick={() => setCallLead(lead)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#DCFCE7'; e.currentTarget.style.color = '#16A34A'; e.currentTarget.style.borderColor = '#BBF7D0' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
                        <Phone size={13} />
                      </button>
                      <button style={S.actionBtn} title="Edit Lead" onClick={() => openEdit(lead)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
                        <Edit2 size={13} />
                      </button>
                      {canAdmin && (
                        <button style={S.actionBtn} title="Assign Agent" onClick={() => { setAssignLeadTarget(lead); setAssignAgent(lead.assigned_bpo || ''); setShowAssignModal(true) }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FFFBEB'; e.currentTarget.style.color = '#D4AF37'; e.currentTarget.style.borderColor = '#FDE68A' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
                          <Users size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} style={{ color: '#CBD5E1' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>No leads found</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>{search || statusFilter ? 'Try adjusting your filters' : 'Add your first lead to get started'}</p>
                      {!isAgent && <button className="btn btn-gold" onClick={openAdd}><Plus size={14} /> Add First Lead</button>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(totalRows / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={totalRows} />
        </div>
      )}

      {/* Add / Edit Lead Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedLead(null); reset() }} title={selectedLead ? 'Edit Lead' : 'Add New Lead'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Full Name</label>
              <input {...register('client_name')} className={`form-input ${errors.client_name ? 'error' : ''}`} placeholder="Rajesh Kumar" />
              {errors.client_name && <span className="form-error">{errors.client_name.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Mobile Number</label>
              <input {...register('mobile')} className={`form-input ${errors.mobile ? 'error' : ''}`} placeholder="9876543210" maxLength={10} />
              {errors.mobile && <span className="form-error">{errors.mobile.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Alternate Mobile</label>
              <input {...register('alternate_mobile')} className="form-input" placeholder="Optional" />
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
              <label className="form-label">Occupation</label>
              <input {...register('occupation')} className="form-input" placeholder="Salaried / Business" />
            </div>
            <div className="form-group">
              <label className="form-label">Lead Source</label>
              <select {...register('source')} className="form-input">
                <option value="">Select Source</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Lead Status</label>
              <select {...register('status')} className="form-input">
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {!isAgent && (
              <div className="form-group">
                <label className="form-label">Assign to Agent</label>
                <select {...register('assigned_bpo')} className="form-input">
                  <option value="">— Unassigned —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#475569', fontWeight: 500 }}>
                <input {...register('pan_available')} type="checkbox" style={{ width: 16, height: 16, accentColor: '#D4AF37' }} />
                PAN Card Available
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); reset() }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : selectedLead ? 'Update Lead' : 'Add Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setAssignLeadTarget(null); setAssignAgent('') }} title={checkedIds.length > 1 ? `Bulk Assign — ${checkedIds.length} Leads` : `Assign Lead`} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {assignLeadTarget && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p style={{ fontWeight: 700, fontSize: 13 }}>{assignLeadTarget.client_name}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{assignLeadTarget.mobile}</p>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Select Agent</label>
            <select value={assignAgent} onChange={e => setAssignAgent(e.target.value)} className="form-input">
              <option value="">— Select Agent —</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
            <button className="btn btn-outline" onClick={() => { setShowAssignModal(false); setAssignLeadTarget(null); setAssignAgent('') }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAssign} disabled={!assignAgent}>
              {checkedIds.length > 1 ? `Assign ${checkedIds.length} Leads` : 'Assign Lead'}
            </button>
          </div>
        </div>
      </Modal>

      {callLead && <CallLogModal lead={callLead} onClose={() => { setCallLead(null); loadLeads() }} />}
    </div>
  )
}
