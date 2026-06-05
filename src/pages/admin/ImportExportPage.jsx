import { useEffect, useRef, useState } from 'react'
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useStaggerAnimation } from '../../hooks/useAnimations'

export default function ImportExportPage() {
  const containerRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  useStaggerAnimation(containerRef)

  async function handleFile(file) {
    if (!file) return
    setImporting(true)
    setResult(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)

        if (!rows.length) { setResult({ success: false, message: 'No rows found in file' }); setImporting(false); return }

        const leads = rows.map(row => ({
          client_name: row['Client Name'] || row['client_name'] || row['Name'] || '',
          mobile: String(row['Mobile'] || row['mobile'] || row['Phone'] || '').replace(/\D/g, ''),
          alternate_mobile: String(row['Alternate Mobile'] || row['alternate_mobile'] || ''),
          email: row['Email'] || row['email'] || '',
          city: row['City'] || row['city'] || '',
          state: row['State'] || row['state'] || '',
          occupation: row['Occupation'] || row['occupation'] || '',
          source: row['Source'] || row['source'] || 'Excel Import',
          data_batch_number: row['Batch'] || row['batch'] || '',
          pan_available: row['PAN Available'] === 'Yes' || row['pan_available'] === true,
          status: row['Status'] || row['status'] || 'New Lead',
        })).filter(l => l.client_name && l.mobile)

        if (!leads.length) { setResult({ success: false, message: 'No valid leads found. Ensure columns: Client Name, Mobile' }); setImporting(false); return }

        // Batch insert in chunks of 100
        let inserted = 0, errors = 0
        for (let i = 0; i < leads.length; i += 100) {
          const { error } = await supabase.from('leads').insert(leads.slice(i, i + 100))
          if (error) errors += Math.min(100, leads.length - i)
          else inserted += Math.min(100, leads.length - i)
        }

        setResult({ success: errors === 0, message: `Imported ${inserted} leads successfully. ${errors ? `${errors} failed.` : ''}`, count: inserted })
      } catch (err) {
        setResult({ success: false, message: err.message })
      }
      setImporting(false)
    }
    reader.readAsBinaryString(file)
  }

  async function downloadTemplate() {
    const template = [
      {
        'Client Name': 'Rajesh Kumar', 'Mobile': '9876543210', 'Alternate Mobile': '',
        'Email': 'rajesh@example.com', 'City': 'Mumbai', 'State': 'Maharashtra',
        'Occupation': 'Salaried', 'Source': 'Website', 'Batch': 'B001',
        'PAN Available': 'Yes', 'Status': 'New Lead',
      }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Template')
    XLSX.writeFile(wb, 'GK_Lead_Import_Template.xlsx')
  }

  return (
    <div ref={containerRef}>
      <div className="page-header stagger-item">
        <h1 className="page-title">Import / Export</h1>
        <p className="page-subtitle">Bulk upload leads and export data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import */}
        <div className="stagger-item">
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 rounded-xl"><Upload size={20} className="text-blue-600" /></div>
              <div>
                <h3 className="font-700 text-[#0B1026]">Import Leads</h3>
                <p className="text-xs text-slate-400">Upload Excel or CSV file</p>
              </div>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-[#D4AF37] bg-amber-50' : 'border-slate-200 hover:border-[#D4AF37] hover:bg-slate-50'}`}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <FileSpreadsheet size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-600 text-slate-500">Drop file here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv supported</p>
              <input id="fileInput" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {importing && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-600">
                <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                Importing leads…
              </div>
            )}

            {result && (
              <div className={`flex items-start gap-2 mt-4 p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {result.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                <span>{result.message}</span>
              </div>
            )}

            <button onClick={downloadTemplate} className="btn-secondary w-full justify-center mt-4">
              <Download size={15} /> Download Template
            </button>
          </div>
        </div>

        {/* Column Mapping Guide */}
        <div className="stagger-item">
          <div className="stat-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-50 rounded-xl"><AlertCircle size={20} className="text-amber-600" /></div>
              <div>
                <h3 className="font-700 text-[#0B1026]">Import Guide</h3>
                <p className="text-xs text-slate-400">Required and optional columns</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { col: 'Client Name', req: true, note: 'Full name of the lead' },
                { col: 'Mobile', req: true, note: '10 digit mobile number' },
                { col: 'Alternate Mobile', req: false, note: 'Secondary contact' },
                { col: 'Email', req: false, note: 'Email address' },
                { col: 'City', req: false, note: 'City/Town' },
                { col: 'State', req: false, note: 'State name' },
                { col: 'Occupation', req: false, note: 'Salaried / Business / etc.' },
                { col: 'Source', req: false, note: 'Lead source' },
                { col: 'Batch', req: false, note: 'Data batch identifier' },
                { col: 'PAN Available', req: false, note: 'Yes / No' },
                { col: 'Status', req: false, note: 'Defaults to New Lead' },
              ].map(({ col, req, note }) => (
                <div key={col} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{col}</code>
                  {req ? <span className="text-xs text-red-500 font-600">Required</span> : <span className="text-xs text-slate-400">Optional</span>}
                  <span className="text-xs text-slate-500 ml-auto">{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
