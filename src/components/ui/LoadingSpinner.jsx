export default function LoadingSpinner({ size = 'md', text = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${s[size]} border-2 border-slate-200 border-t-[#D4AF37] rounded-full animate-spin`} />
      {text && <p className="text-sm text-slate-500">{text}</p>}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="table-container">
      <div className="p-4 border-b border-slate-100">
        <div className="skeleton h-5 w-48 rounded" />
      </div>
      <table className="data-table">
        <thead>
          <tr>{Array(cols).fill(0).map((_, i) => (
            <th key={i}><div className="skeleton h-3 w-20 rounded" /></th>
          ))}</tr>
        </thead>
        <tbody>{Array(rows).fill(0).map((_, i) => (
          <tr key={i}>{Array(cols).fill(0).map((_, j) => (
            <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  )
}
