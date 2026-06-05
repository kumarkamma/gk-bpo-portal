import { useEffect, useRef, useState } from 'react'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useStaggerAnimation } from '../../hooks/useAnimations'
import { ROLES } from '../../lib/constants'
import { formatDate, getInitials } from '../../lib/utils'
import Modal from '../../components/ui/Modal'
import { RoleBadge } from '../../components/ui/Badges'
import { TableSkeleton } from '../../components/ui/LoadingSpinner'

export default function UsersPage() {
  const containerRef = useRef(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useStaggerAnimation(containerRef)
  const { register, handleSubmit, reset, setValue } = useForm()

  useEffect(() => { loadUsers() }, [search])

  async function loadUsers() {
    setLoading(true)
    let query = supabase.from('users').select('*')
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    const { data } = await query.order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function onSubmit(values) {
    setSaving(true)
    if (selected) {
      await supabase.from('users').update(values).eq('id', selected.id)
    } else {
      // Create auth user then profile
      const { data: authData, error } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
      })
      if (!error && authData?.user) {
        await supabase.from('users').insert({ id: authData.user.id, ...values })
      }
    }
    setSaving(false)
    setShowModal(false)
    reset()
    loadUsers()
  }

  function openEdit(u) {
    setSelected(u)
    Object.entries(u).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage team members and access control</p>
        </div>
        <button onClick={() => { setSelected(null); reset(); setShowModal(true) }} className="btn-primary">
          <Plus size={15} /> Add User
        </button>
      </div>

      <div className="stagger-item flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="form-input pl-9" />
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} cols={5} /> : (
        <div className="table-container stagger-item">
          <table className="data-table">
            <thead>
              <tr>
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
              {users.length > 0 ? users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0B1026] flex items-center justify-center text-[#D4AF37] text-xs font-700 shrink-0">
                        {getInitials(u.name)}
                      </div>
                      <span className="font-500">{u.name}</span>
                    </div>
                  </td>
                  <td className="text-sm text-slate-500">{u.email}</td>
                  <td className="text-sm">{u.phone || '—'}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {u.status || 'active'}
                    </span>
                  </td>
                  <td className="text-xs text-slate-400">{formatDate(u.created_at)}</td>
                  <td>
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title={selected ? 'Edit User' : 'Add User'} size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Full Name *</label>
            <input {...register('name')} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Email *</label>
            <input {...register('email')} type="email" className="form-input" required />
          </div>
          {!selected && (
            <div>
              <label className="form-label">Password *</label>
              <input {...register('password')} type="password" className="form-input" required minLength={6} />
            </div>
          )}
          <div>
            <label className="form-label">Phone</label>
            <input {...register('phone')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Role *</label>
            <select {...register('role')} className="form-input" required>
              <option value="">Select role</option>
              {Object.values(ROLES).map(r => (
                <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : selected ? 'Update User' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
