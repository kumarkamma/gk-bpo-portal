import { useRef } from 'react'
import { useCountAnimation } from '../../hooks/useAnimations'

export default function StatCard({ title, value, icon: Icon, color = 'gold', trend, prefix = '', suffix = '', animate = true }) {
  const countRef = useRef(null)
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0

  useCountAnimation(animate ? countRef : { current: null }, numericValue)

  const colorMap = {
    gold: { bg: 'bg-amber-50', icon: 'text-[#D4AF37]', border: 'border-amber-100' },
    burgundy: { bg: 'bg-rose-50', icon: 'text-[#A11D4A]', border: 'border-rose-100' },
    navy: { bg: 'bg-indigo-50', icon: 'text-[#0B1026]', border: 'border-indigo-100' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  }
  const c = colorMap[color] || colorMap.gold

  return (
    <div className="stat-card stagger-item">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#0B1026]">
            {prefix}
            <span ref={countRef}>{animate ? '0' : numericValue.toLocaleString()}</span>
            {suffix}
          </p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.up ? '↑' : '↓'} {trend.value} {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border} ml-3 shrink-0`}>
            <Icon size={20} className={c.icon} />
          </div>
        )}
      </div>
    </div>
  )
}
