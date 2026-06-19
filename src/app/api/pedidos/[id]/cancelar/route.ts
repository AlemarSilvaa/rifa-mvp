import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseAuth = createServerSupabase()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const supabase = createServiceSupabase()

    // Libera números
    await supabase
      .from('numeros')
      .update({ status: 'available', reserved_by: null, pedido_id: null, reserved_at: null, expires_at: null })
      .eq('pedido_id', params.id)
      .eq('status', 'reserved')

    // Cancela pedido
    const { error } = await supabase
      .from('pedidos')
      .update({ status: 'cancelado' })
      .eq('id', params.id)
      .eq('status', 'pendente')

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Erro cancelar pedido:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
