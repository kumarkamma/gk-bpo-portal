import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const SIZE_MAP = { sm: 440, md: 560, lg: 780, xl: 1000 }

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  const overlayRef = useRef(null)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!isOpen) { document.body.style.overflow = ''; return }
    document.body.style.overflow = 'hidden'
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
    gsap.fromTo(boxRef.current,
      { opacity: 0, scale: 0.95, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'power3.out', delay: 0.05 }
    )
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={boxRef}
        className="modal-box"
        style={{ maxWidth: SIZE_MAP[size] || SIZE_MAP.md }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-accent" />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 6,
              border: '1px solid #E4E8F0', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94A3B8', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F4F6FA'; e.currentTarget.style.color = '#0F172A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Optional footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
