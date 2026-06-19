'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatDate, formatNumero, whatsappLink } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPedidos() }, [filtroStatus])

  async function loadPedidos() {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('pedidos')
      .select('*, clientes(*), rifas(titulo, total_numeros, slug)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filtroStatus !== 'todos') query = query.eq('status', filtroStatus)

    const { data } = await query
    setPedidos(data || [])
    setLoading(false)
  }

  async function confirmar(id: string) {
    const ok = confirm('Confirmar pagamento deste pedido?')
    if (!ok) return
    const res = await fetch(`/api/pedidos/${id}/confirmar`, { method: 'POST' })
    if (res.ok) { toast.success('Pago confirmado!'); loadPedidos() }
    else toast.error('Erro ao confirmar')
  }

  async function cancelar(id: string) {
    const ok = confirm('Cancelar este pedido e liberar os números?')
    if (!ok) return
    const res = await fetch(`/api/pedidos/${id}/cancelar`, { method: 'POST' })
    if (res.ok) { toast.success('Pedido cancelado'); loadPedidos() }
    else toast.error('Erro ao cancelar')
  }

  const filtrados = pedidos.filter(p => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      p.clientes?.nome?.toLowerCase().includes(q) ||
      p.clientes?.cpf?.includes(q) ||
      p.clientes?.whatsapp?.includes(q) ||
      p.id.includes(q)
    )
  })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Pedidos</h1>

      <div className="flex flex-wrap gap-3">
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF, WhatsApp..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="todos">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Pedido', 'Cliente', 'Rifa', 'Números', 'Valor', 'Status', 'Data', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      #{p.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.clientes?.nome}</p>
                      <p className="text-xs text-gray-400">{p.clientes?.whatsapp}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-32 truncate">{p.rifas?.titulo}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-0.5 max-w-48">
                        {p.numeros.slice(0, 5).map((n: number) => (
                          <span key={n} className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded font-mono">
                            {formatNumero(n, p.rifas?.total_numeros || 1000)}
                          </span>
                        ))}
                        {p.numeros.length > 5 && (
                          <span className="text-xs text-gray-400">+{p.numeros.length - 5}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">{formatCurrency(p.valor_total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${p.status === 'pago' ? 'bg-green-100 text-green-700'
                        : p.status === 'cancelado' ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {p.status === 'pendente' && (
                          <>
                            <button onClick={() => confirmar(p.id)}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200">
                              ✓ Pagar
                            </button>
                            <button onClick={() => cancelar(p.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">
                              ✕
                            </button>
                          </>
                        )}
                        {p.clientes?.whatsapp && (
                          <a href={whatsappLink(p.clientes.whatsapp, `Olá ${p.clientes.nome}! Seu pedido #${p.id.slice(0,8).toUpperCase()} está ${p.status}.`)}
                            target="_blank"
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">
                            📱
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtrados.length && (
              <div className="text-center py-10 text-gray-400">Nenhum pedido encontrado.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
