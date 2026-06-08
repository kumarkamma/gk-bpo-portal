import { useEffect, useRef, useState } from 'react'
import { Calendar, Phone, Clock, AlertTriangle, RefreshCw, Plus, Edit2, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDate } from '../../lib/utils'
import { LeadStatusBadge } from '../../components/ui/Badges'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import CallLogModal from './CallLogModal'
import Modal from '../../components/ui/Modal'
import { LEAD_STATUSES } from '../../lib/constants'

const FILTERS = [
  { key: 'today',    label: 'Today',     icon: Calendar },
  { key: 'tomorrow', label: 'Tomorrow',  icon: Clock },
  { key: 'week',     label: 'This Week', icon: Calendar },
  { key: 'overdue',  label: 'Overdue',   icon: AlertTriangle },
  { key: 'all',      label: 'All',       icon: CheckCircle },
]

export default function FollowUpsPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('today')
  const [callLead, setCallLead] = useState(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleTarget, setScheduleTarget] = useState(null)
  const [myLeads, setMyLeads] = useState([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, watch } = useForm()
  const selectedLeadId = watch('lead_id')

  useStaggerAnimation(containerRef)
  useEffect(() => { loadFollowUps() }, [filter])

  async function loadFollowUps() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

    let q = supabase.from('leads').select('*').not('next_followup_date', 'is', null)
    if (profile?.role === 'bpo_agent') q = q.eq('assigned_bpo', profile.id)

    if (filter === 'today')    q = q.eq('next_followup_date', today)
    else if (filter === 'tomorrow') q = q.eq('next_followup_date', tomorrow)
    else if (filter === 'week') q = q.gte('next_followup_date', today).lte('next_followup_date', weekEnd)
    else if (filter === 'overdue') q = q.lt('next_followup_date', today)

    const { data } = await q.order('next_followup_date', { ascending: true })
    setFollowups(data || [])
    setLoading(false)
  }

  async function loadMyLeads() {
    let q = supabase.from('leads').select('id,client_name,mobile,status').order('created_at', { ascending: false }).limit(100)
    if (profile?.role === 'bpo_agent') q = q.eq('assigned_bpo', profile.id)
    const { data } = await q
    setMyLeads(data || [])
  }

  const openSchedule = async (lead = null) => {
    await loadMyLeads()
    setScheduleTarget(lead)
    if (lead) {
      setValue('lead_id', lead.id)
      setValue('next_followup_date', lead.next_followup_date || '')
      setValue('status', lead.status || '')
    } else {
      reset()
    }
    setShowScheduleModal(true)
  }

  async function onSchedule(values) {
    setSaving(true)
    const targetId = scheduleTarget ? scheduleTarget.id : values.lead_id
    await supabase.from('leads').update({
      next_followup_date: values.next_followup_date,
      status: values.status || undefined,
    }).eq('id', targetId)
    setSaving(false)
    setShowScheduleModal(false)
    setScheduleTarget(null)
    reset()
    loadFollowUps()
  }

  const today = new Date().toISOString().slice(0, 10)

  const FILTER_STYLE = (active, isOverdue) => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '10px 18px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
    border: `1.5px solid ${active ? (isOverdue ? '#A11D4A' : '#D4AF37') : '#E2E8F0'}`,
    background: active ? (isOverdue ? 'rgba(161,29,74,0.07)' : 'rgba(212,175,55,0.08)') : '#fff',
    color: active ? (isOverdue ? '#A11D4A' : '#B8942E') : '#64748B',
    fontSize: 13, fontWeight: 700,
  })

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-title">Follow-Ups</p>
          <p className="page-subtitle">{followups.length} follow-up{followups.length !== 1 ? 's' : ''} — {FILTERS.find(f => f.key === filter)?.label}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={loadFollowUps}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-gold" onClick={() => openSchedule()}>
            <Plus size={14} /> Schedule Follow-Up
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setFilter(key)} style={FILTER_STYLE(filter === key, key === 'overdue')}>
            <Icon size={14} />
            {label}
            {key === 'overdue' && followups.length > 0 && filter === 'overdue' && (
              <span style={{ background: '#A11D4A', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10, marginLeft: 2 }}>
                {followups.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? <TableSkeleton rows={6} cols={6} /> : (
        <div className="table-container stagger-item">
          {followups.length === 0 ? (
            <div style={{ padding: '72px 24px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Calendar size={28} style={{ color: '#CBD5E1' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>
                {filter === 'today' ? 'No follow-ups due today 🎉' : `No follow-ups for ${FILTERS.find(f => f.key === filter)?.label}`}
              </p>
              <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>Schedule follow-ups from leads to see them here</p>
              <button className="btn btn-gold" onClick={() => openSchedule()}>
                <Plus size={14} /> Schedule Follow-Up
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Follow-Up Date</th>
                  <th>Days</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {followups.map((l, i) => {
                  const isOverdue = l.next_followup_date < today
                  const isToday = l.next_followup_date === today
                  const diffDays = Math.ceil((new Date(l.next_followup_date) - new Date(today)) / 86400000)

                  return (
                    <tr key={l.id} style={{ background: isOverdue ? 'rgba(161,29,74,0.025)' : isToday ? 'rgba(212,175,55,0.03)' : 'transparent' }}>
                      <td style={{ color: '#CBD5E1', fontSize: 11 }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: isOverdue ? 'linear-gradient(135deg,#A11D4A,#8a1840)' : 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOverdue ? '#fff' : '#D4AF37', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                            {l.client_name?.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{l.client_name}</p>
                            {l.city && <p style={{ fontSize: 11, color: '#94A3B8' }}>{l.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#475569' }}>{l.mobile}</td>
                      <td><LeadStatusBadge status={l.status} /></td>
                      <td>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: isOverdue ? '#A11D4A' : isToday ? '#D4AF37' : '#0A1628' }}>
                            {formatDate(l.next_followup_date)}
                          </p>
                          {isOverdue && <p style={{ fontSize: 10, color: '#A11D4A', fontWeight: 600, marginTop: 1 }}>OVERDUE</p>}
                          {isToday && <p style={{ fontSize: 10, color: '#D4AF37', fontWeight: 600, marginTop: 1 }}>TODAY</p>}
                        </div>
                      </td>
                      <td>
                        {isOverdue ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#A11D4A', background: '#FFF1F2', padding: '3px 8px', borderRadius: 5 }}>
                            {Math.abs(diffDays)}d overdue
                          </span>
                        ) : isToday ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', padding: '3px 8px', borderRadius: 5 }}>
                            Today
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#64748B' }}>in {diffDays}d</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => setCallLead(l)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#DCFCE7', color: '#16A34A', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#BBF7D0'}
                            onMouseLeave={e => e.currentTarget.style.background = '#DCFCE7'}
                          >
                            <Phone size={13} /> Call Now
                          </button>
                          <button
                            onClick={() => openSchedule(l)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer', background: '#fff', color: '#64748B', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.color = '#B8942E' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B' }}
                          >
                            <Edit2 size={12} /> Reschedule
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Schedule Follow-Up Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => { setShowScheduleModal(false); setScheduleTarget(null); reset() }}
        title={scheduleTarget ? `Reschedule — ${scheduleTarget.client_name}` : 'Schedule Follow-Up'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSchedule)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Lead selector (only if not editing existing) */}
          {!scheduleTarget && (
            <div className="form-group">
              <label className="form-label required">Select Lead</label>
              <select {...register('lead_id', { required: true })} className="form-input">
                <option value="">— Select a lead —</option>
                {myLeads.map(l => (
                  <option key={l.id} value={l.id}>{l.client_name} · {l.mobile}</option>
                ))}
              </select>
            </div>
          )}

          {scheduleTarget && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{scheduleTarget.client_name}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', marginTop: 3 }}>{scheduleTarget.mobile} · {scheduleTarget.city || ''}</p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label required">Follow-Up Date</label>
            <input {...register('next_followup_date', { required: true })} type="date" className="form-input" min={new Date().toISOString().slice(0, 10)} />
          </div>

          <div className="form-group">
            <label className="form-label">Update Lead Status</label>
            <select {...register('status')} className="form-input">
              <option value="">— No change —</option>
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowScheduleModal(false); setScheduleTarget(null); reset() }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Calendar size={13} />
              {saving ? 'Saving…' : scheduleTarget ? 'Reschedule' : 'Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {callLead && <CallLogModal lead={callLead} onClose={() => { setCallLead(null); loadFollowUps() }} />}
    </div>
  )
}
