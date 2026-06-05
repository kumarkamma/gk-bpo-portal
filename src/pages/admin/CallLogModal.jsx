import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CALL_STATUSES, INTEREST_STATUSES, LEAD_TEMPERATURES, SERVICES, LEAD_STATUSES } from '../../lib/constants'
import Modal from '../../components/ui/Modal'

const schema = z.object({
  call_status: z.string().min(1),
  interest_status: z.string().optional(),
  lead_temperature: z.string().optional(),
  service_required: z.string().optional(),
  followup_date: z.string().optional(),
  followup_time: z.string().optional(),
  whatsapp_sent: z.boolean().optional(),
  proposal_sent: z.boolean().optional(),
  documents_requested: z.boolean().optional(),
  documents_received: z.boolean().optional(),
  remarks: z.string().optional(),
  new_lead_status: z.string().optional(),
})

export default function CallLogModal({ lead, onClose }) {
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const callStatus = watch('call_status')

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
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title={`Call Log — ${lead.client_name}`} size="lg">
      <div className="mb-4 p-3 bg-slate-50 rounded-lg flex gap-4 text-sm">
        <div><span className="text-slate-400 text-xs">Mobile</span><p className="font-600">{lead.mobile}</p></div>
        <div><span className="text-slate-400 text-xs">City</span><p className="font-600">{lead.city || '—'}</p></div>
        <div><span className="text-slate-400 text-xs">Current Status</span><p className="font-600">{lead.status}</p></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Call Status *</label>
          <select {...register('call_status')} className="form-input">
            <option value="">Select status</option>
            {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.call_status && <p className="text-xs text-red-500 mt-1">Required</p>}
        </div>

        {callStatus === 'Connected' && (
          <>
            <div>
              <label className="form-label">Interest Status</label>
              <select {...register('interest_status')} className="form-input">
                <option value="">Select</option>
                {INTEREST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Lead Temperature</label>
              <select {...register('lead_temperature')} className="form-input">
                <option value="">Select</option>
                {LEAD_TEMPERATURES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Service Required</label>
              <select {...register('service_required')} className="form-input">
                <option value="">Select service</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="form-label">Follow-Up Date</label>
          <input {...register('followup_date')} type="date" className="form-input" />
        </div>
        <div>
          <label className="form-label">Follow-Up Time</label>
          <input {...register('followup_time')} type="time" className="form-input" />
        </div>
        <div>
          <label className="form-label">Update Lead Status</label>
          <select {...register('new_lead_status')} className="form-input">
            <option value="">— No Change —</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['whatsapp_sent', 'WhatsApp Sent'],
            ['proposal_sent', 'Proposal Sent'],
            ['documents_requested', 'Docs Requested'],
            ['documents_received', 'Docs Received'],
          ].map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input {...register(field)} type="checkbox" className="w-4 h-4 accent-[#D4AF37]" />
              {label}
            </label>
          ))}
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">Remarks</label>
          <textarea {...register('remarks')} rows={2} className="form-input resize-none" placeholder="Add call notes…" />
        </div>
        <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Call Log'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
