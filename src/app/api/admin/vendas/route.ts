import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabaseAuth = createServerSupabase()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { rifa_id, numeros, nome, cpf, whatsapp, email, observacao } = await req.json()

  if (!rifa_id || !numeros?.length || !nome || !cpf || !whatsapp) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
  }

  const db = createServiceSupabase()

  // Verifica se rifa está ativa
  const { data: rifa } = await db.from('rifas').select('status, valor_numero, total_numeros').eq('id', rifa_id).single()
  if (!rifa || rifa.status !== 'ativa') {
    return NextResponse.json({ error: 'Rifa não está ativa' }, { status: 400 })
  }

  // Verifica se todos os números estão disponíveis
  const { data: ocupados } = await db
    .from('numeros')
    .select('numero, status')
    .eq('rifa_id', rifa_id)
    .in('numero', numeros)
    .neq('status', 'available')

  if (ocupados && ocupados.length > 0) {
    const lista = ocupados.map((n: any) => n.numero).join(', ')
    return NextResponse.json({ error: `Números já ocupados: ${lista}` }, { status: 409 })
  }

  // Upsert cliente por CPF
  const { data: clienteExistente } = await db.from('clientes').select('id').eq('cpf', cpf).single()
  let clienteId: string

  if (clienteExistente) {
    clienteId = clienteExistente.id
    // Atualiza dados se mudou algo
    await db.from('clientes').update({ nome, whatsapp, email: email || '' }).eq('id', clienteId)
  } else {
    const { data: novoCliente, error } = await db
      .from('clientes')
      .insert({ nome, cpf, whatsapp, email: email || '' })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: 'Erro ao cadastrar cliente: ' + error.message }, { status: 400 })
    clienteId = novoCliente.id
  }

  const valorTotal = numeros.length * Number(rifa.valor_numero)
  const agora = new Date().toISOString()

  // Cria pedido já como PAGO
  const { data: pedido, error: pedidoError } = await db
    .from('pedidos')
    .insert({
      rifa_id,
      cliente_id: clienteId,
      numeros,
      quantidade: numeros.length,
      valor_total: valorTotal,
      status: 'pago',
      pago_em: agora,
      confirmado_por: `${user.email} (dinheiro)${observacao ? ' — ' + observacao : ''}`,
    })
    .select('id')
    .single()

  if (pedidoError) return NextResponse.json({ error: pedidoError.message }, { status: 400 })

  // Marca os números como pagos diretamente
  const registros = numeros.map((n: number) => ({
    rifa_id,
    numero: n,
    status: 'paid' as const,
    reserved_by: clienteId,
    pedido_id: pedido.id,
    reserved_at: agora,
    paid_at: agora,
  }))

  const { error: numError } = await db
    .from('numeros')
    .upsert(registros, { onConflict: 'rifa_id,numero' })

  if (numError) return NextResponse.json({ error: numError.message }, { status: 400 })

  return NextResponse.json({ pedido_id: pedido.id, valor_total: valorTotal, quantidade: numeros.length })
}
