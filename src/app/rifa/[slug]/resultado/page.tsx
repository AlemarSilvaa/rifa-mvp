import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceSupabase } from '@/lib/supabase-server'
import { formatDate, formatNumero } from '@/lib/utils'

interface Props { params: { slug: string } }

export default async function ResultadoPage({ params }: Props) {
  const supabase = createServiceSupabase()

  const { data: rifa } = await supabase
    .from('rifas').select('*').eq('slug', params.slug).single()

  if (!rifa || rifa.status !== 'sorteada') return notFound()

  const { data: sorteio } = await supabase
    .from('sorteios')
    .select('*, clientes(nome, whatsapp)')
    .eq('rifa_id', rifa.id)
    .single()

  if (!sorteio) return notFound()

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-2">🏆</div>
          <h1 className="text-3xl font-black text-gray-800">{rifa.titulo}</h1>
          <p className="text-gray-500">Resultado do Sorteio</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-8 text-center">
            <p className="text-yellow-900 text-sm font-medium mb-2">NÚMERO SORTEADO</p>
            <p className="text-7xl font-black text-white tracking-widest">
              {formatNumero(sorteio.numero_sorteado, rifa.total_numeros)}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Vencedor</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{sorteio.clientes?.nome}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Data do sorteio</span>
                <span className="font-medium">{formatDate(sorteio.realizado_em)}</span>
              </div>
              {sorteio.realizado_por && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Realizado por</span>
                  <span className="font-medium">{sorteio.realizado_por}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Link href="/" className="block text-center text-sm text-gray-400 hover:text-gray-600">
          ← Ver outras rifas
        </Link>
      </div>
    </main>
  )
}
