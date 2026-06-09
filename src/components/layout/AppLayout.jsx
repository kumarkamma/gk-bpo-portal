import { useState, useRef, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { ChevronDown } from 'lucide-react'

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [showScroll, setShowScroll] = useState(false)
  const mainRef = useRef(null)

  // Show arrow only when there's more content below
  const handleScroll = useCallback(() => {
    const el = mainRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    setShowScroll(!atBottom)
  }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    // Check on mount in case page is already scrollable
    handleScroll()
    el.addEventListener('scroll', handleScroll)
    // Re-check when content changes (children update)
    const ro = new ResizeObserver(handleScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', handleScroll); ro.disconnect() }
  }, [handleScroll])

  function scrollDown() {
    const el = mainRef.current
    if (!el) return
    el.scrollBy({ top: el.clientHeight * 0.75, behavior: 'smooth' })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F4F6FA' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
        <Topbar onMenuToggle={() => setCollapsed(p => !p)} />
        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollBehavior: 'smooth' }}>
          {children}
        </main>

        {/* ── Floating scroll-down arrow ── */}
        {showScroll && (
          <button
            onClick={scrollDown}
            title="Scroll down"
            style={{
              position: 'absolute',
              bottom: 28,
              right: 28,
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0A1628, #162340)',
              border: '2px solid rgba(212,175,55,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(10,22,40,0.25)',
              zIndex: 50,
              animation: 'scrollBounce 1.6s ease-in-out infinite',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.12)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(212,175,55,0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(10,22,40,0.25)'
            }}
          >
            <ChevronDown size={20} color="#D4AF37" strokeWidth={2.5} />
          </button>
        )}

        {/* bounce keyframe */}
        <style>{`
          @keyframes scrollBounce {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(5px); }
          }
        `}</style>
      </div>
    </div>
  )
}
