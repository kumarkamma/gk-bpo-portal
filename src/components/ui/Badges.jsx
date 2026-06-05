import { LEAD_STATUS_COLORS, TEMP_COLORS, PAYMENT_STATUS_COLORS } from '../../lib/constants'

export function LeadStatusBadge({ status }) {
  const cls = LEAD_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
  return <span className={`badge ${cls}`}>{status || '—'}</span>
}

export function TempBadge({ temp }) {
  const cls = TEMP_COLORS[temp] || 'bg-gray-100 text-gray-600'
  return <span className={`badge ${cls}`}>{temp || '—'}</span>
}

export function PaymentBadge({ status }) {
  const cls = PAYMENT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
  return <span className={`badge ${cls}`}>{status || '—'}</span>
}

export function RoleBadge({ role }) {
  const map = {
    super_admin: 'bg-purple-100 text-purple-700',
    supervisor: 'bg-blue-100 text-blue-700',
    bpo_agent: 'bg-green-100 text-green-700',
    auditor: 'bg-orange-100 text-orange-700',
    accounts: 'bg-teal-100 text-teal-700',
  }
  const labels = {
    super_admin: 'Super Admin',
    supervisor: 'Supervisor',
    bpo_agent: 'BPO Agent',
    auditor: 'Auditor',
    accounts: 'Accounts',
  }
  return <span className={`badge ${map[role] || 'bg-gray-100 text-gray-600'}`}>{labels[role] || role}</span>
}
