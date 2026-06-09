import { useEffect, useRef, useState, useCallback } from 'react'
import { ScrollText, CheckCircle, AlertCircle, RefreshCw, Download, Users, Shield } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { formatDateTime } from '../../lib/utils'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'
import * as XLSX from 'xlsx'

const ROLE_LABELS = {
  super_admin: 'Super Admin', supervisor: 'Supervisor',
  bpo_agent: 'BPO Agent', auditor: 'Auditor', accounts: 'Accounts',
}

const ROLE_STYLE = {
  super_admin: { bg: '#F5F3FF', color: '#7C3AED' },
  supervisor:  { bg: '#EFF6FF', color: '#1D4ED8' },
  bpo_agent:   { bg: '#ECFDF5', color: '#065F46' },
  auditor:     { bg: '#FFFBEB', color: '#92400E' },
  accounts:    { bg: '#F0FDFA', color: '#0F766E' },
}

export default function ConsentMonitorPage() {
  const containerRef = useRef(null)
  const [users, setUsers] = useState([])
  const [consents, setConsents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useStaggerAnimation(containerRef)
  useEffect(() => { loadAll() }, [])

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    const [{ data: allUsers }, { data: allConsents }] = await Promise.all([
      supabase.from('users').select('id,name,email,role,status,created_at').order('name'),
      supabase.from('policy_consents').select('*').eq('policy_version', 'v1.0'),
    ])
    setUsers(allUsers || [])
    setConsents(allConsents || [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  // Merge users with consent status
  const userConsent = users.map(u => ({
    ...u,
    consent: consents.find(c => c.user_id === u.id) || null,
  }))

  const signed   = userConsent.filter(u => u.consent).length
  const unsigned = userConsent.filter(u => !u.consent).length
  const total    = userConsent.length

  const pieData = [
    { name: 'Signed',   value: signed },
    { name: 'Unsigned', value: unsigned },
  ].filter(d => d.value > 0)

  function exportExcel() {
    const rows = userConsent.map(u => ({
      Name: u.name, Email: u.email,
      Role: ROLE_LABELS[u.role] || u.role,
      Status: u.status,
      'Policy Signed': u.consent ? 'Yes' : 'No',
      'Signed On': u.consent ? formatDateTime(u.consent.consented_at) : '',
      'Signature': u.consent?.signature || '',
      'Policy Version': u.consent?.policy_version || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Consent Monitor')
    XLSX.writeFile(wb, `GK_Consent_Monitor_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScrollText size={20} style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <p className="page-title">Consent Monitor</p>
            <p className="page-subtitle">Track privacy policy acknowledgements across all staff</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => loadAll(true)} disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* KPI + Pie row */}
      <div className="stagger-item" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 220px', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Staff',     value: total,    icon: Users,        color: '#0A1628', bg: '#EFF6FF' },
          { label: 'Policy Signed',   value: signed,   icon: CheckCircle,  color: '#16A34A', bg: '#DCFCE7' },
          { label: 'Awaiting Signature', value: unsigned, icon: AlertCircle, color: '#D97706', bg: '#FEF3C7' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          </div>
        ))}

        {/* Mini pie */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          {pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={90}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={26} outerRadius={42} paddingAngle={3} dataKey="value">
                  <Cell fill="#16A34A" />
                  <Cell fill="#D97706" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <p style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginTop: 4 }}>
            {total > 0 ? Math.round((signed / total) * 100) : 0}% Compliance
          </p>
        </div>
      </div>

      {/* Unsigned warning banner */}
      {unsigned > 0 && (
        <div className="stagger-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 12, background: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: 20 }}>
          <AlertCircle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{unsigned} staff member{unsigned > 1 ? 's have' : ' has'} not yet signed the Privacy Policy</p>
            <p style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>Notify them to visit the Privacy & Policy page and complete their digital signature.</p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={6} /> : (
        <div className="table-container stagger-item">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>All Staff — Consent Status</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, background: '#DCFCE7', color: '#16A34A', padding: '3px 10px', borderRadius: 5, fontWeight: 700 }}>{signed} signed</span>
              <span style={{ fontSize: 11, background: '#FEF3C7', color: '#D97706', padding: '3px 10px', borderRadius: 5, fontWeight: 700 }}>{unsigned} pending</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Role</th>
                <th>Status</th>
                <th>Policy Consent</th>
                <th>Signed On</th>
                <th>Digital Signature</th>
              </tr>
            </thead>
            <tbody>
              {userConsent.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ color: '#CBD5E1', fontSize: 11 }}>{i + 1}</td>
                  <td>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{u.name}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8' }}>{u.email}</p>
                  </td>
                  <td>
                    <span style={{ padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: ROLE_STYLE[u.role]?.bg || '#F1F5F9', color: ROLE_STYLE[u.role]?.color || '#64748B' }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: u.status === 'active' ? '#DCFCE7' : '#FEE2E2', color: u.status === 'active' ? '#16A34A' : '#DC2626' }}>
                      {u.status || 'active'}
                    </span>
                  </td>
                  <td>
                    {u.consent ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} style={{ color: '#16A34A' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>Signed</span>
                        <span style={{ fontSize: 10, color: '#94A3B8' }}>({u.consent.policy_version})</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} style={{ color: '#D97706' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>Pending</span>
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: '#64748B' }}>
                    {u.consent ? formatDateTime(u.consent.consented_at) : '—'}
                  </td>
                  <td style={{ fontStyle: u.consent ? 'italic' : 'normal', fontSize: 12, color: u.consent ? '#0A1628' : '#CBD5E1', fontWeight: u.consent ? 700 : 400 }}>
                    {u.consent?.signature || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
