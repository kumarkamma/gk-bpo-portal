export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SUPERVISOR: 'supervisor',
  BPO_AGENT: 'bpo_agent',
  AUDITOR: 'auditor',
  ACCOUNTS: 'accounts',
}

export const LEAD_STATUSES = [
  'New Lead', 'Contacted', 'Follow-Up Scheduled', 'Interested',
  'Documents Requested', 'Documents Received', 'Assigned Auditor',
  'Under Processing', 'ITR Filed', 'Payment Pending', 'Payment Received',
  'Completed', 'Lost',
]

export const CALL_STATUSES = [
  'Connected', 'Not Connected', 'Busy', 'Switched Off',
  'Invalid Number', 'Wrong Number', 'Not Reachable', 'Rejected', 'Call Back Later',
]

export const INTEREST_STATUSES = [
  'Interested', 'Not Interested', 'Existing CA', 'Already Filed', 'Follow-Up Required',
]

export const LEAD_TEMPERATURES = ['Hot', 'Warm', 'Cold']

export const SERVICES = [
  'Income Tax Filing', 'GST Filing', 'GST Registration', 'TDS Filing',
  'Company Registration', 'Trademark Registration', 'Accounting',
  'Bookkeeping', 'Audit Support', 'Startup Services', 'Other',
]

export const FILING_STATUSES = [
  'Documents Pending', 'Documents Received', 'Under Review', 'Under Processing', 'Filed', 'Completed',
]

export const PAYMENT_STATUSES = ['Not Paid', 'Partially Paid', 'Fully Paid', 'Refunded']

export const PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Cash', 'Razorpay', 'Stripe', 'Card']

export const LEAD_STATUS_COLORS = {
  'New Lead': 'bg-blue-100 text-blue-700',
  'Contacted': 'bg-purple-100 text-purple-700',
  'Follow-Up Scheduled': 'bg-yellow-100 text-yellow-700',
  'Interested': 'bg-emerald-100 text-emerald-700',
  'Documents Requested': 'bg-orange-100 text-orange-700',
  'Documents Received': 'bg-teal-100 text-teal-700',
  'Assigned Auditor': 'bg-indigo-100 text-indigo-700',
  'Under Processing': 'bg-cyan-100 text-cyan-700',
  'ITR Filed': 'bg-green-100 text-green-700',
  'Payment Pending': 'bg-red-100 text-red-700',
  'Payment Received': 'bg-green-100 text-green-700',
  'Completed': 'bg-green-100 text-green-800',
  'Lost': 'bg-gray-100 text-gray-600',
}

export const TEMP_COLORS = {
  Hot: 'bg-red-100 text-red-700',
  Warm: 'bg-orange-100 text-orange-700',
  Cold: 'bg-blue-100 text-blue-700',
}

export const PAYMENT_STATUS_COLORS = {
  'Not Paid': 'bg-red-100 text-red-700',
  'Partially Paid': 'bg-yellow-100 text-yellow-700',
  'Fully Paid': 'bg-green-100 text-green-700',
  'Refunded': 'bg-gray-100 text-gray-600',
}
