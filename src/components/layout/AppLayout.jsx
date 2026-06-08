import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useLenis } from '../../hooks/useAnimations'

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  useLenis()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F4F6FA' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar onMenuToggle={() => setCollapsed(p => !p)} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
