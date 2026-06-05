import { supabase } from './supabase'

export async function logAudit(userId, action, tableName, recordId, oldValue = null, newValue = null) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_value: oldValue,
    new_value: newValue,
  })
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function getInitials(name) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function truncate(str, n = 30) {
  return str && str.length > n ? str.slice(0, n) + '…' : str || '—'
}
