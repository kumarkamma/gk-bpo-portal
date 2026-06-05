import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Edit2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { FILING_STATUSES, ROLES } from '../../lib/constants'
import { formatDate } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

const PAGE_SIZE = 25

export default function FilingsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [filings, setFilings] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useStaggerAnimation(containerRef)
  const { register, handleSubmit, reset, setValue } = useForm()
  const isAuditor = profile?.role === ROLES.AUDITOR

  useEffect(() => { loadFilings() }, [page, search])

  async function loadFilings() {
    setLoading(true)
    let query = supabase.from('filings').select(`*, clients(client_name, pan_number, mobile)`, { count: 'exact' })
    if (isAuditor) query = query.eq('filing_completed_by', profile.id)
    if (search) query = query.ilike('ack_number', `%${search}%`)

    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setFilings(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  async function onSubmit(values) {
    setSaving(true)
    if (selected) {
      await supabase.from('filings').update({ ...values, reviewed_by: profile.id }).eq('id', selected.id)
    } else {
      await supabase.from('filings').insert({ ...values, filing_completed_by: profile.id })
    }
    setSaving(false)
    setShowModal(false)
    reset()
    loadFilings()
  }

  function openEdit(f) {
    setSelected(f)
    Object.entries(f).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  const statusColors = {
    'Documents Pending': 'bg-yellow-100 text-yellow-700',
    'Under Review': 'bg-blue-100 text-blue-700',
    'Under Processing': 'bg-purple-100 text-purple-700',
    'Filed': 'bg-green-100 text-green-700',
    'Completed': 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">ITR Filings</h1>
          <p className="page-subtitle">Manage and track return filings</p>
        </div>
        <button onClick={() => { setSelected(null); reset(); setShowModal(true) }} className="btn-primary">
          <Plus size={15} /> New Filing
        </button>
      </div>

      <div className="stagger-item flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by acknowledgement no…" className="form-input pl-9" />
        </div>
      </div>

      {loading ? <TableSkeleton rows={6} cols={7} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Assessment Year</th>
                <th>ITR Type</th>
                <th>Filing Date</th>
                <th>Ack Number</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filings.length > 0 ? filings.map(f => (
                <tr key={f.id}>
                  <td>
                    <p className="font-500">{f.clients?.client_name || '—'}</p>
                    <p className="text-xs text-slate-400">{f.clients?.pan_number || ''}</p>
                  </td>
                  <td>{f.assessment_year || '—'}</td>
                  <td>{f.itr_type || '—'}</td>
                  <td className="text-xs text-slate-500">{formatDate(f.filing_date)}</td>
                  <td className="font-mono text-xs">{f.ack_number || '—'}</td>
                  <td><span className={`badge ${statusColors[f.filing_status] || 'bg-gray-100 text-gray-600'}`}>{f.filing_status || '—'}</span></td>
                  <td>
                    <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No filings found</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={total} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title={selected ? 'Update Filing' : 'New Filing'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Client ID</label>
            <input {...register('client_id')} className="form-input" placeholder="Client UUID" />
          </div>
          <div>
            <label className="form-label">Assessment Year</label>
            <input {...register('assessment_year')} className="form-input" placeholder="2024-25" />
          </div>
          <div>
            <label className="form-label">ITR Type</label>
            <select {...register('itr_type')} className="form-input">
              <option value="">Select</option>
              {['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Filing Status</label>
            <select {...register('filing_status')} className="form-input">
              {FILING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Filing Date</label>
            <input {...register('filing_date')} type="date" className="form-input" />
          </div>
          <div>
            <label className="form-label">Acknowledgement Number</label>
            <input {...register('ack_number')} className="form-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Remarks</label>
            <textarea {...register('remarks')} rows={2} className="form-input resize-none" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Filing'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
