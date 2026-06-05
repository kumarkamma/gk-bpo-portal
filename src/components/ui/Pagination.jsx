import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange, totalRows }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
      <div className="text-xs text-slate-500">
        {totalRows > 0 ? `Showing ${Math.min((page - 1) * pageSize + 1, totalRows)}–${Math.min(page * pageSize, totalRows)} of ${totalRows.toLocaleString()}` : 'No records'}
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:border-[#D4AF37]"
          >
            {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(1)} disabled={page === 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500 transition-colors">
            <ChevronsLeft size={14} />
          </button>
          <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs px-3 py-1.5 bg-[#0B1026] text-white rounded font-semibold">
            {page} / {totalPages || 1}
          </span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500 transition-colors">
            <ChevronRight size={14} />
          </button>
          <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500 transition-colors">
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
