import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createServerSupabase()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { rifa_id } = await req.json()
    if (!rifa_id) return NextResponse.json({ error: 'rifa_id obrigatório' }, { status: 400 })

    const supabase = createServiceSupabase()

    // Verifica rifa
    const { data: rifa } = await supabase.from('rifas').select('status').eq('id', rifa_id).single()
    if (!rifa || rifa.status === 'sorteada') {
      return NextResponse.json({ error: 'Rifa não disponível para sorteio' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('realizar_sorteio', {
      p_rifa_id: rifa_id,
      p_admin_user: user.email || user.id,
    })

    if (error) throw error
    if (!data?.ok) return NextResponse.json({ error: data?.erro }, { status: 400 })

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Erro realizar sorteio:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
