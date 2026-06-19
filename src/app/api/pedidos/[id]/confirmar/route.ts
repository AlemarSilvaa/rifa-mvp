import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseAuth = createServerSupabase()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const supabase = createServiceSupabase()

    const { data, error } = await supabase.rpc('confirmar_pagamento', {
      p_pedido_id: params.id,
      p_admin_user: user.email || user.id,
    })

    if (error) throw error
    if (!data?.ok) return NextResponse.json({ error: data?.erro }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Erro confirmar pagamento:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
