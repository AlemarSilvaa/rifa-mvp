'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import NumeroGrid from '@/components/NumeroGrid'
import { Rifa } from '@/types'
import { formatCurrency, formatNumero, validarCPF } from '@/lib/utils'

const LOTES = [1, 5, 10, 25, 50, 100]
const RESERVA_MINUTOS = Number(process.env.NEXT_PUBLIC_RESERVA_MINUTOS || 15)

interface NumeroInfo { numero: number; status: 'available' | 'reserved' | 'paid' }

interface Props {
  rifa: Rifa
  numeros: NumeroInfo[]
}

export default function SeletorNumeros({ rifa, numeros }: Props) {
  const router = useRouter()
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [step, setStep] = useState<'selecao' | 'dados'>('selecao')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({ nome: '', cpf: '', whatsapp: '', email: '' })

  const disponiveis = useMemo(
    () => numeros.filter(n => n.status === 'available').map(n => n.numero),
    [numeros]
  )

  const toggle = useCallback((n: number) => {
    setSelecionados(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    )
  }, [])

  function escolherAleatorio(qtd: number) {
    const pool = [...disponiveis].filter(n => !selecionados.includes(n))
    const escolhidos: number[] = []
    while (escolhidos.length < qtd && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length)
      escolhidos.push(pool.splice(idx, 1)[0])
    }
    if (escolhidos.length < qtd) {
      toast.error(`Apenas ${disponiveis.length} números disponíveis`)
    }
    setSelecionados(prev => [...prev, ...escolhidos])
  }

  function removerTodos() { setSelecionados([]) }

  const total = selecionados.length * rifa.valor_numero

  async function confirmarPedido() {
    if (!selecionados.length) return toast.error('Selecione ao menos 1 número')

    const cpfLimpo = form.cpf.replace(/\D/g, '')
    if (!form.nome.trim()) return toast.error('Informe seu nome')
    if (!validarCPF(cpfLimpo)) return toast.error('CPF inválido')
    if (form.whatsapp.replace(/\D/g, '').length < 10) return toast.error('WhatsApp inválido')
    if (!form.email.includes('@')) return toast.error('E-mail inválido')

    setLoading(true)
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rifa_id: rifa.id,
          numeros: selecionados,
          ...form,
          cpf: cpfLimpo,
          whatsapp: form.whatsapp.replace(/\D/g, ''),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar pedido')

      router.push(`/rifa/${rifa.slug}/checkout?pedido=${data.pedido_id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'dados') {
    return (
      <div className="bg-white rounded-2xl shadow p-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('selecao')} className="text-gray-400 hover:text-gray-600">←</button>
          <h2 className="text-lg font-bold text-gray-800">Seus dados</h2>
        </div>

        {/* Resumo */}
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-2">
            {selecionados.length} número{selecionados.length > 1 ? 's' : ''} selecionado{selecionados.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto mb-2">
            {selecionados.sort((a,b)=>a-b).map(n => (
              <span key={n} className="bg-green-600 text-white text-xs px-2 py-0.5 rounded font-mono">
                {formatNumero(n, rifa.total_numeros)}
              </span>
            ))}
          </div>
          <p className="text-xl font-bold text-green-700">{formatCurrency(total)}</p>
        </div>

        {/* Formulário */}
        <div className="space-y-3">
          {[
            { key: 'nome', label: 'Nome completo', type: 'text', placeholder: 'João da Silva' },
            { key: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
            { key: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '(47) 99999-9999' },
            { key: 'email', label: 'E-mail', type: 'email', placeholder: 'joao@email.com' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}
        </div>

        <button
          onClick={confirmarPedido}
          disabled={loading}
          className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Reservando...' : `Reservar e Pagar ${formatCurrency(total)}`}
        </button>

        <p className="text-xs text-center text-gray-400">
          Os números ficam reservados por {RESERVA_MINUTOS} minutos enquanto você realiza o pagamento.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-5">
      <h2 className="text-lg font-bold text-gray-800">Escolha seus números</h2>

      {/* Botões de lote */}
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Escolher aleatoriamente:</p>
        <div className="flex flex-wrap gap-2">
          {LOTES.map(qtd => (
            <button
              key={qtd}
              onClick={() => escolherAleatorio(qtd)}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              +{qtd}
            </button>
          ))}
          <button
            onClick={removerTodos}
            className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-white border border-gray-300 inline-block" /> Disponível</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-500 inline-block" /> Selecionado</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-200 border border-yellow-400 inline-block" /> Reservado</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-600 inline-block" /> Pago</span>
      </div>

      {/* Grade */}
      <div className="max-h-96 overflow-y-auto pr-1">
        <NumeroGrid
          total={rifa.total_numeros}
          numeros={numeros}
          selecionados={selecionados}
          onToggle={toggle}
        />
      </div>

      {/* Rodapé sticky */}
      {selecionados.length > 0 && (
        <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">{selecionados.length} número{selecionados.length > 1 ? 's' : ''}</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(total)}</p>
            </div>
            <button
              onClick={() => setStep('dados')}
              className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
            >
              Continuar →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
