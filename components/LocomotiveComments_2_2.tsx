
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LocomotiveComments({ locoNumber }: { locoNumber: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [reason, setReason] = useState('')
  const supabase = createClient()

  useEffect(()=>{ fetchData() }, [locoNumber])
  async function fetchData(){
    const { data: c } = await supabase.from('locomotive_comments').select('*, author:created_by(email)').eq('locomotive_number', locoNumber).order('created_at', { ascending: false })
    const { data: a } = await supabase.from('locomotive_activity_log').select('*, performer:performed_by(email)').eq('locomotive_number', locoNumber).order('performed_at', { ascending: false })
    setComments(c||[]); setActivity(a||[])
  }
  async function submit(){
    if (!newComment) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('locomotive_comments').insert({ locomotive_number: locoNumber, comment: newComment, reason, created_by: user?.id })
    await supabase.from('locomotive_activity_log').insert({ locomotive_number: locoNumber, action: 'commented', performed_by: user?.id, reason: reason, field_name: 'comment' })
    setNewComment(''); setReason(''); fetchData()
  }
  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-5 space-y-3">
        <h3 className="font-semibold">Add Comment & Reason</h3>
        <textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Admin comment..." className="w-full border rounded-lg p-3 h-20" />
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for update (e.g. Verified details)" className="w-full border rounded-lg p-3" />
        <button onClick={submit} className="bg-slate-900 text-white px-4 py-2 rounded-lg">Submit Comment</button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <h4 className="font-semibold mb-3">Comments ({comments.length})</h4>
          <div className="space-y-3 max-h-[400px] overflow-auto">{comments.map(c=><div key={c.id} className="border-b py-2"><div className="text-sm">{c.comment}</div><div className="text-xs text-slate-500">{c.reason} • {c.author?.email} • {new Date(c.created_at).toLocaleString()}</div></div>)}</div>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <h4 className="font-semibold mb-3">Activity History</h4>
          <div className="space-y-3 max-h-[400px] overflow-auto">{activity.map(a=><div key={a.id} className="border-b py-2 text-sm"><span className="font-mono">{a.locomotive_number}</span> – {a.action} {a.field_name?`(${a.field_name}: ${a.old_value} → ${a.new_value})`:''}<div className="text-xs text-slate-500">{a.performer?.email} on {new Date(a.performed_at).toLocaleString()} {a.reason?`• Reason: ${a.reason}`:''}</div></div>)}</div>
        </div>
      </div>
    </div>
  )
}
