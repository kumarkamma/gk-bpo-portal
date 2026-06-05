import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, PhoneCall, UserCheck, FileText, CreditCard,
  BarChart3, Settings, ChevronDown, ChevronRight, Building2, ClipboardList,
  TrendingUp, Calendar, Upload, LogOut, Shield, UserCog, Briefcase
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../lib/constants'
import { getInitials } from '../../lib/utils'

const navConfig = {
  [ROLES.SUPER_ADMIN]: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Leads', icon: Users, path: '/leads' },
    { label: 'Clients', icon: UserCheck, path: '/clients' },
    { label: 'Call Logs', icon: PhoneCall, path: '/calls' },
    { label: 'Filings', icon: FileText, path: '/filings' },
    { label: 'Payments', icon: CreditCard, path: '/payments' },
    { label: 'Attendance', icon: Calendar, path: '/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/reports' },
    { label: 'Import / Export', icon: Upload, path: '/import-export' },
    { label: 'Audit Logs', icon: Shield, path: '/audit-logs' },
    { label: 'User Management', icon: UserCog, path: '/users' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ],
  [ROLES.SUPERVISOR]: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Leads', icon: Users, path: '/leads' },
    { label: 'Clients', icon: UserCheck, path: '/clients' },
    { label: 'Call Logs', icon: PhoneCall, path: '/calls' },
    { label: 'Attendance', icon: Calendar, path: '/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/reports' },
  ],
  [ROLES.BPO_AGENT]: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'My Leads', icon: Users, path: '/leads' },
    { label: 'Call Logs', icon: PhoneCall, path: '/calls' },
    { label: 'Follow-Ups', icon: ClipboardList, path: '/followups' },
    { label: 'Attendance', icon: Calendar, path: '/attendance' },
  ],
  [ROLES.AUDITOR]: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'My Clients', icon: UserCheck, path: '/clients' },
    { label: 'Filings', icon: FileText, path: '/filings' },
    { label: 'Documents', icon: Upload, path: '/documents' },
  ],
  [ROLES.ACCOUNTS]: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Payments', icon: CreditCard, path: '/payments' },
    { label: 'Revenue', icon: TrendingUp, path: '/revenue' },
    { label: 'Reports', icon: BarChart3, path: '/reports' },
  ],
}

export default function Sidebar({ collapsed, onToggle }) {
  const { profile, signOut } = useAuth()
  const role = profile?.role || ROLES.BPO_AGENT
  const navItems = navConfig[role] || navConfig[ROLES.BPO_AGENT]

  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: '#0B1026', width: collapsed ? 64 : 240, transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center shrink-0">
          <Building2 size={16} className="text-[#0B1026]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-700 text-sm leading-tight truncate">GK Tax</p>
            <p className="text-[#D4AF37] text-xs truncate">Consultancy</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={collapsed ? label : ''}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Signout */}
      <div className="px-2 pb-4 pt-2 border-t border-white/10 space-y-1">
        {!collapsed && profile && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0B1026] text-xs font-700 shrink-0">
              {getInitials(profile.name)}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-600 truncate">{profile.name}</p>
              <p className="text-white/40 text-xs truncate capitalize">{profile.role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          className="sidebar-link w-full"
          title={collapsed ? 'Sign Out' : ''}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
