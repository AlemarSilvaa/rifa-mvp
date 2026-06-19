'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatNumero, whatsappLink } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function SorteioPage() {
  const { rifaId } = useParams<{ rifaId: string }>()
  const router = useRouter()
  const [rifa, setRifa] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [sorteando, setSorteando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [animando, setAnimando] = useState(false)
  const [numeroAnim, setNumeroAnim] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: r } = await supabase.from('rifas').select('*').eq('id', rifaId).single()
      setRifa(r)

      const [{ count: pagos }, { count: pendentes }] = await Promise.all([
        supabase.from('numeros').select('*', { count: 'exact', head: true }).eq('rifa_id', rifaId).eq('status', 'paid'),
        supabase.from('numeros').select('*', { count: 'exact', head: true }).eq('rifa_id', rifaId).eq('status', 'reserved'),
      ])
      setStats({ pagos: pagos || 0, pendentes: pendentes || 0 })
    }
    load()
  }, [rifaId])

  async function realizarSorteio() {
    if (!confirm('Realizar o sorteio agora? Esta ação é irreversível!')) return

    setSorteando(true)
    setAnimando(true)

    // Animação de números
    const animInterval = setInterval(() => {
      setNumeroAnim(Math.floor(Math.random() * (rifa?.total_numeros || 100)) + 1)
    }, 80)

    setTimeout(async () => {
      clearInterval(animInterval)
      setAnimando(false)

      const res = await fetch('/api/admin/sorteio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rifa_id: rifaId }),
      })

      const data = await res.json()
      setSorteando(false)

      if (!res.ok) {
        toast.error(data.error || 'Erro ao realizar sorteio')
        return
      }

      setResultado(data)
      toast.success('Sorteio realizado com sucesso!')
    }, 3000)
  }

  if (!rifa) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-gray-800">Sorteio</h1>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-bold text-gray-800 mb-1">{rifa.titulo}</h2>
        <p className="text-sm text-gray-500 mb-4">{formatCurrency(rifa.valor_numero)} por número</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{stats?.pagos || 0}</p>
            <p className="text-xs text-gray-500">Números pagos</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats?.pendentes || 0}</p>
            <p className="text-xs text-gray-500">Reservados</p>
          </div>
        </div>
      </div>

      {/* Animação e resultado */}
      {(animando || resultado) && (
        <div className="bg-gray-900 rounded-2xl p-8 text-center space-y-3">
          <p className="text-gray-400 text-sm uppercase tracking-widest">
            {animando ? 'Sorteando...' : '🏆 Número Sorteado'}
          </p>
          <p className={`text-7xl font-black text-white tracking-widest transition-all ${animando ? 'blur-sm' : ''}`}>
            {animando
              ? formatNumero(numeroAnim, rifa.total_numeros)
              : formatNumero(resultado?.numero, rifa.total_numeros)}
          </p>
          {resultado && (
            <div className="mt-4 space-y-2">
              <p className="text-2xl font-bold text-yellow-400">{resultado.vencedor}</p>
              <a
                href={whatsappLink(resultado.whatsapp, `🎉 Parabéns ${resultado.vencedor}! Você ganhou! Número sorteado: ${formatNumero(resultado.numero, rifa.total_numeros)} — ${rifa.titulo}`)}
                target="_blank"
                className="inline-block mt-2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                📱 Notificar vencedor no WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {!resultado && rifa.status !== 'sorteada' && (
        <>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            ⚠️ <strong>Atenção:</strong> O sorteio é irreversível. Apenas números com status <strong>PAGO</strong> participam.
            Certifique-se de confirmar todos os pagamentos antes de continuar.
          </div>

          <button
            onClick={realizarSorteio}
            disabled={sorteando || (stats?.pagos || 0) === 0}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xl rounded-xl shadow-lg hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 transition-all disabled:cursor-not-allowed"
          >
            {sorteando ? '🎲 Sorteando...' : '🎲 REALIZAR SORTEIO'}
          </button>

          {(stats?.pagos || 0) === 0 && (
            <p className="text-center text-sm text-red-500">Nenhum número pago encontrado.</p>
          )}
        </>
      )}

      {rifa.status === 'sorteada' && !resultado && (
        <div className="bg-gray-100 rounded-xl p-6 text-center">
          <p className="font-semibold text-gray-600">Esta rifa já foi sorteada.</p>
          <Link href={`/rifa/${rifa.slug}/resultado`}
            className="mt-2 inline-block text-sm text-green-600 hover:underline">
            Ver resultado público →
          </Link>
        </div>
      )}
    </div>
  )
}
