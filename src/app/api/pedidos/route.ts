import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-server'

const RESERVA_MINUTOS = Number(process.env.NEXT_PUBLIC_RESERVA_MINUTOS || 15)

export async function POST(req: NextRequest) {
  try {
    const { rifa_id, numeros, nome, cpf, whatsapp, email } = await req.json()

    if (!rifa_id || !numeros?.length || !nome || !cpf || !whatsapp || !email) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
    }

    if (numeros.length > 200) {
      return NextResponse.json({ error: 'Máximo de 200 números por pedido' }, { status: 400 })
    }

    const supabase = createServiceSupabase()

    // Busca rifa
    const { data: rifa } = await supabase.from('rifas').select('*').eq('id', rifa_id).single()
    if (!rifa || rifa.status !== 'ativa') {
      return NextResponse.json({ error: 'Rifa não disponível' }, { status: 400 })
    }

    // Valida se números pertencem ao range da rifa
    if (numeros.some((n: number) => n < 1 || n > rifa.total_numeros)) {
      return NextResponse.json({ error: 'Número fora do range da rifa' }, { status: 400 })
    }

    // Busca ou cria cliente (por CPF)
    let { data: cliente } = await supabase.from('clientes').select('id').eq('cpf', cpf).single()
    if (!cliente) {
      const { data: novoCliente, error } = await supabase
        .from('clientes').insert({ nome, cpf, whatsapp, email }).select('id').single()
      if (error) throw error
      cliente = novoCliente
    }

    const expiresAt = new Date(Date.now() + RESERVA_MINUTOS * 60 * 1000).toISOString()
    const valorTotal = numeros.length * rifa.valor_numero

    // Cria pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        rifa_id,
        cliente_id: cliente.id,
        numeros,
        quantidade: numeros.length,
        valor_total: valorTotal,
        status: 'pendente',
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (pedidoError) throw pedidoError

    // Garante que os registros de números existam (upsert)
    const numerosInsert = numeros.map((n: number) => ({
      rifa_id,
      numero: n,
      status: 'available',
    }))
    await supabase.from('numeros').upsert(numerosInsert, {
      onConflict: 'rifa_id,numero',
      ignoreDuplicates: true,
    })

    // Reserva os números via função protegida contra concorrência
    const { data: resultado, error: reservaError } = await supabase
      .rpc('reservar_numeros', {
        p_rifa_id: rifa_id,
        p_numeros: numeros,
        p_cliente_id: cliente.id,
        p_pedido_id: pedido.id,
        p_expires_at: expiresAt,
      })

    if (reservaError) throw reservaError

    if (!resultado?.ok) {
      // Cancela o pedido criado
      await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', pedido.id)
      return NextResponse.json({ error: resultado?.erro || 'Números não disponíveis' }, { status: 409 })
    }

    return NextResponse.json({ pedido_id: pedido.id, expires_at: expiresAt })
  } catch (err: any) {
    console.error('Erro criar pedido:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
