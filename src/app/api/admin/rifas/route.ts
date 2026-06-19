import { createServiceSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const db = createServiceSupabase()
  const body = await req.json()

  const { data, error } = await db.from('rifas').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Criar todos os números da rifa de uma vez
  const numeros = Array.from({ length: body.total_numeros }, (_, i) => ({
    rifa_id: data.id,
    numero: i + 1,
    status: 'available',
  }))

  // Inserir em lotes de 1000 para não estourar o limite
  const BATCH = 1000
  for (let i = 0; i < numeros.length; i += BATCH) {
    await db.from('numeros').insert(numeros.slice(i, i + BATCH))
  }

  return NextResponse.json(data, { status: 201 })
}
