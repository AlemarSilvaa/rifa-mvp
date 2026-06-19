import Link from 'next/link'
import { createServiceSupabase } from '@/lib/supabase-server'
import { formatCurrency, formatDate } from '@/lib/utils'

export const revalidate = 30

export default async function AdminDashboard() {
  const supabase = createServiceSupabase()

  const [
    { count: totalRifas },
    { count: pedidosPagos },
    { count: pedidosPendentes },
    { data: pedidosRecentes },
    { data: rifas },
  ] = await Promise.all([
    supabase.from('rifas').select('*', { count: 'exact', head: true }).eq('status', 'ativa'),
    supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('status', 'pago'),
    supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('pedidos')
      .select('*, clientes(nome), rifas(titulo)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('rifas').select('id, titulo, total_numeros, valor_numero, status').eq('status', 'ativa'),
  ])

  // Calcula arrecadado
  const { data: pagamentos } = await supabase
    .from('pedidos').select('valor_total').eq('status', 'pago')
  const totalArrecadado = pagamentos?.reduce((acc, p) => acc + Number(p.valor_total), 0) || 0

  const cards = [
    { label: 'Rifas Ativas', value: totalRifas || 0, icon: '🎫', color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Arrecadado', value: formatCurrency(totalArrecadado), icon: '💰', color: 'bg-green-50 text-green-700' },
    { label: 'Pedidos Pagos', value: pedidosPagos || 0, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Aguardando Pag.', value: pedidosPendentes || 0, icon: '⏳', color: 'bg-yellow-50 text-yellow-700' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <Link href="/admin/rifas/nova"
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
          + Nova Rifa
        </Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <div className="text-2xl mb-1">{c.icon}</div>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm opacity-75">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pedidos Recentes */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">Últimos Pedidos</h2>
            <Link href="/admin/pedidos" className="text-sm text-green-600 hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {pedidosRecentes?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.clientes?.nome}</p>
                  <p className="text-xs text-gray-400">{p.rifas?.titulo} · {formatDate(p.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(p.valor_total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${p.status === 'pago' ? 'bg-green-100 text-green-700'
                    : p.status === 'cancelado' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rifas Ativas */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-bold text-gray-800 mb-4">Rifas Ativas</h2>
          <div className="space-y-3">
            {rifas?.map((r: any) => (
              <div key={r.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm text-gray-800">{r.titulo}</p>
                  <Link href={`/admin/rifas/${r.id}`}
                    className="text-xs text-green-600 hover:underline">Editar</Link>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {r.total_numeros} números · {formatCurrency(r.valor_numero)} cada
                </p>
                <Link href={`/admin/sorteio/${r.id}`}
                  className="mt-2 inline-block text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium hover:bg-yellow-200 transition-colors">
                  🎲 Realizar Sorteio
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
