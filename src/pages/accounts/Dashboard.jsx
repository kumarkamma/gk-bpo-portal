import { useEffect, useRef, useState } from 'react'
import { CreditCard, TrendingUp, AlertTriangle, CheckCircle, Edit2, IndianRupee } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatCurrency, formatDate } from '../../lib/utils'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import { PAYMENT_STATUSES, PAYMENT_MODES } from '../../lib/constants'
import { PaymentBadge } from '../../components/ui/Badges'
import { useForm } from 'react-hook-form'

const PIE_COLORS = ['#25D366', '#F59E0B', '#DC2626', '#94a3b8']

export default function AccountsDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentPayments, setRecentPayments] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const amountPaid = watch('amount_paid', 0)

  useStaggerAnimation(containerRef)
  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    try {
      const [{ data: payments }, { data: recent }] = await Promise.all([
        supabase.from('payments').select('final_amount, amount_paid, amount_due, payment_status'),
        supabase.from('payments').select(`*, clients(client_name, pan_number)`).order('created_at', { ascending: false }).limit(10),
      ])

      const totalRevenue = payments?.reduce((s, p) => s + (p.final_amount || 0), 0) || 0
      const collected = payments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
      const outstanding = payments?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0

      // Status breakdown for pie
      const statusMap = {}
      payments?.forEach(p => { statusMap[p.payment_status || 'Not Paid'] = (statusMap[p.payment_status || 'Not Paid'] || 0) + 1 })
      setStatusBreakdown(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

      setStats({ totalRevenue, collected, outstanding, totalCount: payments?.length || 0 })
      setRecentPayments(recent || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openEdit(p) {
    setSelected(p)
    Object.entries(p).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  async function onSubmit(values) {
    setSaving(true)
    const finalAmount = selected.final_amount || 0
    const paid = parseFloat(values.amount_paid) || 0
    const due = Math.max(finalAmount - paid, 0)
    let status = 'Not Paid'
    if (paid >= finalAmount) status = 'Fully Paid'
    else if (paid > 0) status = 'Partially Paid'

    await supabase.from('payments').update({
      amount_paid: paid,
      amount_due: due,
      payment_status: status,
      payment_mode: values.payment_mode,
      transaction_id: values.transaction_id,
      payment_date: values.payment_date,
      payment_verified_by: profile.id,
      verified_date: new Date().toISOString().slice(0, 10),
    }).eq('id', selected.id)

    setSaving(false)
    setShowModal(false)
    reset()
    loadDashboard()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" text="Loading dashboard…" /></div>

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item">
        <h1 className="page-title">Accounts Dashboard</h1>
        <p className="page-subtitle">Revenue and payment tracking for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Revenue" value={stats.totalRevenue} icon={IndianRupee} color="navy" prefix="₹" animate={false} />
        <StatCard title="Collected" value={stats.collected} icon={CheckCircle} color="green" prefix="₹" animate={false} />
        <StatCard title="Outstanding" value={stats.outstanding} icon={AlertTriangle} color="burgundy" prefix="₹" animate={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Revenue Status Pie */}
        <div className="table-container p-5 stagger-item">
          <h3 className="text-sm font-bold text-[#0B1026] mb-4">Payment Status Distribution</h3>
          {statusBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusBreakdown.map(({ name, value }, i) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-xs text-slate-600">{name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-slate-400 text-sm text-center py-10">No payment data</p>}
        </div>

        {/* Revenue Summary Cards */}
        <div className="stagger-item lg:col-span-2 space-y-4">
          <div className="table-container p-5">
            <h3 className="text-sm font-bold text-[#0B1026] mb-3">Revenue Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Billed', value: stats.totalRevenue, color: '#0B1026', bg: '#f1f5f9' },
                { label: 'Amount Collected', value: stats.collected, color: '#15803d', bg: '#dcfce7' },
                { label: 'Outstanding Dues', value: stats.outstanding, color: '#dc2626', bg: '#fef2f2' },
                { label: 'Collection Rate', value: stats.totalRevenue ? `${((stats.collected / stats.totalRevenue) * 100).toFixed(1)}%` : '0%', color: '#7c3aed', bg: '#f5f3ff', isPercent: true },
              ].map(({ label, value, color, bg, isPercent }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: bg }}>
                  <span className="text-sm font-medium text-slate-600">{label}</span>
                  <span className="text-sm font-bold" style={{ color }}>{isPercent ? value : formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="table-container stagger-item">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100">
          <CreditCard size={16} className="text-[#D4AF37]" />
          <h3 className="text-sm font-bold text-[#0B1026]">Recent Payments</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Service</th>
              <th>Final Amount</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.length > 0 ? recentPayments.map(p => (
              <tr key={p.id}>
                <td>
                  <p className="font-medium">{p.clients?.client_name || '—'}</p>
                  <p className="text-xs text-slate-400 font-mono">{p.clients?.pan_number}</p>
                </td>
                <td className="text-xs">{p.service_type || '—'}</td>
                <td className="font-semibold">{formatCurrency(p.final_amount)}</td>
                <td className="text-emerald-600 font-semibold">{formatCurrency(p.amount_paid)}</td>
                <td className="text-red-500 font-semibold">{formatCurrency(p.amount_due)}</td>
                <td><PaymentBadge status={p.payment_status} /></td>
                <td className="text-xs text-slate-500">{p.payment_mode || '—'}</td>
                <td className="text-xs text-slate-500">{formatDate(p.payment_date)}</td>
                <td>
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={9} className="text-center py-10 text-slate-400">No payments found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Payment Update Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title="Update Payment" size="md">
        {selected && (
          <>
            <div className="mb-4 p-3 rounded-xl" style={{ background: '#f8f9fc' }}>
              <p className="text-sm font-semibold text-[#0B1026]">{selected.clients?.client_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total Due: <span className="font-semibold text-red-500">{formatCurrency(selected.final_amount)}</span></p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Amount Paid (₹)</label>
                <input {...register('amount_paid')} type="number" className="form-input" />
              </div>
              <div>
                <label className="form-label">Balance Due</label>
                <input value={formatCurrency(Math.max((selected.final_amount || 0) - (parseFloat(amountPaid) || 0), 0))} readOnly className="form-input bg-slate-50 text-red-500 font-semibold" />
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
                <label className="form-label">Payment Date</label>
                <input {...register('payment_date')} type="date" className="form-input" />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Record Payment'}</button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
