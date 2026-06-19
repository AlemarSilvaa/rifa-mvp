'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatDate, formatNumero } from '@/lib/utils'
import Link from 'next/link'

interface Resultado {
  rifa: { titulo: string; slug: string; total_numeros: number; status: string }
  pedido: { id: string; status: string; valor_total: number; created_at: string }
  numeros: number[]
}

export default function MeusNumerosPage() {
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [erro, setErro] = useState('')

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    if (!cpf && !email) { setErro('Informe CPF ou e-mail para buscar.'); return }

    setBuscando(true)
    setErro('')
    setResultados(null)

    try {
      const supabase = createClient()

      let query = supabase.from('clientes').select('id')
      if (cpf) query = query.eq('cpf', cpf.replace(/\D/g, ''))
      else query = query.eq('email', email.toLowerCase().trim())

      const { data: clientes } = await query
      if (!clientes || clientes.length === 0) {
        setErro('Nenhum registro encontrado com esses dados.')
        setBuscando(false)
        return
      }

      const ids = clientes.map((c: any) => c.id)
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('*, rifas(titulo, slug, total_numeros, status)')
        .in('cliente_id', ids)
        .order('created_at', { ascending: false })

      if (!pedidos || pedidos.length === 0) {
        setErro('Nenhum pedido encontrado.')
        setBuscando(false)
        return
      }

      setResultados(pedidos.map((p: any) => ({
        rifa: p.rifas,
        pedido: { id: p.id, status: p.status, valor_total: p.valor_total, created_at: p.created_at },
        numeros: p.numeros || [],
      })))
    } catch {
      setErro('Erro ao buscar. Tente novamente.')
    } finally {
      setBuscando(false)
    }
  }

  const statusColor: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-700',
    pago: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Início</Link>
          <h1 className="text-lg font-bold text-gray-800">Meus Números</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-600 mb-5">
            Informe seu CPF ou e-mail cadastrado para consultar seus números.
          </p>
          <form onSubmit={buscar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                value={cpf}
                onChange={e => { setCpf(e.target.value); setEmail('') }}
                placeholder="000.000.000-00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setCpf('') }}
                placeholder="seu@email.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {erro && <p className="text-sm text-red-500">{erro}</p>}
            <button
              type="submit"
              disabled={buscando}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {buscando ? 'Buscando...' : 'Buscar meus números'}
            </button>
          </form>
        </div>

        {resultados && resultados.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{resultados.length} pedido(s) encontrado(s)</p>
            {resultados.map(r => (
              <div key={r.pedido.id} className="bg-white rounded-xl shadow p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-gray-800">{r.rifa.titulo}</h2>
                    <p className="text-xs text-gray-400">
                      Pedido #{r.pedido.id.slice(0, 8).toUpperCase()} · {formatDate(r.pedido.created_at)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[r.pedido.status] || 'bg-gray-100 text-gray-600'}`}>
                    {r.pedido.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Seus números ({r.numeros.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {r.numeros.map((n: number) => (
                      <span key={n}
                        className="bg-green-50 text-green-700 text-xs font-mono font-bold px-2 py-1 rounded border border-green-200">
                        {formatNumero(n, r.rifa.total_numeros)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-700">
                    Total: {formatCurrency(r.pedido.valor_total)}
                  </span>
                  {r.pedido.status === 'pendente' && (
                    <Link href={`/rifa/${r.rifa.slug}/checkout?pedido=${r.pedido.id}`}
                      className="text-sm text-green-600 hover:underline font-medium">
                      Pagar →
                    </Link>
                  )}
                  {r.rifa.status === 'sorteada' && (
                    <Link href={`/rifa/${r.rifa.slug}/resultado`}
                      className="text-sm text-blue-600 hover:underline font-medium">
                      Ver resultado →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
