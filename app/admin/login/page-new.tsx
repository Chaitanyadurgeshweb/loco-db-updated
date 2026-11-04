
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminLogin() {
  const [email, setEmail]=useState(''); const [password,setPassword]=useState(''); const [show,setShow]=useState(false); const [loading,setLoading]=useState(false); const [err,setErr]=useState('')
  const supabase = createClient()
  async function login(e:any){
    e.preventDefault(); setLoading(true); setErr('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setErr(error.message); setLoading(false); return }
    const { data: isAdmin } = await supabase.rpc('is_admin')
    if (!isAdmin) { setErr('Not authorized as admin'); await supabase.auth.signOut(); setLoading(false); return }
    location.href='/admin'
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2"><div className="mx-auto w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold">LP</div><h1 className="text-2xl font-bold text-slate-900">Admin Login</h1><p className="text-sm text-slate-500">Loco Portal Administration</p></div>
        <form onSubmit={login} className="space-y-4">
          <div><label className="text-sm font-medium">Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="mt-1 w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none" placeholder="admin@example.com"/></div>
          <div><label className="text-sm font-medium">Password</label><div className="relative"><input value={password} onChange={e=>setPassword(e.target.value)} type={show?'text':'password'} required className="mt-1 w-full border rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-slate-900 outline-none" placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 text-sm text-slate-500">{show?'Hide':'Show'}</button></div></div>
          {err && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{err}</div>}
          <button disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-black transition disabled:opacity-50">{loading?'Signing in...':'Sign In'}</button>
        </form>
        <div className="text-xs text-center text-slate-400">Secure admin access • Session protected by RLS</div>
      </div>
    </div>
  )
}
