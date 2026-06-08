import { useEffect, useRef, useState } from 'react'
import { FileText, CheckCircle, Clock, Users, Edit2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDate } from '../../lib/utils'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import { FILING_STATUSES } from '../../lib/constants'
import { useForm } from 'react-hook-form'

const STATUS_STYLE = {
  'Documents Pending': { bg: '#FEF3C7', color: '#D97706' },
  'Documents Received': { bg: '#DBEAFE', color: '#1D4ED8' },
  'Under Review':       { bg: '#EFF6FF', color: '#2563EB' },
  'Under Processing':   { bg: '#F5F3FF', color: '#7C3AED' },
  'Filed':              { bg: '#DCFCE7', color: '#16A34A' },
  'Completed':          { bg: '#DCFCE7', color: '#15803D' },
}

export default function AuditorDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [pendingFilings, setPendingFilings] = useState([])
  const [recentFilings, setRecentFilings] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { register, handleSubmit, reset, setValue } = useForm()

  useStaggerAnimation(containerRef)
  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [
        { count: totalClients },
        { count: pendingCount },
        { count: filedCount },
        { data: pending },
        { data: recent },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('assigned_auditor', profile.id),
        supabase.from('filings').select('*', { count: 'exact', head: true }).eq('filing_completed_by', profile.id).not('filing_status', 'in', '("Filed","Completed")'),
        supabase.from('filings').select('*', { count: 'exact', head: true }).eq('filing_completed_by', profile.id).in('filing_status', ['Filed', 'Completed']),
        supabase.from('filings').select('*, clients(client_name, pan_number)').eq('filing_completed_by', profile.id).not('filing_status', 'in', '("Filed","Completed")').order('created_at', { ascending: false }).limit(10),
        supabase.from('filings').select('*, clients(client_name, pan_number)').eq('filing_completed_by', profile.id).in('filing_status', ['Filed', 'Completed']).order('filing_date', { ascending: false }).limit(6),
      ])
      setStats({ totalClients: totalClients || 0, pendingFilings: pendingCount || 0, filedReturns: filedCount || 0 })
      setPendingFilings(pending || [])
      setRecentFilings(recent || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function openUpdate(filing) {
    setSelected(filing)
    Object.entries(filing).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  async function onSubmit(values) {
    setSaving(true)
    await supabase.from('filings').update({
      filing_status: values.filing_status,
      ack_number: values.ack_number,
      filing_date: values.filing_date,
      remarks: values.remarks,
    }).eq('id', selected.id)
    setSaving(false)
    setShowModal(false)
    reset()
    loadDashboard()
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}><LoadingSpinner size="lg" text="Loading dashboard…" /></div>

  const KPI = [
    { label: 'Assigned Clients', value: stats.totalClients,   icon: Users,        color: '#0A1628', bg: '#EFF6FF' },
    { label: 'Pending Filings',  value: stats.pendingFilings, icon: Clock,        color: '#D97706', bg: '#FEF3C7' },
    { label: 'Filed Returns',    value: stats.filedReturns,   icon: CheckCircle,  color: '#16A34A', bg: '#DCFCE7' },
  ]

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="page-header stagger-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="page-title">Auditor Dashboard</p>
          <p className="page-subtitle">Welcome, {profile?.name?.split(' ')[0]} — your filing workload overview</p>
        </div>
        <button onClick={() => loadDashboard(true)} className="btn btn-outline btn-sm" disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {KPI.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card stagger-item">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <p className="stat-card-value font-poppins">{(value || 0).toLocaleString()}</p>
            <p className="stat-card-label" style={{ marginTop: 6 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Pending Filings */}
        <div className="card stagger-item">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={15} style={{ color: '#D97706' }} />
              <p className="card-title">Pending Filings</p>
            </div>
            {stats.pendingFilings > 0 && (
              <span className="badge" style={{ background: '#FEF3C7', color: '#D97706' }}>{stats.pendingFilings} pending</span>
            )}
          </div>
          <div style={{ padding: '4px 0' }}>
            {pendingFilings.length > 0 ? pendingFilings.map(f => {
              const s = STATUS_STYLE[f.filing_status] || { bg: '#F1F5F9', color: '#64748B' }
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #F8FAFC', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{f.clients?.client_name || '—'}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginTop: 2 }}>{f.clients?.pan_number || ''} · AY {f.assessment_year}</p>
                    <span className="badge" style={{ background: s.bg, color: s.color, marginTop: 6, display: 'inline-flex' }}>{f.filing_status}</span>
                  </div>
                  <button
                    onClick={() => openUpdate(f)}
                    style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )
            }) : (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No pending filings 🎉</div>
            )}
          </div>
        </div>

        {/* Recently Filed */}
        <div className="table-container stagger-item">
          <div className="table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={15} style={{ color: '#16A34A' }} />
              <p className="table-title">Recently Filed</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>AY</th>
                <th>ACK No.</th>
                <th>Filed On</th>
              </tr>
            </thead>
            <tbody>
              {recentFilings.length > 0 ? recentFilings.map(f => (
                <tr key={f.id}>
                  <td>
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{f.clients?.client_name}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{f.clients?.pan_number}</p>
                  </td>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{f.assessment_year}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{f.ack_number || '—'}</td>
                  <td style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(f.filing_date)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>No filings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Filing Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title="Update Filing Status" size="md">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p style={{ fontWeight: 700, color: '#0A1628', fontSize: 14 }}>{selected?.clients?.client_name}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginTop: 3 }}>{selected?.clients?.pan_number} · AY {selected?.assessment_year}</p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Filing Status</label>
                <select {...register('filing_status')} className="form-input">
                  {FILING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Acknowledgement Number</label>
                <input {...register('ack_number')} className="form-input" placeholder="Leave blank if not filed yet" />
              </div>
              <div className="form-group">
                <label className="form-label">Filing Date</label>
                <input {...register('filing_date')} type="date" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea {...register('remarks')} rows={2} className="form-input" style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Update Status'}</button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}
