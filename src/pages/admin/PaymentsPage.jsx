import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Edit2, Download } from 'lucide-react'
import { useForm } from 'react-hook-form'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { PAYMENT_STATUSES, PAYMENT_MODES, ROLES } from '../../lib/constants'
import { formatCurrency, formatDate } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { PaymentBadge } from '../../components/ui/Badges'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

const PAGE_SIZE = 25

export default function PaymentsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [summary, setSummary] = useState({ total: 0, collected: 0, pending: 0 })

  useStaggerAnimation(containerRef)
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const fee = watch('service_fee', 0)
  const discount = watch('discount', 0)
  const final = (parseFloat(fee) || 0) - (parseFloat(discount) || 0)

  const isAccounts = profile?.role === ROLES.ACCOUNTS
  const canEdit = [ROLES.SUPER_ADMIN, ROLES.ACCOUNTS].includes(profile?.role)

  useEffect(() => { loadPayments(); loadSummary() }, [page, statusFilter])

  async function loadSummary() {
    const { data } = await supabase.from('payments').select('final_amount, amount_paid, amount_due')
    if (data) {
      setSummary({
        total: data.reduce((s, p) => s + (p.final_amount || 0), 0),
        collected: data.reduce((s, p) => s + (p.amount_paid || 0), 0),
        pending: data.reduce((s, p) => s + (p.amount_due || 0), 0),
      })
    }
  }

  async function loadPayments() {
    setLoading(true)
    let query = supabase.from('payments').select(`*, clients(client_name, pan_number)`, { count: 'exact' })
    if (statusFilter) query = query.eq('payment_status', statusFilter)
    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await query.order('payment_date', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setPayments(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  async function onSubmit(values) {
    setSaving(true)
    const finalAmount = (parseFloat(values.service_fee) || 0) - (parseFloat(values.discount) || 0)
    const amountPaid = parseFloat(values.amount_paid) || 0
    const amountDue = Math.max(finalAmount - amountPaid, 0)
    const payload = { ...values, final_amount: finalAmount, amount_due: amountDue, payment_verified_by: profile.id, verified_date: new Date().toISOString() }

    if (selected) await supabase.from('payments').update(payload).eq('id', selected.id)
    else await supabase.from('payments').insert(payload)

    setSaving(false)
    setShowModal(false)
    reset()
    loadPayments()
    loadSummary()
  }

  function openEdit(p) {
    setSelected(p)
    Object.entries(p).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  async function exportExcel() {
    const { data } = await supabase.from('payments').select(`*, clients(client_name)`)
    const ws = XLSX.utils.json_to_sheet(data || [])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payments')
    XLSX.writeFile(wb, `GK_Payments_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Track revenue and payment collections</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="btn-secondary"><Download size={15} /> Export</button>
          {canEdit && <button onClick={() => { setSelected(null); reset(); setShowModal(true) }} className="btn-primary"><Plus size={15} /> Add Payment</button>}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-5 stagger-item">
        {[
          { label: 'Total Revenue', value: summary.total, color: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-700' },
          { label: 'Collected', value: summary.collected, color: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
          { label: 'Outstanding', value: summary.pending, color: 'bg-red-50 border-red-100', text: 'text-red-700' },
        ].map(({ label, value, color, text }) => (
          <div key={label} className={`stat-card border ${color}`}>
            <p className="text-xs font-600 text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-xl font-700 mt-1 ${text}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      <div className="stagger-item flex gap-3 mb-5">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="form-input max-w-xs">
          <option value="">All Payment Statuses</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={6} cols={8} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Invoice</th>
                <th>Final Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Mode</th>
                {canEdit && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? payments.map(p => (
                <tr key={p.id}>
                  <td>
                    <p className="font-500">{p.clients?.client_name || '—'}</p>
                    <p className="text-xs text-slate-400">{p.clients?.pan_number || ''}</p>
                  </td>
                  <td className="text-xs">{p.service_type || '—'}</td>
                  <td className="font-mono text-xs text-slate-500">{p.invoice_number || '—'}</td>
                  <td className="font-600">{formatCurrency(p.final_amount)}</td>
                  <td className="text-emerald-600 font-600">{formatCurrency(p.amount_paid)}</td>
                  <td className="text-red-500 font-600">{formatCurrency(p.amount_due)}</td>
                  <td><PaymentBadge status={p.payment_status} /></td>
                  <td className="text-xs text-slate-500">{p.payment_mode || '—'}</td>
                  {canEdit && (
                    <td>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={canEdit ? 9 : 8} className="text-center py-12 text-slate-400">No payments found</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} pageSize={PAGE_SIZE} totalRows={total} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title={selected ? 'Edit Payment' : 'Add Payment'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Client ID</label>
            <input {...register('client_id')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Service Type</label>
            <input {...register('service_type')} className="form-input" placeholder="ITR Filing" />
          </div>
          <div>
            <label className="form-label">Service Fee (₹)</label>
            <input {...register('service_fee')} type="number" className="form-input" />
          </div>
          <div>
            <label className="form-label">Discount (₹)</label>
            <input {...register('discount')} type="number" className="form-input" defaultValue={0} />
          </div>
          <div>
            <label className="form-label">Final Amount (₹)</label>
            <input value={final} readOnly className="form-input bg-slate-50 font-600 text-[#D4AF37]" />
          </div>
          <div>
            <label className="form-label">Amount Paid (₹)</label>
            <input {...register('amount_paid')} type="number" className="form-input" defaultValue={0} />
          </div>
          <div>
            <label className="form-label">Payment Status</label>
            <select {...register('payment_status')} className="form-input">
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Payment Mode</label>
            <select {...register('payment_mode')} className="form-input">
              <option value="">Select</option>
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Transaction ID</label>
            <input {...register('transaction_id')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Invoice Number</label>
            <input {...register('invoice_number')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Payment Date</label>
            <input {...register('payment_date')} type="date" className="form-input" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
