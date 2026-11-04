
'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'

type Summary = {
  total: number
  newRecords: number
  existing: number
  missingFields: number
  toUpdate: number
  duplicates: number
  invalid: number
}

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')

  const supabase = createClient()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const data = await f.arrayBuffer()
    const wb = XLSX.read(data)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    
    // Validate against existing DB
    const locoNumbers = rows.map(r => String(r.loco_number || r.LocoNumber || r.number).trim()).filter(Boolean)
    const { data: existing } = await supabase.from('locomotives').select('loco_number, loco_class, shed, zone, builder').in('loco_number', locoNumbers)
    const existingMap = new Map(existing?.map(e => [e.loco_number, e]) || [])

    let newRec = 0, exist = 0, dup = 0, invalid = 0, missing = 0, toUpd = 0
    const seen = new Set()
    const previewRows: any[] = []

    rows.forEach((r, idx) => {
      const num = String(r.loco_number || r.LocoNumber || '').trim()
      if (!num) { invalid++; previewRows.push({ row: idx+2, status: 'invalid', reason: 'Missing loco_number', data: r }); return }
      if (seen.has(num)) { dup++; previewRows.push({ row: idx+2, status: 'duplicate', loco_number: num }); return }
      seen.add(num)
      const old = existingMap.get(num)
      if (!old) {
        newRec++
        previewRows.push({ row: idx+2, status: 'new', loco_number: num, proposed: r })
      } else {
        exist++
        const missingFields = Object.keys(r).filter(k => r[k] && !old[k as keyof typeof old])
        if (missingFields.length > 0) { missing += missingFields.length; toUpd++; previewRows.push({ row: idx+2, status: 'existing_update', loco_number: num, missingFields, previous: old, proposed: r }) }
        else { previewRows.push({ row: idx+2, status: 'duplicate', loco_number: num, previous: old }) ; dup++ }
      }
    })

    setSummary({ total: rows.length, newRecords: newRec, existing: exist, missingFields: missing, toUpdate: toUpd, duplicates: dup, invalid })
    setPreview(previewRows)
  }

  async function submitForApproval() {
    if (!file || !summary) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Create approval request
    const { data: req, error } = await supabase.from('approval_requests').insert({
      request_type: 'bulk_upload',
      submitted_by: user.id,
      proposed_data: { fileName: file.name, summary },
      reason: comment,
      excel_file_name: file.name,
      review_notes: summary
    }).select().single()
    
    if (error) { alert(error.message); setLoading(false); return }
    
    // Insert bulk items
    const items = preview.filter(p => p.status !== 'duplicate' && p.status !== 'invalid').map(p => ({
      request_id: req.id,
      row_number: p.row,
      locomotive_number: p.loco_number,
      status: p.status,
      proposed_data: p.proposed || p.data,
      missing_fields: p.missingFields || [],
      validation_errors: p.reason ? [p.reason] : [],
      previous_data: p.previous || null
    }))
    
    if (items.length) await supabase.from('bulk_upload_items').insert(items)
    
    // Activity log
    await supabase.from('locomotive_activity_log').insert({
      locomotive_number: 'BULK',
      action: 'bulk_submitted',
      performed_by: user.id,
      reason: comment,
      request_id: req.id
    })
    
    // Trigger email via Edge Function
    await fetch('/api/notify-master', { method: 'POST', body: JSON.stringify({ requestId: req.id }) })
    
    alert('Bulk upload submitted for Master Admin approval. You will see confirmation.')
    setLoading(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Bulk Data Upload</h1>
      <p className="text-slate-600">Upload Excel using official template. Data will NOT go live until Master Admin approves.</p>
      
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-slate-900 file:text-white"/>
        <textarea placeholder="Reason for this bulk upload (required)" value={comment} onChange={e=>setComment(e.target.value)} className="w-full border rounded-lg p-3 h-24" />
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">TOTAL</div><div className="text-2xl font-bold">{summary.total}</div></div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4"><div className="text-xs text-green-700">NEW</div><div className="text-2xl font-bold text-green-800">{summary.newRecords}</div></div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><div className="text-xs text-blue-700">EXISTING</div><div className="text-2xl font-bold text-blue-800">{summary.existing}</div></div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><div className="text-xs text-amber-700">TO UPDATE</div><div className="text-2xl font-bold text-amber-800">{summary.toUpdate}</div></div>
          <div className="bg-slate-50 border rounded-xl p-4"><div className="text-xs">DUPLICATES</div><div className="text-2xl font-bold">{summary.duplicates}</div></div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4"><div className="text-xs text-red-700">INVALID</div><div className="text-2xl font-bold text-red-800">{summary.invalid}</div></div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4"><div className="text-xs text-purple-700">MISSING FIELDS</div><div className="text-2xl font-bold text-purple-800">{summary.missingFields}</div></div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="p-4 border-b font-semibold">Preview (missing-field logic: only empty fields will be filled)</div>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0"><tr><th className="p-2 text-left">Row</th><th className="p-2 text-left">Loco</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Details</th></tr></thead>
              <tbody>{preview.map((p,i)=><tr key={i} className="border-t"><td className="p-2">{p.row}</td><td className="p-2 font-mono">{p.loco_number}</td><td className="p-2"><span className={`px-2 py-1 rounded-full text-xs ${p.status==='new'?'bg-green-100 text-green-800': p.status==='existing_update'?'bg-blue-100 text-blue-800':'bg-slate-100'}`}>{p.status}</span></td><td className="p-2">{p.missingFields?.join(', ') || p.reason || '-'}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="p-4 flex justify-end"><button onClick={submitForApproval} disabled={loading || !comment} className="bg-slate-900 text-white px-6 py-2 rounded-lg disabled:opacity-50">{loading?'Submitting...':'Submit for Master Approval'}</button></div>
        </div>
      )}
    </div>
  )
}
