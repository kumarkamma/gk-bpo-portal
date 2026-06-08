import { useRef } from 'react'
import { useCountAnimation } from '../../hooks/useAnimations'
import { ArrowUpRight } from 'lucide-react'

const COLOR_MAP = {
  navy:    { icon: '#2563EB', bg: '#EFF6FF' },
  gold:    { icon: '#D4AF37', bg: '#FFFBEB' },
  burgundy:{ icon: '#A11D4A', bg: '#FFF1F2' },
  green:   { icon: '#16A34A', bg: '#DCFCE7' },
  orange:  { icon: '#D97706', bg: '#FEF3C7' },
  purple:  { icon: '#7C3AED', bg: '#F5F3FF' },
  teal:    { icon: '#0F766E', bg: '#F0FDFA' },
  red:     { icon: '#DC2626', bg: '#FEE2E2' },
}

export default function StatCard({ title, value, icon: Icon, color = 'navy', prefix = '', suffix = '', animate = true, delta }) {
  const countRef = useRef(null)
  const numVal = typeof value === 'number' ? value : parseFloat(value) || 0
  const c = COLOR_MAP[color] || COLOR_MAP.navy

  useCountAnimation(animate ? countRef : { current: null }, numVal)

  const displayValue = prefix === '₹'
    ? `₹${numVal >= 100000 ? (numVal / 100000).toFixed(1) + 'L' : numVal.toLocaleString('en-IN')}`
    : `${prefix}${animate ? '' : numVal.toLocaleString()}${suffix}`

  return (
    <div className="stat-card stagger-item">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon && <Icon size={18} style={{ color: c.icon }} />}
        </div>
        <ArrowUpRight size={13} style={{ color: '#E2E8F0' }} />
      </div>
      <p className="stat-card-label">{title}</p>
      <p className="stat-card-value font-poppins">
        {prefix === '₹' ? (
          animate ? displayValue : displayValue
        ) : (
          <>
            {prefix}
            <span ref={countRef}>{animate ? '0' : numVal.toLocaleString()}</span>
            {suffix}
          </>
        )}
      </p>
      {delta && (
        <div className={`stat-card-delta ${delta.up ? 'up' : 'down'}`} style={{ marginTop: 8 }}>
          {delta.up ? '↑' : '↓'} {delta.value}
          <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 2 }}>{delta.label}</span>
        </div>
      )}
    </div>
  )
}
