import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Edit2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { SERVICES, ROLES } from '../../lib/constants'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

const PAGE_SIZE = 25

export default function ClientsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [auditors, setAuditors] = useState([])

  useStaggerAnimation(containerRef)
  const { register, handleSubmit, reset, setValue } = useForm()
  const isAuditor = profile?.role === ROLES.AUDITOR

  useEffect(() => { loadAuditors() }, [])
  useEffect(() => { loadClients() }, [page, search])

  async function loadAuditors() {
    const { data } = await supabase.from('users').select('id, name').eq('role', 'auditor')
    setAuditors(data || [])
  }

  async function loadClients() {
    setLoading(true)
    let query = supabase.from('clients').select('*', { count: 'exact' })
    if (isAuditor) query = query.eq('assigned_auditor', profile.id)
    if (search) query = query.or(`client_name.ilike.%${search}%,pan_number.ilike.%${search}%,mobile.ilike.%${search}%`)
    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setClients(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  async function onSubmit(values) {
    setSaving(true)
    if (selected) await supabase.from('clients').update(values).eq('id', selected.id)
    else await supabase.from('clients').insert(values)
    setSaving(false)
    setShowModal(false)
    reset()
    loadClients()
  }

  function openEdit(c) {
    setSelected(c)
    Object.entries(c).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  const statusColors = {
    'New Client': 'bg-blue-100 text-blue-700',
    'Active': 'bg-emerald-100 text-emerald-700',
    'Under Processing': 'bg-purple-100 text-purple-700',
    'ITR Filed': 'bg-green-100 text-green-700',
    'Completed': 'bg-teal-100 text-teal-700',
  }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{total.toLocaleString()} registered clients</p>
        </div>
        {!isAuditor && (
          <button onClick={() => { setSelected(null); reset(); setShowModal(true) }} className="btn-primary">
            <Plus size={15} /> Add Client
          </button>
        )}
      </div>

      <div className="stagger-item flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, PAN, mobile…" className="form-input pl-9" />
        </div>
      </div>

      {loading ? <TableSkeleton rows={7} cols={7} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>PAN</th>
                <th>Mobile</th>
                <th>Service</th>
                <th>Auditor</th>
                <th>Status</th>
                <th>AY</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length > 0 ? clients.map(c => (
                <tr key={c.id}>
                  <td>
                    <div>
                      <p className="font-500">{c.client_name}</p>
                      <p className="text-xs text-slate-400">{c.city || ''}</p>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{c.pan_number || '—'}</td>
                  <td>{c.mobile}</td>
                  <td className="text-xs">{c.service_type || '—'}</td>
                  <td className="text-xs text-slate-500">{auditors.find(a => a.id === c.assigned_auditor)?.name || '—'}</td>
                  <td><span className={`badge ${statusColors[c.current_status] || 'bg-gray-100 text-gray-600'}`}>{c.current_status || '—'}</span></td>
                  <td className="text-xs">{c.assessment_year || '—'}</td>
                  <td>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No clients found</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={total} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title={selected ? 'Edit Client' : 'Add Client'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Client Name *</label>
            <input {...register('client_name')} className="form-input" required />
          </div>
          <div>
            <label className="form-label">PAN Number</label>
            <input {...register('pan_number')} className="form-input" placeholder="ABCDE1234F" />
          </div>
          <div>
            <label className="form-label">Mobile *</label>
            <input {...register('mobile')} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input {...register('email')} type="email" className="form-input" />
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
            <label className="form-label">Assessment Year</label>
            <input {...register('assessment_year')} className="form-input" placeholder="2024-25" />
          </div>
          <div>
            <label className="form-label">Service Type</label>
            <select {...register('service_type')} className="form-input">
              <option value="">Select</option>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Assign Auditor</label>
            <select {...register('assigned_auditor')} className="form-input">
              <option value="">— Unassigned —</option>
              {auditors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Current Status</label>
            <select {...register('current_status')} className="form-input">
              {['New Client', 'Active', 'Under Processing', 'ITR Filed', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : selected ? 'Update Client' : 'Add Client'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
