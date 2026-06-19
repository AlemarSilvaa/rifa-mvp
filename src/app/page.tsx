import Link from 'next/link'
import { createServiceSupabase } from '@/lib/supabase-server'
import { Rifa } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export const revalidate = 60

export default async function HomePage() {
  const supabase = createServiceSupabase()
  const { data: rifas } = await supabase
    .from('rifas')
    .select('*')
    .eq('status', 'ativa')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-green-700">🎟️ Rifa Online</h1>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            Painel Admin
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Campanhas Ativas</h2>
        <p className="text-gray-500 mb-8">Escolha sua rifa e boa sorte! 🍀</p>

        {!rifas?.length ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🎫</div>
            <p className="text-lg">Nenhuma rifa ativa no momento.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rifas.map((rifa: Rifa) => (
              <RifaCard key={rifa.id} rifa={rifa} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

async function RifaCard({ rifa }: { rifa: Rifa }) {
  const supabase = createServiceSupabase()
  const { count: vendidos } = await supabase
    .from('numeros')
    .select('*', { count: 'exact', head: true })
    .eq('rifa_id', rifa.id)
    .eq('status', 'paid')

  const pct = Math.round(((vendidos || 0) / rifa.total_numeros) * 100)

  return (
    <Link href={`/rifa/${rifa.slug}`}
      className="bg-white rounded-2xl shadow hover:shadow-lg transition-shadow overflow-hidden group">
      {rifa.foto_url ? (
        <img src={rifa.foto_url} alt={rifa.titulo}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-6xl">
          🎁
        </div>
      )}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{rifa.titulo}</h3>
        <p className="text-2xl font-extrabold text-green-600 mb-3">
          {formatCurrency(rifa.valor_numero)}
          <span className="text-sm font-normal text-gray-400 ml-1">/ número</span>
        </p>

        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{vendidos || 0} vendidos</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {rifa.data_sorteio && (
          <p className="text-xs text-gray-400">🗓 Sorteio: {formatDate(rifa.data_sorteio)}</p>
        )}

        <div className="mt-3 w-full bg-green-600 text-white text-center py-2 rounded-lg text-sm font-semibold group-hover:bg-green-700 transition-colors">
          Participar →
        </div>
      </div>
    </Link>
  )
}
