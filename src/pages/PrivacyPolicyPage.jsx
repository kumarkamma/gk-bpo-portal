import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import { ScrollText, CheckCircle, AlertCircle, Pen, Shield, Lock, Eye, FileText, Clock, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useStaggerAnimation } from '../hooks/useAnimations'
import { formatDateTime } from '../lib/utils'

const POLICY_VERSION = 'v1.0'

const SECTIONS = [
  {
    icon: Eye,
    title: '1. Data We Collect',
    content: `GK Tax Consultancy collects the following information during your employment and use of this portal:
• Personal details: Full name, email address, phone number, employee role
• Work activity: Call logs, lead interactions, follow-up records, attendance clock-in/out times
• Device & access data: Login timestamps, IP address, browser/device information
• Financial data (Accounts team only): Payment records, transaction references
• Filing data (Auditor only): ITR filing records, client acknowledgements`,
  },
  {
    icon: Lock,
    title: '2. How We Use Your Data',
    content: `Your data is used solely for internal business operations:
• Monitoring attendance and working hours for payroll and HR purposes
• Tracking lead assignments, call performance, and conversion metrics
• Enabling supervisors and management to monitor team productivity
• Generating reports for business performance review
• Maintaining an audit trail of all system actions for compliance and security
• Communicating with you regarding your work assignments and responsibilities`,
  },
  {
    icon: Shield,
    title: '3. Data Security',
    content: `We implement the following security measures to protect your data:
• All data is stored on Supabase (PostgreSQL) with Row Level Security (RLS) enforced
• Role-based access control ensures you can only access data relevant to your role
• All connections are encrypted via SSL/TLS
• Passwords are hashed using industry-standard bcrypt via Supabase Auth
• Session tokens expire automatically and are invalidated on logout
• All data changes are logged in an immutable audit trail`,
  },
  {
    icon: Eye,
    title: '4. Who Can See Your Data',
    content: `Data visibility is strictly controlled by your role:
• Super Admin: Full access to all portal data, user management, audit logs, and attendance
• Supervisor: Can view team attendance, lead pipelines, call performance, and reports
• BPO Agent: Can only see leads assigned to you and your own call logs
• Auditor: Can only see clients assigned to you and their filing records
• Accounts Team: Can only view payment and revenue records

Your personal profile data is visible only to you and the Super Admin.`,
  },
  {
    icon: Clock,
    title: '5. Data Retention',
    content: `Data is retained for the following periods:
• Attendance records: 3 years from the date of recording
• Call logs and lead data: Duration of employment + 2 years
• Audit logs: 5 years for compliance purposes
• Payment records: 7 years as required by Indian tax law
• Profile data: Duration of employment; deleted within 30 days of account deactivation upon written request

Upon termination of employment, your account will be deactivated. Your data may be retained for legal compliance purposes.`,
  },
  {
    icon: FileText,
    title: '6. Your Rights',
    content: `As an employee using this portal, you have the following rights:
• Right to access: Request a copy of all personal data held about you
• Right to correction: Request correction of inaccurate data
• Right to deletion: Request deletion of your data (subject to legal retention requirements)
• Right to portability: Request your data in a machine-readable format
• Right to withdraw consent: You may withdraw consent at any time by contacting HR; however, this may affect your ability to use the portal

To exercise any of these rights, contact: support@gktaxconsultancy.services`,
  },
  {
    icon: Shield,
    title: '7. Monitoring & Surveillance',
    content: `By using this portal, you acknowledge and agree that:
• All actions performed in this portal are logged and audited
• Supervisors and Super Admin can view your activity, performance metrics, and attendance
• The company may review your call logs, lead interactions, and work records at any time
• This monitoring is conducted for legitimate business purposes including performance management, compliance, and security
• You have no reasonable expectation of privacy regarding actions performed within this business portal`,
  },
  {
    icon: Lock,
    title: '8. Third-Party Services',
    content: `This portal uses the following third-party services:
• Supabase (supabase.com): Database, authentication, and file storage — Data stored in India/Singapore region
• Vercel (vercel.com): Application hosting and deployment
• Google Fonts: Typography (Poppins, Roboto) — loaded from Google servers

These services have their own privacy policies and data processing agreements. GK Tax Consultancy ensures all third-party providers meet applicable data protection standards.`,
  },
  {
    icon: FileText,
    title: '9. Policy Updates',
    content: `GK Tax Consultancy reserves the right to update this privacy policy at any time. You will be notified of material changes via:
• In-portal notification requiring re-acknowledgement
• Email to your registered work email address

Continued use of the portal after notification constitutes acceptance of the updated policy. Previous consents are archived and timestamped for compliance records.`,
  },
  {
    icon: Shield,
    title: '10. Contact & Grievances',
    content: `For any privacy-related queries, data requests, or grievances:

Data Controller: GK Business Solutions & GK Tax Consultancy
Email: support@gktaxconsultancy.services
Website: https://gktaxconsultancy.services
Address: Available from HR department

Response time: Within 7 business days for standard requests, within 72 hours for urgent security matters.`,
  },
]

export default function PrivacyPolicyPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [consent, setConsent] = useState(null)
  const [loadingConsent, setLoadingConsent] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signError, setSignError] = useState('')
  const [readProgress, setReadProgress] = useState(0)
  const contentRef = useRef(null)

  useStaggerAnimation(containerRef)

  useEffect(() => {
    if (profile?.id) {
      checkConsent()
    } else {
      // Not logged in — just show the policy without consent check
      setLoadingConsent(false)
    }
  }, [profile?.id])

  // Track reading progress
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handleScroll = () => {
      const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)
      setReadProgress(Math.min(pct, 100))
    }
    el?.addEventListener('scroll', handleScroll)
    return () => el?.removeEventListener('scroll', handleScroll)
  }, [])

  async function checkConsent() {
    setLoadingConsent(true)
    const { data } = await supabase
      .from('policy_consents')
      .select('*')
      .eq('user_id', profile.id)
      .eq('policy_version', POLICY_VERSION)
      .maybeSingle()
    setConsent(data)
    setLoadingConsent(false)
  }

  async function handleSign() {
    if (!agreed) { setSignError('Please check the agreement box first.'); return }
    if (!signature.trim() || signature.trim().toLowerCase() !== profile?.name?.toLowerCase()) {
      setSignError(`Please type your full name exactly: "${profile?.name}"`)
      return
    }
    setSigning(true)
    setSignError('')
    const { error } = await supabase.from('policy_consents').upsert({
      user_id: profile.id,
      policy_version: POLICY_VERSION,
      consented_at: new Date().toISOString(),
      user_agent: navigator.userAgent.slice(0, 200),
      signature: signature.trim(),
    }, { onConflict: 'user_id,policy_version' })
    if (error) { setSignError(error.message); setSigning(false); return }
    setSigning(false)
    await checkConsent()
  }

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentW = pageW - margin * 2
    let y = 0

    function addPage() {
      doc.addPage()
      y = 20
      // Header bar on every page
      doc.setFillColor(10, 15, 30)
      doc.rect(0, 0, pageW, 12, 'F')
      doc.setFontSize(8)
      doc.setTextColor(200, 169, 107)
      doc.text('GK Tax Consultancy — Privacy & Data Policy v1.0  |  Confidential', margin, 8)
      doc.setTextColor(0, 0, 0)
    }

    function checkY(needed) {
      if (y + needed > pageH - 20) addPage()
    }

    // ── Cover Page ──────────────────────────────────────────
    // Dark header band
    doc.setFillColor(10, 15, 30)
    doc.rect(0, 0, pageW, 70, 'F')

    // Gold accent line
    doc.setFillColor(200, 169, 107)
    doc.rect(0, 70, pageW, 2, 'F')

    // Company name
    doc.setFontSize(22)
    doc.setTextColor(212, 175, 55)
    doc.setFont('helvetica', 'bold')
    doc.text('GK Tax Consultancy', pageW / 2, 28, { align: 'center' })

    doc.setFontSize(11)
    doc.setTextColor(200, 200, 200)
    doc.setFont('helvetica', 'normal')
    doc.text('BPO Operations Portal', pageW / 2, 37, { align: 'center' })

    // Title
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('Privacy & Data Policy', pageW / 2, 54, { align: 'center' })

    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text(`Version ${POLICY_VERSION}  ·  Effective January 2025`, pageW / 2, 62, { align: 'center' })

    // Info boxes below header
    y = 90
    const boxes = [
      { label: 'Document Type', value: 'Employee Data Privacy Policy' },
      { label: 'Organization',  value: 'GK Business Solutions & GK Tax Consultancy' },
      { label: 'Applies To',    value: 'All Portal Users (All Roles)' },
      { label: 'Contact',       value: 'support@gktaxconsultancy.services' },
    ]
    boxes.forEach(({ label, value }) => {
      doc.setFillColor(248, 249, 252)
      doc.roundedRect(margin, y, contentW, 12, 2, 2, 'F')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'bold')
      doc.text(label.toUpperCase(), margin + 4, y + 5)
      doc.setFontSize(10)
      doc.setTextColor(10, 22, 40)
      doc.setFont('helvetica', 'normal')
      doc.text(value, margin + 4, y + 10)
      y += 16
    })

    // Intro paragraph
    y += 8
    doc.setFillColor(255, 251, 235)
    doc.roundedRect(margin, y, contentW, 22, 3, 3, 'F')
    doc.setDrawColor(253, 230, 138)
    doc.roundedRect(margin, y, contentW, 22, 3, 3, 'S')
    doc.setFontSize(9)
    doc.setTextColor(92, 62, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('IMPORTANT NOTICE', margin + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const introText = 'This Privacy & Data Policy governs the use of the GK Tax Consultancy BPO Operations Portal. By signing this document, employees acknowledge that they have read, understood, and agree to all terms outlined herein.'
    const introLines = doc.splitTextToSize(introText, contentW - 10)
    doc.text(introLines, margin + 5, y + 13)
    y += 30

    // Generated timestamp
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, y)

    // ── Policy Sections ──────────────────────────────────────
    addPage()

    SECTIONS.forEach(({ title, content }) => {
      checkY(20)

      // Section title bar
      doc.setFillColor(10, 15, 30)
      doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F')
      doc.setFontSize(10)
      doc.setTextColor(212, 175, 55)
      doc.setFont('helvetica', 'bold')
      doc.text(title, margin + 5, y + 7)
      y += 14

      // Section content
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(content, contentW)
      lines.forEach(line => {
        checkY(6)
        const isBullet = line.trim().startsWith('•')
        if (isBullet) {
          doc.setTextColor(139, 30, 63)
          doc.text('•', margin + 3, y)
          doc.setTextColor(71, 85, 105)
          doc.text(line.trim().slice(1).trim(), margin + 8, y)
        } else {
          doc.text(line, margin, y)
        }
        y += 5.5
      })
      y += 6
    })

    // ── Signature Page ───────────────────────────────────────
    addPage()
    y = 30

    doc.setFontSize(14)
    doc.setTextColor(10, 15, 30)
    doc.setFont('helvetica', 'bold')
    doc.text('Digital Acknowledgement & Signature', pageW / 2, y, { align: 'center' })
    y += 14

    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.setFont('helvetica', 'normal')
    const ackText = 'By signing below, the employee confirms they have read, understood, and agree to comply with the GK Tax Consultancy Privacy & Data Policy. This signature is legally binding and will be recorded with a timestamp.'
    const ackLines = doc.splitTextToSize(ackText, contentW)
    doc.text(ackLines, margin, y)
    y += ackLines.length * 5.5 + 10

    // Signature fields
    if (consent) {
      // Already signed — show certificate
      doc.setFillColor(220, 252, 231)
      doc.roundedRect(margin, y, contentW, 50, 3, 3, 'F')
      doc.setDrawColor(187, 247, 208)
      doc.roundedRect(margin, y, contentW, 50, 3, 3, 'S')

      doc.setFontSize(11)
      doc.setTextColor(21, 128, 61)
      doc.setFont('helvetica', 'bold')
      doc.text('✓  POLICY SIGNED & ACKNOWLEDGED', margin + 8, y + 10)

      const fields = [
        ['Employee Name',  profile?.name || ''],
        ['Role',           profile?.role?.replace(/_/g, ' ').toUpperCase() || ''],
        ['Digital Signature', consent.signature],
        ['Signed On',      new Date(consent.consented_at).toLocaleString('en-IN')],
        ['Policy Version', consent.policy_version],
      ]
      let fx = y + 18
      fields.forEach(([label, value]) => {
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.setFont('helvetica', 'bold')
        doc.text(label + ':', margin + 8, fx)
        doc.setTextColor(10, 22, 40)
        doc.setFont('helvetica', 'normal')
        doc.text(value, margin + 55, fx)
        fx += 6
      })
    } else {
      // Blank signature fields for manual signing
      const sigFields = [
        'Employee Name', 'Employee Role', 'Date', 'Signature'
      ]
      sigFields.forEach(field => {
        checkY(18)
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.setFont('helvetica', 'bold')
        doc.text(field + ':', margin, y)
        y += 6
        doc.setDrawColor(203, 213, 225)
        doc.line(margin, y, margin + contentW, y)
        y += 12
      })
    }

    // Footer on last page
    y = pageH - 20
    doc.setFillColor(10, 15, 30)
    doc.rect(0, pageH - 14, pageW, 14, 'F')
    doc.setFontSize(8)
    doc.setTextColor(200, 169, 107)
    doc.text('GK Tax Consultancy · support@gktaxconsultancy.services · gktaxconsultancy.services', pageW / 2, pageH - 5, { align: 'center' })

    // Add page numbers
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' })
    }

    doc.save(`GK_Privacy_Policy_${POLICY_VERSION}_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  if (loadingConsent) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #E8EAF0', borderTopColor: '#C8A96B', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#64748B', fontSize: 13 }}>Loading policy…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  return (
    <div ref={containerRef} style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div className="stagger-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScrollText size={22} style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <p className="page-title">Privacy & Data Policy</p>
            <p className="page-subtitle">Version {POLICY_VERSION} · GK Tax Consultancy · Effective January 2025</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={downloadPDF}>
            <Download size={13} /> Download
          </button>
          {consent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
              <CheckCircle size={14} style={{ color: '#16A34A' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>Signed {new Date(consent.consented_at).toLocaleDateString('en-IN')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Consent status banner — only when logged in */}
      {profile && (!consent ? (
        <div className="stagger-item" style={{ padding: '14px 20px', borderRadius: 12, background: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Action Required — Please read and sign this policy</p>
            <p style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>You must review and digitally sign this policy to confirm your understanding and consent.</p>
          </div>
        </div>
      ) : (
        <div className="stagger-item" style={{ padding: '14px 20px', borderRadius: 12, background: '#DCFCE7', border: '1px solid #BBF7D0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>Policy Signed & Acknowledged</p>
            <p style={{ fontSize: 12, color: '#16A34A', marginTop: 2 }}>
              Signed as "<strong>{consent.signature}</strong>" on {formatDateTime(consent.consented_at)}
            </p>
          </div>
        </div>
      ))}

      {/* Reading progress bar */}
      <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${readProgress}%`, background: 'linear-gradient(90deg,#D4AF37,#8B1E3F)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 16, textAlign: 'right' }}>Reading progress: {readProgress}%</p>

      {/* Policy content */}
      <div
        ref={contentRef}
        className="card stagger-item"
        style={{ maxHeight: 520, overflowY: 'auto', marginBottom: 24, padding: 0 }}
        onScroll={e => {
          const el = e.currentTarget
          const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)
          setReadProgress(Math.min(pct, 100))
        }}
      >
        {/* Intro */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #F1F5F9', background: 'linear-gradient(135deg,#0A1628,#162340)' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
            This Privacy & Data Policy governs your use of the <strong style={{ color: '#D4AF37' }}>GK Tax Consultancy BPO Operations Portal</strong>.
            By signing this document, you acknowledge that you have read, understood, and agree to all terms outlined herein.
            This policy applies to all employees, contractors, and authorised users of this system.
          </p>
        </div>

        {SECTIONS.map(({ icon: Icon, title, content }, idx) => (
          <div key={idx} style={{ padding: '24px 32px', borderBottom: idx < SECTIONS.length - 1 ? '1px solid #F5F6FA' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF1F8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} style={{ color: '#0A1628' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#0A1628', fontFamily: "'Poppins',sans-serif" }}>{title}</p>
            </div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.9, whiteSpace: 'pre-line' }}>{content}</p>
          </div>
        ))}
      </div>

      {/* Signature section */}
      {!profile ? (
        <div className="card stagger-item" style={{ border: '1px solid #E2E8F0' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <ScrollText size={32} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>Login Required to Sign</p>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Please log in to digitally sign and acknowledge this policy.</p>
          </div>
        </div>
      ) : !consent ? (
        <div className="card stagger-item" style={{ border: '2px solid #FDE68A' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #FEF3C7', background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Pen size={18} style={{ color: '#D97706' }} />
              <p style={{ fontSize: 15, fontWeight: 800, color: '#92400E', fontFamily: "'Poppins',sans-serif" }}>Digital Signature Required</p>
            </div>
            <p style={{ fontSize: 12, color: '#B45309', marginTop: 6 }}>
              Please scroll through and read the full policy, then sign below. Your signature is legally binding.
            </p>
          </div>
          <div style={{ padding: '24px' }}>
            {/* Read progress check */}
            {readProgress < 80 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: 16 }}>
                <AlertCircle size={14} style={{ color: '#D97706' }} />
                <span style={{ fontSize: 12, color: '#92400E' }}>Please scroll through and read the full policy before signing ({readProgress}% read)</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label required">Type Your Full Name to Sign</label>
              <div style={{ position: 'relative' }}>
                <Pen size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  value={signature}
                  onChange={e => { setSignature(e.target.value); setSignError('') }}
                  className="form-input"
                  style={{ paddingLeft: 36, fontStyle: 'italic', fontSize: 15, letterSpacing: '0.03em' }}
                  placeholder={`Type: ${profile?.name || 'Your Full Name'}`}
                />
              </div>
              <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, display: 'block' }}>
                Type your name exactly as shown: <strong style={{ color: '#0A1628' }}>{profile?.name}</strong>
              </span>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16, padding: '14px 16px', borderRadius: 10, background: agreed ? 'rgba(22,163,74,0.05)' : '#F8FAFC', border: `1.5px solid ${agreed ? '#BBF7D0' : '#E2E8F0'}`, transition: 'all 0.15s' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 16, height: 16, marginTop: 1, accentColor: '#16A34A', flexShrink: 0, cursor: 'pointer' }} />
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                I, <strong style={{ color: '#0A1628' }}>{profile?.name}</strong>, confirm that I have read and understood the complete GK Tax Consultancy Privacy & Data Policy ({POLICY_VERSION}).
                I agree to comply with all terms and consent to the collection, processing, and monitoring of my work activity data as described above.
                I understand this consent is recorded with a timestamp and my digital signature.
              </p>
            </label>

            {signError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#FEE2E2', border: '1px solid #FECACA', marginBottom: 16 }}>
                <AlertCircle size={14} style={{ color: '#DC2626' }} />
                <span style={{ fontSize: 13, color: '#DC2626' }}>{signError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSign}
                disabled={signing || readProgress < 80}
                className="btn btn-primary"
                style={{ minWidth: 200 }}
              >
                <Pen size={14} />
                {signing ? 'Signing…' : readProgress < 80 ? `Read More (${readProgress}%)` : 'Sign & Accept Policy'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Already signed — show certificate */
        <div className="card stagger-item" style={{ border: '2px solid #BBF7D0' }}>
          <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg,#0A1628,#162340)', borderRadius: '10px 10px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle size={28} style={{ color: '#25D366' }} />
                <div>
                  <p style={{ color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: "'Poppins',sans-serif" }}>Policy Acknowledgement Certificate</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 }}>GK Tax Consultancy · Internal Records</p>
                </div>
              </div>
              <span style={{ padding: '4px 14px', borderRadius: 20, background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', fontSize: 12, fontWeight: 700 }}>
                VERIFIED
              </span>
            </div>
          </div>
          <div style={{ padding: '24px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Employee Name', value: profile?.name },
                { label: 'Role', value: profile?.role?.replace('_', ' ').toUpperCase() },
                { label: 'Policy Version', value: consent.policy_version },
                { label: 'Signed On', value: formatDateTime(consent.consented_at) },
                { label: 'Digital Signature', value: consent.signature },
                { label: 'Status', value: '✓ Active Consent' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '12px 16px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
