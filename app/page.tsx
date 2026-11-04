import { createClient } from '@/lib/supabase/server'
export default async function Home(){
  const supabase = createClient()
  const { count } = await supabase.from('locomotives').select('*',{count:'exact', head:true})
  return (<div className="min-h-screen"><header className="bg-slate-900 text-white p-4 flex justify-between"><div className="font-bold">Loco Portal</div><nav className="flex gap-4 text-sm"><a href="/about">About</a><a href="/legal">Legal</a><a href="/admin/login" className="bg-white text-slate-900 px-3 py-1 rounded">Admin</a></nav></header><main className="max-w-6xl mx-auto p-10 space-y-6"><h1 className="text-4xl font-bold">Independent Locomotive Reference</h1><p>Total locomotives: {count ?? '—'}</p><p className="text-sm text-slate-500">Not affiliated with Indian Railways.</p></main></div>)
}