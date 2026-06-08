export default function LoadingSpinner({ size = 'md', text = '' }) {
  const s = { sm: 16, md: 32, lg: 44 }[size] || 32
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{
        width: s, height: s, borderRadius: '50%',
        border: `3px solid #E4E8F0`,
        borderTopColor: '#D4AF37',
        animation: 'spin 0.7s linear infinite',
      }} />
      {text && <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>{text}</p>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="table-container">
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E4E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="skeleton" style={{ height: 14, width: 120, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 14, width: 60, borderRadius: 4 }} />
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {Array(cols).fill(0).map((_, i) => (
              <th key={i}><div className="skeleton" style={{ height: 10, width: 60, borderRadius: 3 }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(rows).fill(0).map((_, i) => (
            <tr key={i}>
              {Array(cols).fill(0).map((_, j) => (
                <td key={j}><div className="skeleton" style={{ height: 14, width: j === 0 ? 140 : 80, borderRadius: 3 }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6FA' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid #E4E8F0', borderTopColor: '#D4AF37',
          animation: 'spin 0.7s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0B1026', fontFamily: 'Poppins,sans-serif' }}>GK Tax Portal</p>
        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Loading your workspace…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}
