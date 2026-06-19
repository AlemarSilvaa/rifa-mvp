import { createServiceSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServiceSupabase()
  const body = await req.json()

  const { data: existente } = await db.from('rifas').select('total_numeros, status').eq('id', params.id).single()
  if (existente && body.total_numeros !== existente.total_numeros && existente.status !== 'rascunho') {
    return NextResponse.json({ error: 'Não é possível alterar o total de números de uma rifa já ativa.' }, { status: 400 })
  }

  const { data, error } = await db.from('rifas').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServiceSupabase()

  const { error } = await db.from('rifas').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
