import { useState, useEffect } from 'react'
import { Menu, Bell, Search, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../lib/utils'

export default function Topbar({ onMenuToggle }) {
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <Menu size={18} />
        </button>
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads, clients…"
            className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg w-64 focus:outline-none focus:border-[#D4AF37] focus:bg-white transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="hidden md:block text-xs text-slate-400 font-medium">
          {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#A11D4A] rounded-full" />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-100">
          <div className="w-8 h-8 rounded-full bg-[#0B1026] flex items-center justify-center text-[#D4AF37] text-xs font-700">
            {getInitials(profile?.name)}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-600 text-slate-700">{profile?.name || 'User'}</p>
            <p className="text-xs text-slate-400 capitalize">{profile?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
