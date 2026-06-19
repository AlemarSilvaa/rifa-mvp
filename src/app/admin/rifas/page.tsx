import { createServerSupabase, createServiceSupabase } from '@/lib/supabase-server'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function RifasAdminPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createServiceSupabase()
  const { data: rifas } = await db
    .from('rifas')
    .select('*, numeros(count)')
    .order('created_at', { ascending: false })

  const statusLabel: Record<string, string> = {
    rascunho: 'Rascunho',
    ativa: 'Ativa',
    encerrada: 'Encerrada',
    sorteada: 'Sorteada',
  }
  const statusColor: Record<string, string> = {
    rascunho: 'bg-gray-100 text-gray-600',
    ativa: 'bg-green-100 text-green-700',
    encerrada: 'bg-red-100 text-red-700',
    sorteada: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Rifas</h1>
        <Link href="/admin/rifas/nova"
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
          + Nova Rifa
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Título', 'Slug', 'Valor/nº', 'Total', 'Status', 'Criada em', 'Ações'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(rifas || []).map((r: any) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{r.titulo}</p>
                  <p className="text-xs text-gray-400 truncate max-w-52">{r.descricao}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.slug}</td>
                <td className="px-4 py-3 font-bold text-gray-700">{formatCurrency(r.valor_numero)}</td>
                <td className="px-4 py-3 text-gray-600">{r.total_numeros?.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[r.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel[r.status] || r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/admin/rifas/${r.id}`}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors">
                      Editar
                    </Link>
                    <Link href={`/rifa/${r.slug}`} target="_blank"
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                      Ver
                    </Link>
                    {r.status === 'ativa' && (
                      <Link href={`/admin/sorteio/${r.id}`}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium hover:bg-yellow-200 transition-colors">
                        Sorteio
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!rifas || rifas.length === 0) && (
          <div className="text-center py-14 text-gray-400">
            <p className="text-4xl mb-3">🎟️</p>
            <p className="text-sm">Nenhuma rifa criada ainda.</p>
            <Link href="/admin/rifas/nova" className="mt-3 inline-block text-sm text-green-600 hover:underline">
              Criar primeira rifa →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
