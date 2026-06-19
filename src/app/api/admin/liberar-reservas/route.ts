import { NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

// Chamado via Vercel Cron (vercel.json) — sem auth, apenas roda a função
export async function GET() {
  const supabase = createServiceSupabase()
  const { data, error } = await supabase.rpc('liberar_reservas_expiradas')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ liberados: data })
}
