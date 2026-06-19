'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { gerarPayloadPix } from '@/lib/pix'
import { formatCurrency, formatDate, formatNumero, whatsappLink } from '@/lib/utils'
import QRCodePix from '@/components/QRCodePix'
import ContadorReserva from '@/components/ContadorReserva'

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const pedidoId = searchParams.get('pedido')
  const [pedido, setPedido] = useState<any>(null)
  const [rifa, setRifa] = useState<any>(null)
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!pedidoId) return
    const supabase = createClient()

    async function load() {
      const { data: p } = await supabase
        .from('pedidos')
        .select('*, clientes(*), rifas(*)')
        .eq('id', pedidoId)
        .single()

      if (p) {
        setPedido(p)
        setRifa(p.rifas)
      }
      setLoading(false)
    }

    load()

    // Realtime: atualiza quando pedido for confirmado
    const channel = supabase
      .channel(`pedido-${pedidoId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos',
        filter: `id=eq.${pedidoId}`,
      }, payload => {
        setPedido((prev: any) => ({ ...prev, ...payload.new }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [pedidoId])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>
  if (!pedido) return <div className="min-h-screen flex items-center justify-center text-gray-400">Pedido não encontrado.</div>

  if (pedido.status === 'pago') {
    const wppMsg = `Olá! Confirmei o pagamento do pedido #${pedido.id.slice(0, 8).toUpperCase()} da rifa "${rifa?.titulo}". Meus números: ${pedido.numeros.join(', ')}. Nome: ${pedido.clientes?.nome}`
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-bold text-green-700">Pagamento Confirmado!</h1>
          <p className="text-gray-600">Seus números estão garantidos. Boa sorte!</p>
          <div className="bg-green-50 rounded-xl p-4 text-left">
            <p className="text-sm text-gray-500 mb-2">Seus números:</p>
            <div className="flex flex-wrap gap-1">
              {pedido.numeros.sort((a: number, b: number) => a - b).map((n: number) => (
                <span key={n} className="bg-green-600 text-white text-xs px-2 py-1 rounded font-mono">
                  {formatNumero(n, rifa.total_numeros)}
                </span>
              ))}
            </div>
            <p className="text-xl font-bold text-green-700 mt-3">{formatCurrency(pedido.valor_total)}</p>
          </div>
          <a href={whatsappLink(pedido.clientes?.whatsapp || '', wppMsg)}
            target="_blank"
            className="block w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors">
            📱 Compartilhar no WhatsApp
          </a>
          <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600">Voltar ao início</Link>
        </div>
      </div>
    )
  }

  if (expired || pedido.status === 'cancelado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">⏰</div>
          <h1 className="text-xl font-bold text-red-700">Reserva Expirada</h1>
          <p className="text-gray-500">Seu tempo de pagamento expirou e os números foram liberados.</p>
          <Link href={`/rifa/${rifa?.slug}`}
            className="block bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">
            Tentar novamente
          </Link>
        </div>
      </div>
    )
  }

  const pixKey = rifa?.pix_key || process.env.NEXT_PUBLIC_PIX_KEY || ''
  const pixNome = rifa?.pix_nome || process.env.NEXT_PUBLIC_PIX_NOME || 'Rifa Online'
  const pixCidade = rifa?.pix_cidade || process.env.NEXT_PUBLIC_PIX_CIDADE || 'Brasil'
  const pixPayload = gerarPayloadPix(pixKey, pixNome, pixCidade, pedido.valor_total, pedido.id.slice(0, 25))

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/rifa/${rifa?.slug}`} className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</Link>
          <span className="text-sm font-medium text-gray-700">Pagamento</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Timer */}
        {pedido.expires_at && (
          <div className="flex justify-center">
            <ContadorReserva expiresAt={pedido.expires_at} onExpired={() => setExpired(true)} />
          </div>
        )}

        {/* Resumo do pedido */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-bold text-gray-800 mb-3">Resumo do pedido</h2>
          <p className="text-sm text-gray-500 mb-1">{rifa?.titulo}</p>
          <div className="flex flex-wrap gap-1 mb-3 max-h-24 overflow-y-auto">
            {pedido.numeros.sort((a: number, b: number) => a - b).map((n: number) => (
              <span key={n} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-mono">
                {formatNumero(n, rifa.total_numeros)}
              </span>
            ))}
          </div>
          <div className="flex justify-between items-center border-t pt-3">
            <span className="text-gray-600">{pedido.quantidade} número{pedido.quantidade > 1 ? 's' : ''}</span>
            <span className="text-xl font-bold text-green-700">{formatCurrency(pedido.valor_total)}</span>
          </div>
        </div>

        {/* PIX */}
        {pixKey && <QRCodePix payload={pixPayload} valor={pedido.valor_total} />}

        {!pixKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-800 font-medium">Chave PIX não configurada</p>
            <p className="text-yellow-700 text-sm">Configure no painel administrativo</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Pedido #{pedido.id.slice(0, 8).toUpperCase()} · {formatDate(pedido.created_at)}
        </p>
      </div>
    </main>
  )
}
