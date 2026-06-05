import { useState, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useLenis } from '../../hooks/useAnimations'

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  useLenis()

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FC]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuToggle={() => setCollapsed(p => !p)} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
