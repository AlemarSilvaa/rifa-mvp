import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceSupabase } from '@/lib/supabase-server'
import { formatCurrency, formatDate } from '@/lib/utils'
import BarraProgresso from '@/components/BarraProgresso'
import SeletorNumeros from './SeletorNumeros'

export const revalidate = 30

interface Props { params: { slug: string } }

export default async function RifaPage({ params }: Props) {
  const supabase = createServiceSupabase()

  const { data: rifa } = await supabase
    .from('rifas')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!rifa || rifa.status === 'rascunho') return notFound()

  const { data: numerosDB } = await supabase
    .from('numeros')
    .select('numero, status')
    .eq('rifa_id', rifa.id)

  const numeros = numerosDB || []
  const pagos = numeros.filter(n => n.status === 'paid').length
  const reservados = numeros.filter(n => n.status === 'reserved').length

  const sorteada = rifa.status === 'sorteada'

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-600 font-medium truncate">{rifa.titulo}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {rifa.foto_url && (
            <img src={rifa.foto_url} alt={rifa.titulo}
              className="w-full max-h-80 object-cover" />
          )}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{rifa.titulo}</h1>
                {rifa.data_sorteio && (
                  <p className="text-sm text-gray-500 mt-1">🗓 Sorteio: {formatDate(rifa.data_sorteio)}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-green-600">{formatCurrency(rifa.valor_numero)}</p>
                <p className="text-xs text-gray-400">por número</p>
              </div>
            </div>

            {rifa.descricao && (
              <p className="mt-4 text-gray-600 whitespace-pre-wrap">{rifa.descricao}</p>
            )}

            <div className="mt-6">
              <BarraProgresso
                total={rifa.total_numeros}
                vendidos={pagos}
                reservados={reservados}
              />
            </div>

            {sorteada && (
              <Link href={`/rifa/${rifa.slug}/resultado`}
                className="mt-4 block w-full text-center bg-yellow-400 text-yellow-900 font-bold py-3 rounded-xl hover:bg-yellow-500 transition-colors">
                🏆 Ver Resultado do Sorteio
              </Link>
            )}
          </div>
        </div>

        {/* Grade de números */}
        {!sorteada && rifa.status === 'ativa' && (
          <SeletorNumeros rifa={rifa} numeros={numeros} />
        )}

        {rifa.status === 'encerrada' && (
          <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-500">
            <p className="text-lg font-semibold">Esta rifa está encerrada.</p>
            <p className="text-sm">O sorteio será realizado em breve.</p>
          </div>
        )}
      </div>
    </main>
  )
}
