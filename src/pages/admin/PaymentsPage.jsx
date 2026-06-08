import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Search, Edit2, Download, CreditCard, X, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { PAYMENT_STATUSES, PAYMENT_MODES, ROLES } from '../../lib/constants'
import { formatCurrency, formatDate, logAudit } from '../../lib/utils'
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
  const [clients, setClients] = useState([])
  const [summary, setSummary] = useState({ total: 0, collected: 0, pending: 0 })

  useStaggerAnimation(containerRef)
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const fee = watch('service_fee', 0)
  const discount = watch('discount', 0)
  const amountPaid = watch('amount_paid', 0)
  const finalAmt = Math.max((parseFloat(fee) || 0) - (parseFloat(discount) || 0), 0)
  const balanceDue = Math.max(finalAmt - (parseFloat(amountPaid) || 0), 0)

  const canEdit = [ROLES.SUPER_ADMIN, ROLES.ACCOUNTS].includes(profile?.role)

  useEffect(() => { loadClients(); loadSummary() }, [])
  useEffect(() => { loadPayments() }, [page, statusFilter])

  const loadClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('id,client_name,pan_number').order('client_name').limit(300)
    setClients(data || [])
  }, [])

  async function loadSummary() {
    const { data } = await supabase.from('payments').select('final_amount,amount_paid,amount_due')
    if (data) setSummary({
      total: data.reduce((s, p) => s + (p.final_amount || 0), 0),
      collected: data.reduce((s, p) => s + (p.amount_paid || 0), 0),
      pending: data.reduce((s, p) => s + (p.amount_due || 0), 0),
    })
  }

  const loadPayments = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('payments').select('*, clients(client_name,pan_number)', { count: 'exact' })
    if (statusFilter) q = q.eq('payment_status', statusFilter)
    const from = (page - 1) * PAGE_SIZE
    const { data, count } = await q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
    setPayments(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [page, statusFilter])

  async function onSubmit(values) {
    setSaving(true)
    const finalAmount = Math.max((parseFloat(values.service_fee) || 0) - (parseFloat(values.discount) || 0), 0)
    const paid = parseFloat(values.amount_paid) || 0
    const due = Math.max(finalAmount - paid, 0)
    let status = 'Not Paid'
    if (paid >= finalAmount && finalAmount > 0) status = 'Fully Paid'
    else if (paid > 0) status = 'Partially Paid'

    const payload = { ...values, final_amount: finalAmount, amount_due: due, payment_status: status, payment_verified_by: profile.id, verified_date: new Date().toISOString().slice(0, 10) }

    if (selected) {
      await supabase.from('payments').update(payload).eq('id', selected.id)
      await logAudit(profile.id, 'UPDATE', 'payments', selected.id, selected, payload)
    } else {
      const { data } = await supabase.from('payments').insert(payload).select().single()
      if (data) await logAudit(profile.id, 'INSERT', 'payments', data.id, null, data)
    }
    setSaving(false)
    setShowModal(false)
    setSelected(null)
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
    const { data } = await supabase.from('payments').select('*, clients(client_name,pan_number)')
    if (!data?.length) return
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payments')
    XLSX.writeFile(wb, `GK_Payments_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const SUMMARY_CARDS = [
    { label: 'Total Revenue',    value: formatCurrency(summary.total),     color: '#0A1628', bg: '#EFF6FF' },
    { label: 'Amount Collected', value: formatCurrency(summary.collected),  color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Outstanding Dues', value: formatCurrency(summary.pending),    color: '#DC2626', bg: '#FEE2E2' },
  ]

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-title">Payments</p>
          <p className="page-subtitle">Track revenue and payment collections</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>
            <Download size={13} /> Export
          </button>
          {canEdit && (
            <button className="btn btn-gold" onClick={() => { setSelected(null); reset(); setShowModal(true) }}>
              <Plus size={14} /> Add Payment
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stagger-item" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {SUMMARY_CARDS.map(({ label, value, color, bg }) => (
          <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
            <p className="stat-card-label">{label}</p>
            <p className="stat-card-value font-poppins" style={{ color, fontSize: 20, marginTop: 6 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="form-input" style={{ minWidth: 200 }}>
          <option value="">All Payment Statuses</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {statusFilter && (
          <button className="btn btn-outline btn-sm" onClick={() => { setStatusFilter(''); setPage(1) }}>
            <X size={12} /> Clear
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={loadPayments} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={7} cols={9} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Client</th>
                <th>Service</th>
                <th>Invoice</th>
                <th>Final Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Mode</th>
                <th>Date</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? payments.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: '#CBD5E1', fontSize: 11 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {p.clients?.client_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{p.clients?.client_name || '—'}</p>
                        <p style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>{p.clients?.pan_number || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{p.service_type || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>{p.invoice_number || '—'}</td>
                  <td style={{ fontWeight: 700, color: '#0A1628' }}>{formatCurrency(p.final_amount)}</td>
                  <td style={{ fontWeight: 700, color: '#16A34A' }}>{formatCurrency(p.amount_paid)}</td>
                  <td style={{ fontWeight: 700, color: p.amount_due > 0 ? '#DC2626' : '#16A34A' }}>{formatCurrency(p.amount_due)}</td>
                  <td><PaymentBadge status={p.payment_status} /></td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{p.payment_mode || '—'}</td>
                  <td style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(p.payment_date)}</td>
                  {canEdit && (
                    <td>
                      <button
                        onClick={() => openEdit(p)}
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
                  <td colSpan={canEdit ? 11 : 10} style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={24} style={{ color: '#CBD5E1' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>No payments found</p>
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
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelected(null); reset() }} title={selected ? 'Edit Payment' : 'Add Payment'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Client</label>
              <select {...register('client_id')} className="form-input">
                <option value="">— Select Client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}{c.pan_number ? ` · ${c.pan_number}` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Service Type</label>
              <input {...register('service_type')} className="form-input" placeholder="ITR Filing" />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Number</label>
              <input {...register('invoice_number')} className="form-input" placeholder="INV-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Service Fee (₹)</label>
              <input {...register('service_fee')} type="number" className="form-input" defaultValue={0} />
            </div>
            <div className="form-group">
              <label className="form-label">Discount (₹)</label>
              <input {...register('discount')} type="number" className="form-input" defaultValue={0} />
            </div>
            <div className="form-group">
              <label className="form-label">Final Amount (₹)</label>
              <input value={formatCurrency(finalAmt)} readOnly className="form-input" style={{ background: '#F8FAFC', color: '#D4AF37', fontWeight: 700 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount Paid (₹)</label>
              <input {...register('amount_paid')} type="number" className="form-input" defaultValue={0} />
            </div>
            <div className="form-group">
              <label className="form-label">Balance Due (₹)</label>
              <input value={formatCurrency(balanceDue)} readOnly className="form-input" style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select {...register('payment_mode')} className="form-input">
                <option value="">Select mode</option>
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Transaction ID</label>
              <input {...register('transaction_id')} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input {...register('payment_date')} type="date" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Receipt Number</label>
              <input {...register('receipt_number')} className="form-input" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); reset() }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : selected ? 'Update Payment' : 'Save Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
