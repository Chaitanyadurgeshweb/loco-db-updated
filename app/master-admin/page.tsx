
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function MasterDashboard() {
  const supabase = createClient()
  const { data: stats } = await supabase.from('approval_requests').select('status, request_type')
  const total = stats?.length || 0
  const approved = stats?.filter(s=>s.status==='approved').length || 0
  const pending = stats?.filter(s=>s.status==='pending').length || 0
  const declined = stats?.filter(s=>s.status==='declined').length || 0
  const add = stats?.filter(s=>s.request_type==='add').length || 0
  const mod = stats?.filter(s=>s.request_type==='edit').length || 0
  const bulk = stats?.filter(s=>s.request_type==='bulk_upload').length || 0

  const { data: requests } = await supabase.from('approval_requests').select('*, submitter:submitted_by(email)').order('submitted_at', { ascending: false }).limit(100)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Master Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          ['Total Requests', total, 'bg-slate-900 text-white'],
          ['Pending', pending, 'bg-amber-100 text-amber-900'],
          ['Approved', approved, 'bg-green-100 text-green-900'],
          ['Declined', declined, 'bg-red-100 text-red-900'],
          ['New Additions', add, 'bg-blue-100'],
          ['Modifications', mod, 'bg-purple-100'],
          ['Bulk Uploads', bulk, 'bg-indigo-100']
        ].map(([label, val, cls])=><div key={label as string} className={`rounded-xl p-4 border ${cls}`}><div className="text-xs uppercase tracking-wide opacity-70">{label}</div><div className="text-2xl font-bold">{val as number}</div></div>)}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 font-semibold border-b">Approval Management</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3 text-left">Request ID</th><th className="p-3">Type</th><th className="p-3">Submitted By</th><th className="p-3">Date</th><th className="p-3">Loco No</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
            <tbody>{requests?.map((r:any)=><tr key={r.id} className="border-t hover:bg-slate-50"><td className="p-3 font-mono text-xs">{r.id.slice(0,8)}</td><td className="p-3"><span className="px-2 py-1 bg-slate-100 rounded-full text-xs">{r.request_type}</span></td><td className="p-3">{r.submitter?.email}</td><td className="p-3">{new Date(r.submitted_at).toLocaleString()}</td><td className="p-3 font-mono">{r.locomotive_number || 'BULK'}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${r.status==='pending'?'bg-amber-100 text-amber-800': r.status==='approved'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{r.status}</span></td><td className="p-3"><Link href={`/master-admin/requests/${r.id}`} className="text-blue-600 hover:underline">Preview</Link></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
