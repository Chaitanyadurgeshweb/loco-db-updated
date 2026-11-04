
import { createClient } from '@/lib/supabase/server'
import { ApproveActions } from './ApproveActions'

export default async function RequestPreview({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: req } = await supabase.from('approval_requests').select('*, submitter:submitted_by(email)').eq('id', params.id).single()
  const { data: items } = await supabase.from('bulk_upload_items').select('*').eq('request_id', params.id)
  const { data: loco } = req?.locomotive_number ? await supabase.from('locomotives').select('*').eq('loco_number', req.locomotive_number).single() : { data: null }

  if (!req) return <div className="p-10">Request not found</div>

  const diff = (old:any, ne:any) => {
    if (!old) return Object.keys(ne||{}).map(k=>({field:k, old:'-', new: ne[k]}))
    return Object.keys({ ...old, ...ne }).filter(k=>JSON.stringify(old[k])!==JSON.stringify(ne[k])).map(k=>({field:k, old: old[k], new: ne[k]}))
  }
  const changes = diff(req.previous_data, req.proposed_data)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Request {req.id.slice(0,8)} – {req.request_type}</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5 space-y-2">
          <h3 className="font-semibold">Submission Info</h3>
          <div className="text-sm space-y-1"><div>Submitted By: {req.submitter?.email}</div><div>Date: {new Date(req.submitted_at).toLocaleString()}</div><div>Status: {req.status}</div><div>Reason: {req.reason || '-'}</div><div>Comment: {req.admin_comment || '-'}</div></div>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-2">Diff</h3>
          <table className="w-full text-sm"><thead><tr><th className="text-left">Field</th><th className="text-left">Old</th><th className="text-left">New</th></tr></thead><tbody>{changes.map((c:any)=><tr key={c.field} className="border-t"><td className="p-2 font-mono">{c.field}</td><td className="p-2 bg-red-50">{String(c.old||'-')}</td><td className="p-2 bg-green-50">{String(c.new||'-')}</td></tr>)}</tbody></table>
        </div>
      </div>
      {loco && <div className="bg-white border rounded-xl p-5"><h3 className="font-semibold">Existing Live Data</h3><pre className="text-xs bg-slate-50 p-3 rounded overflow-auto">{JSON.stringify(loco, null, 2)}</pre></div>}
      <div className="bg-white border rounded-xl p-5"><h3 className="font-semibold">Proposed Data</h3><pre className="text-xs bg-slate-50 p-3 rounded overflow-auto">{JSON.stringify(req.proposed_data, null, 2)}</pre></div>
      {items && items.length>0 && <div className="bg-white border rounded-xl p-5"><h3 className="font-semibold">Bulk Items ({items.length})</h3><div className="overflow-auto max-h-[400px]"><table className="w-full text-xs"><thead><tr><th>Row</th><th>Loco</th><th>Status</th><th>Missing</th></tr></thead><tbody>{items.map((it:any)=><tr key={it.id} className="border-t"><td>{it.row_number}</td><td>{it.locomotive_number}</td><td>{it.status}</td><td>{(it.missing_fields||[]).join(', ')}</td></tr>)}</tbody></table></div></div>}
      <ApproveActions requestId={req.id} status={req.status} />
    </div>
  )
}
