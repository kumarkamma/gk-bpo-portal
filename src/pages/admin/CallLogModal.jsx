import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Phone, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CALL_STATUSES, INTEREST_STATUSES, LEAD_TEMPERATURES, SERVICES, LEAD_STATUSES } from '../../lib/constants'
import Modal from '../../components/ui/Modal'

const schema = z.object({
  call_status:          z.string().min(1, 'Required'),
  interest_status:      z.string().optional(),
  lead_temperature:     z.string().optional(),
  service_required:     z.string().optional(),
  followup_date:        z.string().optional(),
  followup_time:        z.string().optional(),
  whatsapp_sent:        z.boolean().optional(),
  proposal_sent:        z.boolean().optional(),
  documents_requested:  z.boolean().optional(),
  documents_received:   z.boolean().optional(),
  remarks:              z.string().optional(),
  new_lead_status:      z.string().optional(),
})

export default function CallLogModal({ lead, onClose }) {
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const callStatus = watch('call_status')
  const isConnected = callStatus === 'Connected'

  async function onSubmit(values) {
    setSaving(true)
    const { new_lead_status, ...logData } = values
    await supabase.from('call_logs').insert({
      ...logData,
      lead_id: lead.id,
      agent_id: profile.id,
    })
    if (new_lead_status) {
      await supabase.from('leads').update({
        status: new_lead_status,
        last_contact_date: new Date().toISOString(),
        next_followup_date: values.followup_date || null,
      }).eq('id', lead.id)
    } else if (values.followup_date) {
      await supabase.from('leads').update({
        last_contact_date: new Date().toISOString(),
        next_followup_date: values.followup_date,
      }).eq('id', lead.id)
    }
    setSaving(false)
    onClose()
  }

  const checkboxStyle = { display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, color: '#475569', fontWeight: 500, userSelect: 'none', transition: 'all 0.15s' }

  return (
    <Modal isOpen onClose={onClose} title={`Log Call — ${lead.client_name}`} size="lg">
      {/* Lead info strip */}
      <div style={{ display: 'flex', gap: 20, padding: '14px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#0A1628,#162340)', marginBottom: 20 }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 3 }}>MOBILE</p>
          <p style={{ color: '#D4AF37', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{lead.mobile}</p>
        </div>
        {lead.city && (
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 3 }}>CITY</p>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{lead.city}</p>
          </div>
        )}
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 3 }}>CURRENT STATUS</p>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{lead.status}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Call Status */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label required" style={{ color: '#D4AF37', fontWeight: 700 }}>Call Status</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CALL_STATUSES.map(s => {
                const isSelected = callStatus === s
                const isGood = s === 'Connected'
                const isBad = ['Not Connected', 'Invalid Number', 'Wrong Number'].includes(s)
                return (
                  <label key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', border: `1.5px solid ${isSelected ? (isGood ? '#16A34A' : isBad ? '#DC2626' : '#D4AF37') : '#E2E8F0'}`, background: isSelected ? (isGood ? '#DCFCE7' : isBad ? '#FEE2E2' : 'rgba(212,175,55,0.08)') : '#fff', color: isSelected ? (isGood ? '#16A34A' : isBad ? '#DC2626' : '#B8942E') : '#64748B', fontSize: 12, fontWeight: isSelected ? 700 : 500 }}>
                    <input {...register('call_status')} type="radio" value={s} style={{ display: 'none' }} />
                    {s}
                  </label>
                )
              })}
            </div>
            {errors.call_status && <span className="form-error">Please select a call status</span>}
          </div>

          {/* Connected-only fields */}
          {isConnected && (
            <>
              <div className="form-group">
                <label className="form-label">Interest Status</label>
                <select {...register('interest_status')} className="form-input">
                  <option value="">Select interest</option>
                  {INTEREST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lead Temperature</label>
                <select {...register('lead_temperature')} className="form-input">
                  <option value="">Select temp</option>
                  {LEAD_TEMPERATURES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Service Required</label>
                <select {...register('service_required')} className="form-input">
                  <option value="">Select service</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Follow-up date/time */}
          <div className="form-group">
            <label className="form-label">Follow-Up Date</label>
            <input {...register('followup_date')} type="date" className="form-input" min={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-Up Time</label>
            <input {...register('followup_time')} type="time" className="form-input" />
          </div>

          {/* Update lead status */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Update Lead Status</label>
            <select {...register('new_lead_status')} className="form-input">
              <option value="">— No Change —</option>
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Checkboxes */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <p style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Quick Actions</p>
            {[
              ['whatsapp_sent',       'WhatsApp Sent'],
              ['proposal_sent',       'Proposal Sent'],
              ['documents_requested', 'Documents Requested'],
              ['documents_received',  'Documents Received'],
            ].map(([field, label]) => (
              <label key={field} style={checkboxStyle}>
                <input {...register(field)} type="checkbox" style={{ width: 16, height: 16, accentColor: '#D4AF37', flexShrink: 0 }} />
                {label}
              </label>
            ))}
          </div>

          {/* Remarks */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Remarks / Notes</label>
            <textarea {...register('remarks')} rows={3} className="form-input" style={{ resize: 'vertical' }} placeholder="Add call notes, client responses, next steps…" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 140 }}>
            <Phone size={14} />
            {saving ? 'Saving…' : 'Save Call Log'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
