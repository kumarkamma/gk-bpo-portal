import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { gsap } from 'gsap'
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield, Users, FileText, TrendingUp, CheckCircle, Phone, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
})

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState('')
  const leftRef = useRef(null)
  const rightRef = useRef(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  })

  useEffect(() => {
    gsap.fromTo(leftRef.current,
      { opacity: 0, x: -50 },
      { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }
    )
    gsap.fromTo(rightRef.current,
      { opacity: 0, x: 50 },
      { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 }
    )
  }, [])

  async function onSubmit({ email, password }) {
    setAuthError('')
    const { error } = await signIn(email, password)
    if (error) setAuthError(error.message)
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Poppins, sans-serif' }}>

      {/* ===== LEFT HALF — GK Tax Branding ===== */}
      <div
        ref={leftRef}
        className="hidden lg:flex flex-col w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0B1026 0%, #101828 50%, #162032 100%)' }}
      >
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(161,29,74,0.1) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)', transform: 'translate(-50%, -50%)' }} />
          {/* Grid lines */}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10">

          {/* Top — Logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #D4AF37, #b8942e)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#0B1026"/>
                <path d="M2 17l10 5 10-5" stroke="#0B1026" strokeWidth="2" fill="none"/>
                <path d="M2 12l10 5 10-5" stroke="#0B1026" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div>
              <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>GK Tax Consultancy</h1>
              <p style={{ color: '#D4AF37', fontSize: '0.75rem', fontWeight: 500 }}>BPO Operations Portal</p>
            </div>
          </div>

          {/* Middle — Hero */}
          <div className="flex-1 flex flex-col justify-center py-10">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full w-fit" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D4AF37' }} />
              <span style={{ color: '#D4AF37', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em' }}>ENTERPRISE TAX MANAGEMENT</span>
            </div>

            <h2 style={{ color: 'white', fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem' }}>
              Your Complete<br />
              <span style={{ color: '#D4AF37' }}>Tax Operations</span><br />
              Command Centre
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.8, maxWidth: '400px', marginBottom: '2.5rem' }}>
              Manage 35,000+ leads, track ITR filings, handle client payments, and monitor your entire BPO team — all from one powerful dashboard.
            </p>

            {/* Feature List */}
            <div className="space-y-3 mb-8">
              {[
                { icon: Users, text: 'Lead Management & BPO Calling Operations' },
                { icon: FileText, text: 'ITR Filing Tracking & Auditor Workflow' },
                { icon: TrendingUp, text: 'Revenue Monitoring & Payment Tracking' },
                { icon: Shield, text: 'Role-Based Access with Row Level Security' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)' }}>
                    <Icon size={12} style={{ color: '#D4AF37' }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem' }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '35,000+', label: 'Leads' },
                { value: '2,000+', label: 'Active Clients' },
                { value: '5 Roles', label: 'Access Control' },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ color: '#D4AF37', fontSize: '1.2rem', fontWeight: 700 }}>{value}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: '2px' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom — Contact */}
          <div className="space-y-2 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <MapPin size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem' }}>GK Business Solutions — Internal Portal</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <a href="https://gktaxconsultancy.services" target="_blank" rel="noreferrer" style={{ color: 'rgba(212,175,55,0.5)', fontSize: '0.72rem' }}>gktaxconsultancy.services</a>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT HALF — Login Form ===== */}
      <div
        ref={rightRef}
        className="flex flex-col w-full lg:w-1/2"
        style={{ background: '#F8F9FC' }}
      >
        {/* Mobile logo */}
        <div className="flex items-center gap-3 p-6 lg:hidden">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0B1026' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#D4AF37"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, color: '#0B1026', fontSize: '0.95rem' }}>GK Tax Consultancy</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-md">

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-0.5 rounded-full" style={{ background: '#D4AF37' }} />
                <span style={{ color: '#D4AF37', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em' }}>SECURE LOGIN</span>
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0B1026', lineHeight: 1.2 }}>
                Welcome Back
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Sign in to access your dashboard and tools
              </p>
            </div>

            {/* Error */}
            {authError && (
              <div className="flex items-start gap-2.5 p-4 rounded-xl mb-6" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <AlertCircle size={16} style={{ color: '#dc2626', marginTop: '1px', flexShrink: 0 }} />
                <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@gktaxconsultancy.services"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {errors.email && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem' }}>{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label" style={{ margin: 0 }}>Password</label>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.375rem' }}>{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center"
                style={{ padding: '0.8rem', fontSize: '0.9rem', borderRadius: '0.75rem', marginTop: '0.5rem' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In to Portal
                  </span>
                )}
              </button>
            </form>

            {/* Role Badges */}
            <div className="mt-8 p-5 rounded-2xl" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Portal Access Roles
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { role: 'Super Admin', color: '#7c3aed', bg: '#f5f3ff' },
                  { role: 'Supervisor', color: '#1d4ed8', bg: '#eff6ff' },
                  { role: 'BPO Agent', color: '#15803d', bg: '#f0fdf4' },
                  { role: 'Auditor', color: '#c2410c', bg: '#fff7ed' },
                  { role: 'Accounts', color: '#0f766e', bg: '#f0fdfa' },
                ].map(({ role, color, bg }) => (
                  <span
                    key={role}
                    style={{ background: bg, color, fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.7rem', borderRadius: '9999px' }}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={12} style={{ color: '#25D366' }} />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>SSL Secured</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={12} style={{ color: '#D4AF37' }} />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Row Level Security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText size={12} style={{ color: '#A11D4A' }} />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Audit Logged</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 text-center" style={{ borderTop: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            © {new Date().getFullYear()} GK Business Solutions · Internal Use Only
          </p>
        </div>
      </div>
    </div>
  )
}
