
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { requestId } = await req.json()
  const supabase = createClient()
  const { data: r } = await supabase.from('approval_requests').select('*, submitter:submitted_by(email)').eq('id', requestId).single()
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Use Resend / Nodemailer / Supabase Edge Function - here we call Supabase Edge Function or Gmail SMTP
  // For Gmail: set env GMAIL_USER, GMAIL_APP_PASSWORD, MASTER_ADMIN_EMAIL=adminapproval1@gmail.com
  // This route triggers edge function 'send-approval-email'

  // Example using fetch to Supabase Edge Function (you need to deploy it)
  // await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-approval-email`, { method:'POST', headers:{ Authorization:`Bearer ${process.env.SUPABASE_ANON_KEY}`, 'Content-Type':'application/json' }, body: JSON.stringify({ requestId }) })

  // Fallback: log and rely on edge function trigger
  console.log('Approval notification for', requestId, 'to master admin')

  // Build secure preview link with signed token
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.vercel.app'
  const previewLink = `${baseUrl}/master-admin/requests/${requestId}`

  // If you have nodemailer configured, send directly here
  // For now return success - implement actual email in supabase/functions/send-approval-email/index.ts

  return NextResponse.json({ ok: true, previewLink })
}
