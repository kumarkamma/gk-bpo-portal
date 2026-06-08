import { LEAD_STATUS_COLORS, TEMP_COLORS, PAYMENT_STATUS_COLORS } from '../../lib/constants'

// Professional badge maps with proper border-radius and consistent style
const LEAD_BADGE = {
  'New Lead':            { bg: '#EFF6FF', color: '#1D4ED8' },
  'Contacted':           { bg: '#F5F3FF', color: '#6D28D9' },
  'Follow-Up Scheduled': { bg: '#FEF3C7', color: '#D97706' },
  'Interested':          { bg: '#DCFCE7', color: '#16A34A' },
  'Documents Requested': { bg: '#FFF7ED', color: '#C2410C' },
  'Documents Received':  { bg: '#ECFDF5', color: '#0F766E' },
  'Assigned Auditor':    { bg: '#EEF2FF', color: '#4338CA' },
  'Under Processing':    { bg: '#F0F9FF', color: '#0369A1' },
  'ITR Filed':           { bg: '#DCFCE7', color: '#15803D' },
  'Payment Pending':     { bg: '#FEE2E2', color: '#B91C1C' },
  'Payment Received':    { bg: '#DCFCE7', color: '#15803D' },
  'Completed':           { bg: '#D1FAE5', color: '#065F46' },
  'Lost':                { bg: '#F1F5F9', color: '#64748B' },
}

const TEMP_BADGE = {
  Hot:  { bg: '#FEE2E2', color: '#B91C1C' },
  Warm: { bg: '#FEF3C7', color: '#D97706' },
  Cold: { bg: '#DBEAFE', color: '#1D4ED8' },
}

const PAYMENT_BADGE = {
  'Not Paid':       { bg: '#FEE2E2', color: '#B91C1C' },
  'Partially Paid': { bg: '#FEF3C7', color: '#D97706' },
  'Fully Paid':     { bg: '#DCFCE7', color: '#16A34A' },
  'Refunded':       { bg: '#F1F5F9', color: '#64748B' },
}

const ROLE_BADGE = {
  super_admin: { bg: '#F5F3FF', color: '#6D28D9',  label: 'Super Admin' },
  supervisor:  { bg: '#EFF6FF', color: '#1D4ED8',  label: 'Supervisor' },
  bpo_agent:   { bg: '#ECFDF5', color: '#065F46',  label: 'BPO Agent' },
  auditor:     { bg: '#FFFBEB', color: '#92400E',  label: 'Auditor' },
  accounts:    { bg: '#F0FDFA', color: '#0F766E',  label: 'Accounts' },
}

function Badge({ bg, color, children }) {
  return (
    <span className="badge" style={{ background: bg, color, borderRadius: 4, fontSize: 11 }}>
      {children}
    </span>
  )
}

export function LeadStatusBadge({ status }) {
  const s = LEAD_BADGE[status] || { bg: '#F1F5F9', color: '#64748B' }
  return <Badge bg={s.bg} color={s.color}>{status || '—'}</Badge>
}

export function TempBadge({ temp }) {
  const s = TEMP_BADGE[temp] || { bg: '#F1F5F9', color: '#64748B' }
  return <Badge bg={s.bg} color={s.color}>{temp || '—'}</Badge>
}

export function PaymentBadge({ status }) {
  const s = PAYMENT_BADGE[status] || { bg: '#F1F5F9', color: '#64748B' }
  return <Badge bg={s.bg} color={s.color}>{status || '—'}</Badge>
}

export function RoleBadge({ role }) {
  const s = ROLE_BADGE[role] || { bg: '#F1F5F9', color: '#64748B', label: role }
  return <Badge bg={s.bg} color={s.color}>{s.label}</Badge>
}

export function FilingBadge({ status }) {
  const map = {
    'Documents Pending': { bg: '#FEF3C7', color: '#D97706' },
    'Under Review':      { bg: '#DBEAFE', color: '#1D4ED8' },
    'Under Processing':  { bg: '#F5F3FF', color: '#6D28D9' },
    'Filed':             { bg: '#DCFCE7', color: '#16A34A' },
    'Completed':         { bg: '#D1FAE5', color: '#065F46' },
  }
  const s = map[status] || { bg: '#F1F5F9', color: '#64748B' }
  return <Badge bg={s.bg} color={s.color}>{status || '—'}</Badge>
}
