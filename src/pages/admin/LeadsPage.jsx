import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Search, Filter, Download, Upload, Phone, Eye, Edit2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { LEAD_STATUSES, LEAD_STATUS_COLORS, SERVICES, ROLES } from '../../lib/constants'
import { formatDate, truncate } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { LeadStatusBadge } from '../../components/ui/Badges'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import CallLogModal from './CallLogModal'

const PAGE_SIZE = 25

const leadSchema = z.object({
  client_name: z.string().min(2),
  mobile: z.string().min(10).max(10),
  alternate_mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
  state: z.string().optional(),
  occupation: z.string().optional(),
  source: z.string().optional(),
  pan_available: z.boolean().optional(),
  status: z.string().optional(),
})

export default function LeadsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [showCallModal, setShowCallModal] = useState(false)
  const [callLead, setCallLead] = useState(null)
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState([])

  useStaggerAnimation(containerRef)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(leadSchema) })

  const isAgent = profile?.role === ROLES.BPO_AGENT

  useEffect(() => { loadAgents() }, [])
  useEffect(() => { loadLeads() }, [page, search, statusFilter])

  async function loadAgents() {
    const { data } = await supabase.from('users').select('id, name').eq('role', 'bpo_agent')
    setAgents(data || [])
  }

  async function loadLeads() {
    setLoading(true)
    let query = supabase.from('leads').select('*', { count: 'exact' })

    if (isAgent) query = query.eq('assigned_bpo', profile.id)
    if (search) query = query.or(`client_name.ilike.%${search}%,mobile.ilike.%${search}%,email.ilike.%${search}%`)
    if (statusFilter) query = query.eq('status', statusFilter)

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setLeads(data || [])
    setTotalRows(count || 0)
    setLoading(false)
  }

  async function onSubmit(values) {
    setSaving(true)
    if (selectedLead) {
      await supabase.from('leads').update({ ...values }).eq('id', selectedLead.id)
    } else {
      await supabase.from('leads').insert({ ...values, status: values.status || 'New Lead', lead_owner: profile?.id })
    }
    setSaving(false)
    setShowAddModal(false)
    setSelectedLead(null)
    reset()
    loadLeads()
  }

  function openEdit(lead) {
    setSelectedLead(lead)
    Object.entries(lead).forEach(([k, v]) => setValue(k, v))
    setShowAddModal(true)
  }

  function openAdd() {
    setSelectedLead(null)
    reset()
    setShowAddModal(true)
  }

  async function exportExcel() {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    const ws = XLSX.utils.json_to_sheet(data || [])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, `GK_Leads_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const totalPages = Math.ceil(totalRows / PAGE_SIZE)

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">{totalRows.toLocaleString()} total leads in pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="btn-secondary"><Download size={15} /> Export</button>
          {!isAgent && <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Lead</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="stagger-item flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, mobile, email…"
            className="form-input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="form-input max-w-xs"
        >
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }} className="btn-secondary">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={7} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Client Name</th>
                <th>Mobile</th>
                <th>City</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.length > 0 ? leads.map((lead, i) => (
                <tr key={lead.id}>
                  <td className="text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>
                    <div>
                      <p className="font-500 text-[#0B1026]">{lead.client_name}</p>
                      {lead.email && <p className="text-xs text-slate-400">{lead.email}</p>}
                    </div>
                  </td>
                  <td>{lead.mobile}</td>
                  <td>{lead.city || '—'}</td>
                  <td><LeadStatusBadge status={lead.status} /></td>
                  <td className="text-xs text-slate-500">{agents.find(a => a.id === lead.assigned_bpo)?.name || '—'}</td>
                  <td className="text-xs text-slate-500">{formatDate(lead.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setCallLead(lead); setShowCallModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
                        title="Log Call"
                      >
                        <Phone size={14} />
                      </button>
                      <button onClick={() => openEdit(lead)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No leads found</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={totalRows} />
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setSelectedLead(null); reset() }} title={selectedLead ? 'Edit Lead' : 'Add New Lead'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Full Name *</label>
            <input {...register('client_name')} className="form-input" placeholder="Rajesh Kumar" />
            {errors.client_name && <p className="text-xs text-red-500 mt-1">{errors.client_name.message}</p>}
          </div>
          <div>
            <label className="form-label">Mobile *</label>
            <input {...register('mobile')} className="form-input" placeholder="9876543210" />
            {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
          </div>
          <div>
            <label className="form-label">Alternate Mobile</label>
            <input {...register('alternate_mobile')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input {...register('email')} className="form-input" type="email" />
          </div>
          <div>
            <label className="form-label">City</label>
            <input {...register('city')} className="form-input" />
          </div>
          <div>
            <label className="form-label">State</label>
            <input {...register('state')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Occupation</label>
            <input {...register('occupation')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Source</label>
            <input {...register('source')} className="form-input" placeholder="Website, Referral, etc." />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-input">
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {!isAgent && (
            <div>
              <label className="form-label">Assign to Agent</label>
              <select {...register('assigned_bpo')} className="form-input">
                <option value="">— Unassigned —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowAddModal(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : selectedLead ? 'Update Lead' : 'Add Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Call Log Modal */}
      {showCallModal && callLead && (
        <CallLogModal lead={callLead} onClose={() => { setShowCallModal(false); setCallLead(null); loadLeads() }} />
      )}
    </div>
  )
}
