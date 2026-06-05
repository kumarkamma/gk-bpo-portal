import { useEffect, useRef, useState } from 'react'
import { FileText, CheckCircle, Clock, Users, Edit2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDate } from '../../lib/utils'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import { FILING_STATUSES } from '../../lib/constants'
import { useForm } from 'react-hook-form'

export default function AuditorDashboard() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingFilings, setPendingFilings] = useState([])
  const [recentFilings, setRecentFilings] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, setValue } = useForm()

  useStaggerAnimation(containerRef)
  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
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
        supabase.from('filings').select(`*, clients(client_name, pan_number)`).eq('filing_completed_by', profile.id).not('filing_status', 'in', '("Filed","Completed")').order('created_at', { ascending: false }).limit(8),
        supabase.from('filings').select(`*, clients(client_name, pan_number)`).eq('filing_completed_by', profile.id).in('filing_status', ['Filed', 'Completed']).order('filing_date', { ascending: false }).limit(5),
      ])

      setStats({
        totalClients: totalClients || 0,
        pendingFilings: pendingCount || 0,
        filedReturns: filedCount || 0,
      })
      setPendingFilings(pending || [])
      setRecentFilings(recent || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openUpdate(filing) {
    setSelected(filing)
    Object.entries(filing).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  async function onSubmit(values) {
    setSaving(true)
    await supabase.from('filings').update({ filing_status: values.filing_status, ack_number: values.ack_number, filing_date: values.filing_date, remarks: values.remarks }).eq('id', selected.id)
    setSaving(false)
    setShowModal(false)
    reset()
    loadDashboard()
  }

  const statusColors = {
    'Documents Pending': 'bg-yellow-100 text-yellow-700',
    'Under Review': 'bg-blue-100 text-blue-700',
    'Under Processing': 'bg-purple-100 text-purple-700',
    'Filed': 'bg-green-100 text-green-700',
    'Completed': 'bg-emerald-100 text-emerald-700',
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" text="Loading dashboard…" /></div>

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item">
        <h1 className="page-title">Auditor Dashboard</h1>
        <p className="page-subtitle">Welcome, {profile?.name} — your filing workload overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Assigned Clients" value={stats.totalClients} icon={Users} color="navy" />
        <StatCard title="Pending Filings" value={stats.pendingFilings} icon={Clock} color="orange" />
        <StatCard title="Filed Returns" value={stats.filedReturns} icon={CheckCircle} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Filings */}
        <div className="table-container stagger-item">
          <div className="flex items-center gap-2 p-4 border-b border-slate-100">
            <Clock size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-[#0B1026]">Pending Filings</h3>
            {stats.pendingFilings > 0 && <span className="ml-auto badge bg-amber-100 text-amber-700">{stats.pendingFilings} pending</span>}
          </div>
          <div className="divide-y divide-slate-50">
            {pendingFilings.length > 0 ? pendingFilings.map(f => (
              <div key={f.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-sm text-[#0B1026]">{f.clients?.client_name || '—'}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{f.clients?.pan_number || ''} · AY {f.assessment_year}</p>
                  <span className={`badge mt-1.5 ${statusColors[f.filing_status] || 'bg-gray-100 text-gray-600'}`}>{f.filing_status}</span>
                </div>
                <button
                  onClick={() => openUpdate(f)}
                  className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 size={15} />
                </button>
              </div>
            )) : (
              <div className="py-12 text-center text-slate-400 text-sm">No pending filings 🎉</div>
            )}
          </div>
        </div>

        {/* Recently Filed */}
        <div className="table-container stagger-item">
          <div className="flex items-center gap-2 p-4 border-b border-slate-100">
            <CheckCircle size={16} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-[#0B1026]">Recently Filed</h3>
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
                    <p className="font-medium text-sm">{f.clients?.client_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{f.clients?.pan_number}</p>
                  </td>
                  <td className="text-xs">{f.assessment_year}</td>
                  <td className="font-mono text-xs text-slate-500">{f.ack_number || '—'}</td>
                  <td className="text-xs text-slate-500">{formatDate(f.filing_date)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">No filings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Filing Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title="Update Filing Status" size="md">
        <div className="mb-4 p-3 rounded-xl" style={{ background: '#f8f9fc' }}>
          <p className="text-sm font-semibold text-[#0B1026]">{selected?.clients?.client_name}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{selected?.clients?.pan_number} · AY {selected?.assessment_year}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">Filing Status</label>
            <select {...register('filing_status')} className="form-input">
              {FILING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Acknowledgement Number</label>
            <input {...register('ack_number')} className="form-input" placeholder="Leave blank if not filed yet" />
          </div>
          <div>
            <label className="form-label">Filing Date</label>
            <input {...register('filing_date')} type="date" className="form-input" />
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea {...register('remarks')} rows={2} className="form-input resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Update Status'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
