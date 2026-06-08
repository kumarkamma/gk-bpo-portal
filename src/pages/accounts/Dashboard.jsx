import { useEffect, useRef, useState } from 'react'
import { CreditCard, TrendingUp, AlertTriangle, CheckCircle, Edit2, IndianRupee, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatCurrency, formatDate } from '../../lib/utils'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import { PAYMENT_STATUSES, PAYMENT_MODES } from '../../lib/constants'
import { useForm } from 'react-hook-form'

const PIE_COLORS = ['#16A34A', '#D97706', '#DC2626', '#94A3B8']

const PAYMENT_STATUS_STYLE = {
  'Fully Paid':    { bg: '#DCFCE7', color: '#16A34A' },
  'Partially Paid':{ bg: '#FEF3C7', color: '#D97706' },
  'Not Paid':      { bg: '#FEE2E2', color: '#DC2626' },
  'Refunded':      { bg: '#F1F5F9', color: '#64748B' },
}

export default function AccountsDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [recentPayments, setRecentPayments] = useState([])
  const [statusBreakdown, setStatusBreakdown] = useState([])
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const amountPaid = watch('amount_paid', 0)

  useStaggerAnimation(containerRef)
  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [{ data: payments }, { data: recent }] = await Promise.all([
        supabase.from('payments').select('final_amount, amount_paid, amount_due, payment_status'),
        supabase.from('payments').select('*, clients(client_name, pan_number)').order('created_at', { ascending: false }).limit(12),
      ])

      const totalRevenue = payments?.reduce((s, p) => s + (p.final_amount || 0), 0) || 0
      const collected    = payments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
      const outstanding  = payments?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0

      const statusMap = {}
      payments?.forEach(p => { statusMap[p.payment_status || 'Not Paid'] = (statusMap[p.payment_status || 'Not Paid'] || 0) + 1 })
      setStatusBreakdown(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

      setStats({ totalRevenue, collected, outstanding, totalCount: payments?.length || 0 })
      setRecentPayments(recent || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
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
      amount_paid: paid, amount_due: due, payment_status: status,
      payment_mode: values.payment_mode, transaction_id: values.transaction_id,
      payment_date: values.payment_date, payment_verified_by: profile.id,
      verified_date: new Date().toISOString().slice(0, 10),
    }).eq('id', selected.id)

    setSaving(false)
    setShowModal(false)
    reset()
    loadDashboard()
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}><LoadingSpinner size="lg" text="Loading dashboard…" /></div>

  const collectionRate = stats.totalRevenue ? ((stats.collected / stats.totalRevenue) * 100).toFixed(1) : 0

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="page-header stagger-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="page-title">Accounts Dashboard</p>
          <p className="page-subtitle">Revenue & payment tracking · {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={() => loadDashboard(true)} className="btn btn-outline btn-sm" disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Revenue',      value: formatCurrency(stats.totalRevenue), icon: IndianRupee, color: '#0A1628', bg: '#EFF6FF' },
          { label: 'Amount Collected',   value: formatCurrency(stats.collected),    icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
          { label: 'Outstanding Dues',   value: formatCurrency(stats.outstanding),  icon: AlertTriangle, color: '#DC2626', bg: '#FEE2E2' },
          { label: 'Collection Rate',    value: `${collectionRate}%`,              icon: TrendingUp,  color: '#7C3AED', bg: '#F5F3FF' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card stagger-item">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <p className="stat-card-value font-poppins" style={{ fontSize: typeof value === 'string' && value.length > 10 ? 18 : 26 }}>{value}</p>
            <p className="stat-card-label" style={{ marginTop: 6 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14, marginBottom: 14 }}>
        {/* Pie Chart */}
        <div className="card stagger-item">
          <div className="card-header">
            <p className="card-title">Payment Distribution</p>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {statusBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                      {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {statusBreakdown.map(({ name, value }, i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#475569' }}>{name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No data</p>}
          </div>
        </div>

        {/* Revenue breakdown */}
        <div className="card stagger-item">
          <div className="card-header">
            <p className="card-title">Revenue Summary</p>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, background: '#F5F7FA', padding: '3px 8px', borderRadius: 5 }}>{stats.totalCount} records</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total Billed',       value: formatCurrency(stats.totalRevenue), color: '#0A1628', bg: '#F5F7FA',    border: '#E2E8F0' },
                { label: 'Amount Collected',   value: formatCurrency(stats.collected),    color: '#16A34A', bg: '#DCFCE7',    border: '#BBF7D0' },
                { label: 'Outstanding Dues',   value: formatCurrency(stats.outstanding),  color: '#DC2626', bg: '#FEE2E2',    border: '#FECACA' },
                { label: 'Collection Rate',    value: `${collectionRate}%`,              color: '#7C3AED', bg: '#F5F3FF',    border: '#DDD6FE' },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="table-container stagger-item">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={15} style={{ color: '#C9A84C' }} />
            <p className="table-title">Recent Payments</p>
          </div>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>Last 12 entries</span>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.length > 0 ? recentPayments.map(p => {
              const s = PAYMENT_STATUS_STYLE[p.payment_status] || { bg: '#F1F5F9', color: '#64748B' }
              return (
                <tr key={p.id}>
                  <td>
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{p.clients?.client_name || '—'}</p>
                    <p style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>{p.clients?.pan_number}</p>
                  </td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{p.service_type || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(p.final_amount)}</td>
                  <td style={{ fontWeight: 700, color: '#16A34A' }}>{formatCurrency(p.amount_paid)}</td>
                  <td style={{ fontWeight: 700, color: '#DC2626' }}>{formatCurrency(p.amount_due)}</td>
                  <td><span className="badge" style={{ background: s.bg, color: s.color }}>{p.payment_status || 'Not Paid'}</span></td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{p.payment_mode || '—'}</td>
                  <td style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(p.payment_date)}</td>
                  <td>
                    <button
                      onClick={() => openEdit(p)}
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                    >
                      <Edit2 size={12} />
                    </button>
                  </td>
                </tr>
              )
            }) : (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>No payments found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Update Payment Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title="Update Payment" size="md">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p style={{ fontWeight: 700, color: '#0A1628', fontSize: 14 }}>{selected.clients?.client_name}</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Total Due: <span style={{ fontWeight: 700, color: '#DC2626' }}>{formatCurrency(selected.final_amount)}</span></p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Amount Paid (₹)</label>
                <input {...register('amount_paid')} type="number" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Balance Due</label>
                <input value={formatCurrency(Math.max((selected.final_amount || 0) - (parseFloat(amountPaid) || 0), 0))} readOnly className="form-input" style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />
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
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}
