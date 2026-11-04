
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ApproveActions({ requestId, status }: { requestId: string, status: string }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function approve(){
    if (!confirm('Confirm approval? This will update live database.')) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('approve_request', { p_request_id: requestId, p_master_id: user?.id })
    if (error) alert(error.message); else { alert('Approved and live updated'); location.href='/master-admin' }
    setLoading(false)
  }
  async function decline(){
    if (!reason) { alert('Provide decline reason'); return }
    if (!confirm('Confirm decline?')) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.rpc('decline_request', { p_request_id: requestId, p_master_id: user?.id, p_reason: reason })
    if (error) alert(error.message); else { alert('Declined'); location.href='/master-admin' }
    setLoading(false)
  }

  if (status!=='pending') return <div className="p-4 bg-slate-50 rounded-xl">This request is {status}</div>

  return (
    <div className="bg-white border rounded-xl p-5 flex flex-col md:flex-row gap-4">
      <button onClick={approve} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg">Approve</button>
      <div className="flex gap-2 flex-1">
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for decline (required for decline)" className="flex-1 border rounded-lg p-2" />
        <button onClick={decline} disabled={loading} className="bg-red-600 text-white px-6 py-2 rounded-lg">Decline</button>
      </div>
    </div>
  )
}
