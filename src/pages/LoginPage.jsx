import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { gsap } from 'gsap'
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield, PhoneCall, FileText, TrendingUp, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Minimum 6 characters required'),
})

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

const FEATURES = [
  { icon: PhoneCall,  label: 'BPO Call Management',  desc: 'Track 35,000+ leads with live call logs' },
  { icon: FileText,   label: 'ITR Filing Workflow',   desc: 'End-to-end auditor filing pipeline' },
  { icon: TrendingUp, label: 'Revenue Intelligence',  desc: 'Real-time payment & collection tracking' },
  { icon: Shield,     label: 'Role-Based Security',   desc: 'Row-level security across 5 user roles' },
]

const ROLES = [
  { label: 'Super Admin', color: '#7C3AED', bg: '#F5F3FF' },
  { label: 'Supervisor',  color: '#1D4ED8', bg: '#EFF6FF' },
  { label: 'BPO Agent',   color: '#065F46', bg: '#ECFDF5' },
  { label: 'Auditor',     color: '#92400E', bg: '#FFFBEB' },
  { label: 'Accounts',    color: '#0F766E', bg: '#F0FDFA' },
]

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const panelRef = useRef(null)
  const formRef = useRef(null)
  const logoRef = useRef(null)

  const loginForm = useForm({ resolver: zodResolver(loginSchema) })
  const forgotForm = useForm({ resolver: zodResolver(forgotSchema) })

  useEffect(() => {
    if (!panelRef.current || !formRef.current) return
    const tl = gsap.timeline()
    // Logo slides in from left first, then panel content, then right form
    if (logoRef.current) {
      tl.fromTo(logoRef.current,  { opacity: 0, x: -80 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' })
    }
    tl.fromTo(panelRef.current,  { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }, logoRef.current ? '-=0.4' : '0')
      .fromTo(formRef.current,   { opacity: 0, x:  60 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
  }, [])

  async function onLogin({ email, password }) {
    setAuthError('')
    const { error } = await signIn(email, password)
    if (error) setAuthError('Invalid email or password. Please try again.')
    else navigate('/')
  }

  async function onForgot({ email }) {
    setForgotError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setForgotError(error.message)
    else setForgotSent(true)
  }

  const LeftPanel = (
    <div
      ref={panelRef}
      style={{
        display: 'none', flexDirection: 'column', width: '50%',
        background: 'linear-gradient(155deg, #0A0F1E 0%, #0d1426 55%, #111b30 100%)',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}
      className="lg:flex"
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(200,169,107,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(200,169,107,0.06) 1px,transparent 1px)', backgroundSize: '70px 70px' }} />
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,169,107,0.09) 0%,transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,30,63,0.12) 0%,transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '40px 48px' }}>
        {/* Logo — free-standing, no clip */}
        <div ref={logoRef} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/mylogo.jpeg"
            alt="GK Tax Solutions"
            style={{ height: 64, width: 'auto', display: 'block', flexShrink: 0, filter: 'drop-shadow(0 4px 16px rgba(139,30,63,0.45))' }}
          />
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 17, lineHeight: 1.2, fontFamily: "'Poppins',sans-serif" }}>GK Tax Solutions</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', marginTop: 3 }}>BPO Operations Portal</p>
          </div>
        </div>

        {/* Hero */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '6px 14px', borderRadius: 100, width: 'fit-content', background: 'rgba(200,169,107,0.1)', border: '1px solid rgba(200,169,107,0.25)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8A96B', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#C8A96B', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>ENTERPRISE OPERATIONS PLATFORM</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.025em', fontFamily: "'Poppins',sans-serif" }}>
            One Platform.<br />
            <span style={{ color: '#C8A96B' }}>Complete Control.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 14, lineHeight: 1.85, maxWidth: 380, marginBottom: 40 }}>
            Manage your entire tax consultancy operations — from first call to ITR filing, payments and audit trails.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 44 }}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,169,107,0.1)', border: '1px solid rgba(200,169,107,0.2)' }}>
                  <Icon size={16} style={{ color: '#C8A96B' }} />
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[{ v: '35K+', l: 'Leads' }, { v: '2K+', l: 'Clients' }, { v: '5', l: 'Roles' }].map(({ v, l }) => (
              <div key={l} style={{ borderRadius: 12, padding: '16px 12px', textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,169,107,0.15)' }}>
                <p style={{ color: '#C8A96B', fontSize: 24, fontWeight: 800, fontFamily: "'Poppins',sans-serif" }}>{v}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>© {new Date().getFullYear()} GK Tax Solutions</p>
          <a href="http://www.gktaxsoultions.services" target="_blank" rel="noreferrer" style={{ color: 'rgba(200,169,107,0.6)', fontSize: 11, textDecoration: 'none' }}>gktaxsolutions.services ↗</a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Roboto', 'Poppins', sans-serif", background: '#F8F9FB' }}>
      {LeftPanel}

      {/* ── RIGHT PANEL ── */}
      <div ref={formRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {/* Mobile header */}
        <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #E5E5E3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/mylogo.jpeg" alt="GK" style={{ height: 40, width: 'auto', display: 'block', filter: 'drop-shadow(0 2px 6px rgba(139,30,63,0.3))' }} />
            <span style={{ fontWeight: 800, color: '#0A0F1E', fontSize: 15, fontFamily: "'Poppins',sans-serif" }}>GK Tax Solutions</span>
          </div>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.06em' }}>BPO PORTAL</span>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
          <div style={{ width: '100%', maxWidth: 440 }}>

            {/* ── FORGOT PASSWORD PANEL ── */}
            {mode === 'forgot' && (
              <>
                <button onClick={() => { setMode('login'); setForgotSent(false); setForgotError('') }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 13, fontWeight: 600, marginBottom: 24, padding: 0 }}>
                  <ArrowLeft size={14} /> Back to Login
                </button>
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#8B1E3F', letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>Password Reset</p>
                  <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0A1628', lineHeight: 1.2, fontFamily: "'Poppins',sans-serif", marginBottom: 8 }}>Forgot Password?</h2>
                  <p style={{ color: '#64748B', fontSize: 14 }}>Enter your work email and we'll send a reset link.</p>
                </div>

                {forgotSent ? (
                  <div style={{ padding: '24px', borderRadius: 12, background: '#DCFCE7', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                    <CheckCircle2 size={32} style={{ color: '#16A34A', margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 700, color: '#15803D', fontSize: 14, marginBottom: 6 }}>Reset link sent!</p>
                    <p style={{ color: '#16A34A', fontSize: 13 }}>Check your email inbox for the password reset link.</p>
                    <button onClick={() => { setMode('login'); setForgotSent(false) }} style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#0A1628', fontSize: 13, fontWeight: 700, textDecoration: 'underline' }}>
                      Return to Login
                    </button>
                  </div>
                ) : (
                  <>
                    {forgotError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 10, marginBottom: 20, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                        <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                        <span style={{ color: '#DC2626', fontSize: 13 }}>{forgotError}</span>
                      </div>
                    )}
                    <form onSubmit={forgotForm.handleSubmit(onForgot)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div className="form-group">
                        <label className="form-label required">Work Email Address</label>
                        <div style={{ position: 'relative' }}>
                          <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                          <input {...forgotForm.register('email')} type="email" className={`form-input ${forgotForm.formState.errors.email ? 'error' : ''}`} style={{ paddingLeft: 38, height: 44 }} placeholder="you@gktaxsolutions.services" />
                        </div>
                        {forgotForm.formState.errors.email && <span className="form-error">{forgotForm.formState.errors.email.message}</span>}
                      </div>
                      <button type="submit" disabled={forgotForm.formState.isSubmitting} style={{ width: '100%', height: 48, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #8B1E3F, #6f1832)', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'Poppins',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 32px rgba(139,30,63,0.4)' }}>
                        {forgotForm.formState.isSubmitting ? 'Sending…' : 'Send Reset Link →'}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}

            {/* ── LOGIN PANEL ── */}
            {mode === 'login' && (
              <>
                <div style={{ marginBottom: 32 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#8B1E3F', letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>Secure Staff Login</p>
                  <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0A1628', lineHeight: 1.15, letterSpacing: '-0.025em', fontFamily: "'Poppins',sans-serif", marginBottom: 8 }}>Welcome back</h2>
                  <p style={{ color: '#64748B', fontSize: 14 }}>Sign in to your GK Tax Solutions portal</p>
                </div>

                {authError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, marginBottom: 24, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <AlertCircle size={15} style={{ color: '#DC2626', flexShrink: 0 }} />
                    <span style={{ color: '#DC2626', fontSize: 13, fontWeight: 500 }}>{authError}</span>
                  </div>
                )}

                <form onSubmit={loginForm.handleSubmit(onLogin)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="form-group">
                    <label className="form-label required">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input {...loginForm.register('email')} type="email" placeholder="you@gktaxsolutions.services" className={`form-input ${loginForm.formState.errors.email ? 'error' : ''}`} style={{ paddingLeft: 38, height: 44, fontSize: 14 }} />
                    </div>
                    {loginForm.formState.errors.email && <span className="form-error">{loginForm.formState.errors.email.message}</span>}
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <label className="form-label required" style={{ margin: 0 }}>Password</label>
                      <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B1E3F', fontSize: 12, fontWeight: 600 }}>
                        Forgot Password?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input {...loginForm.register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••" className={`form-input ${loginForm.formState.errors.password ? 'error' : ''}`} style={{ paddingLeft: 38, paddingRight: 42, height: 44, fontSize: 14 }} />
                      <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && <span className="form-error">{loginForm.formState.errors.password.message}</span>}
                  </div>

                  <button type="submit" disabled={loginForm.formState.isSubmitting} style={{ width: '100%', height: 48, borderRadius: 10, border: 'none', cursor: loginForm.formState.isSubmitting ? 'not-allowed' : 'pointer', background: loginForm.formState.isSubmitting ? '#CBD5E1' : 'linear-gradient(135deg, #0A0F1E, #111b30)', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: "'Poppins',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, boxShadow: loginForm.formState.isSubmitting ? 'none' : '0 8px 32px rgba(10,15,30,0.35)', transition: 'all 0.2s' }}>
                    {loginForm.formState.isSubmitting ? (
                      <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Signing in…</>
                    ) : <>Sign In to Portal →</>}
                  </button>
                </form>

                <div style={{ marginTop: 32, padding: '20px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Portal Access Roles</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ROLES.map(({ label, color, bg }) => (
                      <span key={label} style={{ background: bg, color, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6 }}>{label}</span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                  {[
                    { icon: CheckCircle2, label: 'SSL Secured',   color: '#16A34A' },
                    { icon: Shield,       label: 'RLS Protected', color: '#C8A96B' },
                    { icon: Lock,         label: 'Audit Logged',  color: '#8B1E3F' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon size={12} style={{ color }} />
                      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 40px', borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#CBD5E1' }}>© {new Date().getFullYear()} GK Tax Solutions · Internal Use Only · v1.0</p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideInLeft { from { opacity:0; transform:translateX(-48px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(48px); } to { opacity:1; transform:translateX(0); } }
        .lg\\:flex { display: flex !important; }
        .lg\\:hidden { display: none !important; }
        @media (max-width: 1023px) {
          .lg\\:flex { display: none !important; }
          .lg\\:hidden { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
