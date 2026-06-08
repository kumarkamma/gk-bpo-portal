import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Phone, Shield, Key, Save, Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getInitials } from '../lib/utils'

const profileSchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Enter your current password'),
  newPassword:     z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  supervisor:  'Supervisor',
  bpo_agent:   'BPO Agent',
  auditor:     'Auditor',
  accounts:    'Accounts',
}

const ROLE_STYLE = {
  super_admin: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  supervisor:  { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  bpo_agent:   { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  auditor:     { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  accounts:    { bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const rs = ROLE_STYLE[profile?.role] || { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' }

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: profile?.name || '', phone: profile?.phone || '' },
  })

  const pwForm = useForm({ resolver: zodResolver(passwordSchema) })

  async function onProfileSave(values) {
    setProfileError('')
    setProfileSaved(false)
    const { error } = await supabase.from('users').update({
      name: values.name,
      phone: values.phone || null,
    }).eq('id', profile.id)
    if (error) { setProfileError(error.message); return }
    await refreshProfile()   // update sidebar/topbar immediately
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  async function onPasswordChange(values) {
    setPwError('')
    setPwSaved(false)
    // Re-authenticate first
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: values.currentPassword,
    })
    if (authErr) { setPwError('Current password is incorrect.'); return }

    const { error } = await supabase.auth.updateUser({ password: values.newPassword })
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    pwForm.reset()
    setTimeout(() => setPwSaved(false), 4000)
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <p className="page-title">My Profile</p>
        <p className="page-subtitle">Manage your account details and security settings</p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} style={{ color: '#D4AF37' }} />
            <p className="card-title">Profile Information</p>
          </div>
        </div>
        <div className="card-body">
          {/* Avatar + role banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: '20px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #0A1628, #162340)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-30%', right: '-5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(212,175,55,0.07) 0%,transparent 70%)' }} />
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #D4AF37, #B8942E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: '#0A1628',
              fontFamily: "'Poppins',sans-serif",
              border: '3px solid rgba(212,175,55,0.3)',
              boxShadow: '0 0 0 6px rgba(212,175,55,0.08)',
            }}>
              {getInitials(profile?.name)}
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: "'Poppins',sans-serif", lineHeight: 1.2 }}>{profile?.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 4 }}>{profile?.email}</p>
              <span style={{ display: 'inline-block', marginTop: 8, padding: '3px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>
                {ROLE_LABELS[profile?.role] || profile?.role}
              </span>
            </div>
          </div>

          {/* Alerts */}
          {profileSaved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
              <CheckCircle size={14} style={{ color: '#16A34A' }} />
              <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>Profile updated successfully</span>
            </div>
          )}
          {profileError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#FEE2E2', border: '1px solid #FECACA' }}>
              <AlertCircle size={14} style={{ color: '#DC2626' }} />
              <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>{profileError}</span>
            </div>
          )}

          <form onSubmit={profileForm.handleSubmit(onProfileSave)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label required">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input {...profileForm.register('name')} className={`form-input ${profileForm.formState.errors.name ? 'error' : ''}`} style={{ paddingLeft: 34 }} placeholder="Your full name" />
                </div>
                {profileForm.formState.errors.name && <span className="form-error">{profileForm.formState.errors.name.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input value={profile?.email || ''} readOnly className="form-input" style={{ paddingLeft: 34, background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' }} />
                </div>
                <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, display: 'block' }}>Contact admin to change email</span>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input {...profileForm.register('phone')} className="form-input" style={{ paddingLeft: 34 }} placeholder="+91 9876543210" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <div style={{ position: 'relative' }}>
                  <Shield size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input value={ROLE_LABELS[profile?.role] || profile?.role || ''} readOnly className="form-input" style={{ paddingLeft: 34, background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' }} />
                </div>
                <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, display: 'block' }}>Assigned by admin</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-gold" disabled={profileForm.formState.isSubmitting}>
                <Save size={14} />
                {profileForm.formState.isSubmitting ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} style={{ color: '#A11D4A' }} />
            <p className="card-title">Change Password</p>
          </div>
        </div>
        <div className="card-body">
          {pwSaved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
              <CheckCircle size={14} style={{ color: '#16A34A' }} />
              <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>Password changed successfully</span>
            </div>
          )}
          {pwError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#FEE2E2', border: '1px solid #FECACA' }}>
              <AlertCircle size={14} style={{ color: '#DC2626' }} />
              <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>{pwError}</span>
            </div>
          )}

          <form onSubmit={pwForm.handleSubmit(onPasswordChange)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
              <div className="form-group">
                <label className="form-label required">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    {...pwForm.register('currentPassword')}
                    type={showCurrent ? 'text' : 'password'}
                    className={`form-input ${pwForm.formState.errors.currentPassword ? 'error' : ''}`}
                    style={{ paddingLeft: 34, paddingRight: 36 }}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowCurrent(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwForm.formState.errors.currentPassword && <span className="form-error">{pwForm.formState.errors.currentPassword.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label required">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    {...pwForm.register('newPassword')}
                    type={showNew ? 'text' : 'password'}
                    className={`form-input ${pwForm.formState.errors.newPassword ? 'error' : ''}`}
                    style={{ paddingLeft: 34, paddingRight: 36 }}
                    placeholder="Min 8 characters"
                  />
                  <button type="button" onClick={() => setShowNew(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwForm.formState.errors.newPassword && <span className="form-error">{pwForm.formState.errors.newPassword.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label required">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    {...pwForm.register('confirmPassword')}
                    type={showConfirm ? 'text' : 'password'}
                    className={`form-input ${pwForm.formState.errors.confirmPassword ? 'error' : ''}`}
                    style={{ paddingLeft: 34, paddingRight: 36 }}
                    placeholder="Re-enter new password"
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwForm.formState.errors.confirmPassword && <span className="form-error">{pwForm.formState.errors.confirmPassword.message}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={pwForm.formState.isSubmitting}>
                  <Key size={14} />
                  {pwForm.formState.isSubmitting ? 'Changing…' : 'Change Password'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div style={{ marginTop: 20, padding: '14px 20px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#94A3B8' }}>
          Account created: <strong style={{ color: '#475569' }}>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</strong>
          &nbsp;·&nbsp; Status: <strong style={{ color: profile?.status === 'active' ? '#16A34A' : '#DC2626' }}>{profile?.status || 'active'}</strong>
        </p>
      </div>
    </div>
  )
}
