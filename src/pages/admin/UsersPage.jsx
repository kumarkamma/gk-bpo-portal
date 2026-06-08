import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Plus, Edit2, Search, Shield, UserX, UserCheck, Key,
  RefreshCw, Mail, Phone, Lock, Unlock, AlertTriangle,
  CheckCircle, XCircle, Clock, Eye, EyeOff, Copy, Users,
  MoreVertical, Crown, UserCog, Briefcase, CreditCard
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { ROLES } from '../../lib/constants'
import { formatDate, formatDateTime, getInitials, logAudit } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

// ── Schemas ──────────────────────────────────────────────────
const createSchema = z.object({
  name:     z.string().min(2, 'Name required'),
  email:    z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  phone:    z.string().optional(),
  role:     z.string().min(1, 'Role required'),
})

const editSchema = z.object({
  name:   z.string().min(2),
  phone:  z.string().optional(),
  role:   z.string().min(1),
  status: z.string(),
})

// ── Constants ────────────────────────────────────────────────
const ROLE_META = {
  super_admin: { label: 'Super Admin', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: Crown },
  supervisor:  { label: 'Supervisor',  color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', icon: UserCog },
  bpo_agent:   { label: 'BPO Agent',   color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', icon: Phone },
  auditor:     { label: 'Auditor',     color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', icon: Briefcase },
  accounts:    { label: 'Accounts',    color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4', icon: CreditCard },
}

const STATUS_META = {
  active:    { label: 'Active',    color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
  inactive:  { label: 'Inactive',  color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' },
  suspended: { label: 'Suspended', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  banned:    { label: 'Banned',    color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
}

// ── Sub-components ───────────────────────────────────────────
function RolePill({ role }) {
  const m = ROLE_META[role] || { label: role, color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', icon: Users }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, background: m.bg, color: m.color, border: `1px solid ${m.border}`, fontSize: 11, fontWeight: 700 }}>
      {m.label}
    </span>
  )
}

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.active
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, background: m.bg, color: m.color, border: `1px solid ${m.border}`, fontSize: 11, fontWeight: 700 }}>
      {m.label}
    </span>
  )
}

function StatBox({ label, value, color, bg, icon: Icon }) {
  return (
    <div style={{ flex: 1, padding: '16px 20px', borderRadius: 12, background: bg, border: `1px solid ${color}22`, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif", lineHeight: 1 }}>{value}</p>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function UsersPage() {
  const { profile } = useAuth()
  const containerRef = useRef(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [newTempPass, setNewTempPass] = useState('')
  const [copied, setCopied] = useState(false)
  const [activityLogs, setActivityLogs] = useState([])
  const [showActivityModal, setShowActivityModal] = useState(false)

  useStaggerAnimation(containerRef)

  const createForm = useForm({ resolver: zodResolver(createSchema) })
  const editForm = useForm({ resolver: zodResolver(editSchema) })

  useEffect(() => { loadUsers() }, [search, roleFilter, statusFilter])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('users').select('*')
    if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    if (roleFilter) q = q.eq('role', roleFilter)
    if (statusFilter) q = q.eq('status', statusFilter)
    const { data } = await q.order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }, [search, roleFilter, statusFilter])

  // ── Create User ──────────────────────────────────────────
  async function onCreateUser(values) {
    setSaving(true)
    try {
      // Use Supabase signUp to create auth user (works from client)
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { name: values.name, role: values.role } },
      })
      if (authErr) throw new Error(authErr.message)

      // Upsert profile row
      if (authData?.user) {
        await supabase.from('users').upsert({
          id: authData.user.id,
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          role: values.role,
          status: 'active',
        }, { onConflict: 'id' })

        await logAudit(profile.id, 'CREATE_USER', 'users', authData.user.id, null, { name: values.name, email: values.email, role: values.role })
      }

      setShowCreateModal(false)
      createForm.reset()
      loadUsers()
    } catch (err) {
      createForm.setError('email', { message: err.message })
    }
    setSaving(false)
  }

  // ── Edit User ────────────────────────────────────────────
  function openEdit(u) {
    setSelectedUser(u)
    editForm.reset({ name: u.name, phone: u.phone || '', role: u.role, status: u.status || 'active' })
    setShowEditModal(true)
  }

  async function onEditUser(values) {
    setSaving(true)
    const old = { ...selectedUser }
    await supabase.from('users').update({
      name: values.name,
      phone: values.phone || null,
      role: values.role,
      status: values.status,
    }).eq('id', selectedUser.id)
    await logAudit(profile.id, 'UPDATE_USER', 'users', selectedUser.id, old, values)
    setSaving(false)
    setShowEditModal(false)
    loadUsers()
  }

  // ── Status Actions ────────────────────────────────────────
  async function applyStatus(userId, newStatus) {
    await supabase.from('users').update({ status: newStatus }).eq('id', userId)
    await logAudit(profile.id, `SET_STATUS_${newStatus.toUpperCase()}`, 'users', userId, null, { status: newStatus })
    setShowActionModal(false)
    loadUsers()
  }

  // ── Reset Password ────────────────────────────────────────
  async function sendPasswordReset() {
    if (!selectedUser?.email) return
    setSaving(true)
    await supabase.auth.resetPasswordForEmail(selectedUser.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    await logAudit(profile.id, 'PASSWORD_RESET_SENT', 'users', selectedUser.id, null, { email: selectedUser.email })
    setSaving(false)
    setShowResetModal(false)
  }

  function generateTempPass() {
    const pass = 'GK@' + Math.random().toString(36).slice(2, 8).toUpperCase() + Math.floor(10 + Math.random() * 90)
    setNewTempPass(pass)
  }

  async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Activity Logs ─────────────────────────────────────────
  async function viewActivity(u) {
    setSelectedUser(u)
    const { data } = await supabase.from('audit_logs').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(20)
    setActivityLogs(data || [])
    setShowActivityModal(true)
  }

  // ── Stats ─────────────────────────────────────────────────
  const totalUsers   = users.length
  const activeUsers  = users.filter(u => (u.status || 'active') === 'active').length
  const suspendedUsers = users.filter(u => u.status === 'suspended').length
  const bannedUsers  = users.filter(u => u.status === 'banned').length

  const isSuperAdmin = profile?.role === ROLES.SUPER_ADMIN

  const actionBtnStyle = (color) => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '12px 16px', borderRadius: 10, border: `1px solid ${color}22`,
    background: `${color}08`, cursor: 'pointer', transition: 'all 0.15s',
    fontSize: 13, fontWeight: 600, color,
  })

  return (
    <div ref={containerRef}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-title">User Management</p>
          <p className="page-subtitle">Create, manage and control portal access for all team members</p>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-gold" onClick={() => { createForm.reset(); setShowCreateModal(true) }}>
            <Plus size={15} /> Create New User
          </button>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatBox label="Total Users"  value={totalUsers}    color="#0A1628" bg="#EFF6FF"  icon={Users} />
        <StatBox label="Active"       value={activeUsers}   color="#16A34A" bg="#DCFCE7"  icon={CheckCircle} />
        <StatBox label="Suspended"    value={suspendedUsers}color="#D97706" bg="#FEF3C7"  icon={Clock} />
        <StatBox label="Banned"       value={bannedUsers}   color="#DC2626" bg="#FEE2E2"  icon={XCircle} />
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" className="form-input" style={{ paddingLeft: 34, minWidth: 260 }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="form-input" style={{ minWidth: 160 }}>
          <option value="">All Roles</option>
          {Object.entries(ROLE_META).map(([val, m]) => <option key={val} value={val}>{m.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input" style={{ minWidth: 140 }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([val, m]) => <option key={val} value={val}>{m.label}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={loadUsers} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── Table ── */}
      {loading ? <TableSkeleton rows={6} cols={7} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? users.map((u, i) => (
                <tr key={u.id} style={{ opacity: u.status === 'banned' ? 0.6 : 1 }}>
                  <td style={{ color: '#CBD5E1', fontSize: 11 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: u.status === 'banned' ? '#F1F5F9' : 'linear-gradient(135deg,#0A1628,#162340)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: u.status === 'banned' ? '#94A3B8' : '#D4AF37',
                        fontSize: 12, fontWeight: 800,
                        border: u.role === 'super_admin' ? '2px solid #D4AF37' : 'none',
                      }}>
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{u.name}</p>
                          {u.role === 'super_admin' && <Crown size={11} style={{ color: '#D4AF37' }} />}
                        </div>
                        {u.status === 'banned' && <p style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>BANNED</p>}
                        {u.status === 'suspended' && <p style={{ fontSize: 10, color: '#D97706', fontWeight: 700 }}>SUSPENDED</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#475569' }}>{u.email}</td>
                  <td style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{u.phone || '—'}</td>
                  <td><RolePill role={u.role} /></td>
                  <td><StatusPill status={u.status || 'active'} /></td>
                  <td style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(u.created_at)}</td>
                  <td>
                    {isSuperAdmin && u.id !== profile.id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit user"
                          style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}
                        ><Edit2 size={13} /></button>

                        <button
                          onClick={() => { setSelectedUser(u); setShowActionModal(true) }}
                          title="Manage access"
                          style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FFF1F2'; e.currentTarget.style.color = '#A11D4A'; e.currentTarget.style.borderColor = '#FECACA' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}
                        ><Shield size={13} /></button>

                        <button
                          onClick={() => { setSelectedUser(u); setNewTempPass(''); setShowResetModal(true) }}
                          title="Reset password"
                          style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FFFBEB'; e.currentTarget.style.color = '#D4AF37'; e.currentTarget.style.borderColor = '#FDE68A' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}
                        ><Key size={13} /></button>

                        <button
                          onClick={() => viewActivity(u)}
                          title="View activity"
                          style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F0FDFA'; e.currentTarget.style.color = '#0F766E'; e.currentTarget.style.borderColor = '#99F6E4' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = '#E2E8F0' }}
                        ><Eye size={13} /></button>
                      </div>
                    )}
                    {u.id === profile.id && (
                      <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>You</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} style={{ color: '#CBD5E1' }} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>No users found</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>Adjust filters or create your first user</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: Create User
      ══════════════════════════════════════════════════════ */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); createForm.reset() }} title="Create New Portal User" size="md">
        <div style={{ padding: '0 0 16px', marginBottom: 20, borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#0A1628,#162340)' }}>
            <Crown size={16} style={{ color: '#D4AF37' }} />
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Super Admin Action — Creating a new portal user will send login credentials to their email.</p>
          </div>
        </div>

        <form onSubmit={createForm.handleSubmit(onCreateUser)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label required">Full Name</label>
              <input {...createForm.register('name')} className={`form-input ${createForm.formState.errors.name ? 'error' : ''}`} placeholder="Ravi Kumar" />
              {createForm.formState.errors.name && <span className="form-error">{createForm.formState.errors.name.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Work Email</label>
              <input {...createForm.register('email')} type="email" className={`form-input ${createForm.formState.errors.email ? 'error' : ''}`} placeholder="ravi@gktaxsolutions.services" />
              {createForm.formState.errors.email && <span className="form-error">{createForm.formState.errors.email.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label required">Initial Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...createForm.register('password')}
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${createForm.formState.errors.password ? 'error' : ''}`}
                  placeholder="Min 8 characters"
                  style={{ paddingRight: 80 }}
                />
                <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => {
                    const p = 'GK@' + Math.random().toString(36).slice(2, 6).toUpperCase() + Math.floor(10 + Math.random() * 90)
                    createForm.setValue('password', p)
                  }} style={{ fontSize: 10, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', color: '#B8942E', fontWeight: 700 }}>
                    Generate
                  </button>
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              {createForm.formState.errors.password && <span className="form-error">{createForm.formState.errors.password.message}</span>}
              <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 3, display: 'block' }}>User should change this after first login</span>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input {...createForm.register('phone')} className="form-input" placeholder="+91 9876543210" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Assign Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                {Object.entries(ROLE_META).map(([val, m]) => {
                  const RoleIcon = m.icon
                  const selected = createForm.watch('role') === val
                  return (
                    <label key={val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${selected ? m.color : '#E2E8F0'}`, background: selected ? m.bg : '#fff', transition: 'all 0.15s' }}>
                      <input {...createForm.register('role')} type="radio" value={val} style={{ display: 'none' }} />
                      <RoleIcon size={18} style={{ color: selected ? m.color : '#94A3B8' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: selected ? m.color : '#64748B', textAlign: 'center', lineHeight: 1.3 }}>{m.label}</span>
                    </label>
                  )
                })}
              </div>
              {createForm.formState.errors.role && <span className="form-error">Please select a role</span>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowCreateModal(false); createForm.reset() }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Plus size={14} /> {saving ? 'Creating…' : 'Create User & Send Access'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Edit User
      ══════════════════════════════════════════════════════ */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit User — ${selectedUser?.name}`} size="sm">
        {selectedUser && (
          <form onSubmit={editForm.handleSubmit(onEditUser)}>
            {/* User card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#0A1628,#162340)', marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#B8942E)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1628', fontSize: 14, fontWeight: 800 }}>
                {getInitials(selectedUser.name)}
              </div>
              <div>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{selectedUser.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{selectedUser.email}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Full Name</label>
                <input {...editForm.register('name')} className="form-input" />
                {editForm.formState.errors.name && <span className="form-error">{editForm.formState.errors.name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input {...editForm.register('phone')} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label required">Role</label>
                <select {...editForm.register('role')} className="form-input">
                  {Object.entries(ROLE_META).map(([val, m]) => <option key={val} value={val}>{m.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Account Status</label>
                <select {...editForm.register('status')} className="form-input">
                  {Object.entries(STATUS_META).map(([val, m]) => <option key={val} value={val}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Access Control Actions
      ══════════════════════════════════════════════════════ */}
      <Modal isOpen={showActionModal} onClose={() => setShowActionModal(false)} title="Manage Account Access" size="sm">
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* User pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0A1628,#162340)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: 12, fontWeight: 800 }}>
                {getInitials(selectedUser.name)}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13 }}>{selectedUser.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <RolePill role={selectedUser.role} />
                  <StatusPill status={selectedUser.status || 'active'} />
                </div>
              </div>
            </div>

            {/* Actions */}
            {(selectedUser.status !== 'active') && (
              <button onClick={() => applyStatus(selectedUser.id, 'active')} style={actionBtnStyle('#16A34A')}>
                <CheckCircle size={15} /> Activate Account
              </button>
            )}
            {selectedUser.status !== 'suspended' && (
              <button onClick={() => applyStatus(selectedUser.id, 'suspended')} style={actionBtnStyle('#D97706')}>
                <Clock size={15} /> Suspend Account
                <span style={{ fontSize: 11, marginLeft: 'auto', opacity: 0.6 }}>Temporarily blocks login</span>
              </button>
            )}
            {selectedUser.status !== 'inactive' && (
              <button onClick={() => applyStatus(selectedUser.id, 'inactive')} style={actionBtnStyle('#64748B')}>
                <UserX size={15} /> Deactivate Account
                <span style={{ fontSize: 11, marginLeft: 'auto', opacity: 0.6 }}>Disables login</span>
              </button>
            )}
            {selectedUser.status !== 'banned' && (
              <button onClick={() => applyStatus(selectedUser.id, 'banned')} style={actionBtnStyle('#DC2626')}>
                <XCircle size={15} /> Ban Account
                <span style={{ fontSize: 11, marginLeft: 'auto', opacity: 0.6 }}>Permanent block</span>
              </button>
            )}

            <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />
            <button style={actionBtnStyle('#64748B')} onClick={() => { setShowActionModal(false) }}>
              Cancel
            </button>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Password Reset
      ══════════════════════════════════════════════════════ */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Password Reset" size="sm">
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p style={{ fontWeight: 700, fontSize: 13 }}>{selectedUser.name}</p>
              <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{selectedUser.email}</p>
            </div>

            {/* Option 1: Send reset email */}
            <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>Option 1 — Send Reset Email</p>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>User will receive a password reset link at their registered email.</p>
              <button className="btn btn-primary btn-sm" onClick={sendPasswordReset} disabled={saving}>
                <Mail size={13} /> {saving ? 'Sending…' : 'Send Reset Email'}
              </button>
            </div>

            {/* Option 2: Generate temp password */}
            <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>Option 2 — Generate Temporary Password</p>
              <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Generate a temp password to share with the user directly.</p>
              {newTempPass ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#B8942E' }}>{newTempPass}</span>
                  <button onClick={() => copyToClipboard(newTempPass)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#16A34A' : '#94A3B8', padding: 4 }}>
                    {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              ) : (
                <button className="btn btn-gold btn-sm" onClick={generateTempPass}>
                  <Key size={13} /> Generate Password
                </button>
              )}
              {newTempPass && (
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>⚠ Share securely. User must change this on first login.</p>
              )}
            </div>

            <button className="btn btn-outline" onClick={() => setShowResetModal(false)}>Close</button>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Activity Log
      ══════════════════════════════════════════════════════ */}
      <Modal isOpen={showActivityModal} onClose={() => setShowActivityModal(false)} title={`Activity Log — ${selectedUser?.name}`} size="lg">
        {activityLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activityLogs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: 14, padding: '12px 4px', borderBottom: i < activityLogs.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4AF37', marginTop: 4, flexShrink: 0 }} />
                  {i < activityLogs.length - 1 && <div style={{ width: 1, flex: 1, background: '#F1F5F9', minHeight: 20 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{log.action?.replace(/_/g, ' ')}</p>
                  {log.table_name && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Table: {log.table_name} {log.record_id ? `· ID: ${log.record_id?.slice(0, 8)}…` : ''}</p>}
                  <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>{formatDateTime(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No activity recorded for this user</div>
        )}
      </Modal>
    </div>
  )
}
