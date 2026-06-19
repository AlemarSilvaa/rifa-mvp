'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatNumero, validarCPF } from '@/lib/utils'
import NumeroGrid from '@/components/NumeroGrid'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function VendaManualPage() {
  const router = useRouter()
  const [rifas, setRifas] = useState<any[]>([])
  const [rifaId, setRifaId] = useState('')
  const [rifa, setRifa] = useState<any>(null)
  const [numeros, setNumeros] = useState<any[]>([])
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [loadingNumeros, setLoadingNumeros] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState<any>(null)

  const [form, setForm] = useState({ nome: '', cpf: '', whatsapp: '', email: '', observacao: '' })

  useEffect(() => {
    createClient()
      .from('rifas')
      .select('id, titulo, valor_numero, total_numeros, status')
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRifas(data || []))
  }, [])

  useEffect(() => {
    if (!rifaId) { setRifa(null); setNumeros([]); setSelecionados([]); return }
    const r = rifas.find(x => x.id === rifaId)
    setRifa(r)
    setSelecionados([])
    setLoadingNumeros(true)
    createClient()
      .from('numeros')
      .select('numero, status')
      .eq('rifa_id', rifaId)
      .then(({ data }) => {
        setNumeros(data || [])
        setLoadingNumeros(false)
      })
  }, [rifaId, rifas])

  function toggleNumero(n: number) {
    setSelecionados(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    )
  }

  // Preenche aleatoriamente N números disponíveis
  function sortear(qtd: number) {
    const disponiveis = numeros
      .filter(n => n.status === 'available' && !selecionados.includes(n.numero))
      .map(n => n.numero)
    const escolhidos: number[] = []
    const pool = [...disponiveis]
    while (escolhidos.length < qtd && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length)
      escolhidos.push(pool.splice(idx, 1)[0])
    }
    if (escolhidos.length < qtd) toast.error(`Só ${disponiveis.length} disponíveis`)
    setSelecionados(prev => [...new Set([...prev, ...escolhidos])])
  }

  function setField(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function mascaraCPF(v: string) {
    v = v.replace(/\D/g, '').slice(0, 11)
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
    setField('cpf', v)
  }

  function mascaraWpp(v: string) {
    v = v.replace(/\D/g, '').slice(0, 11)
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3')
    setField('whatsapp', v)
  }

  const cpfValido = validarCPF(form.cpf)
  const formValido = form.nome.trim().length > 2 && cpfValido && form.whatsapp.replace(/\D/g, '').length >= 10 && selecionados.length > 0

  async function registrar() {
    if (!formValido) return
    setSalvando(true)
    try {
      const res = await fetch('/api/admin/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rifa_id: rifaId,
          numeros: selecionados,
          nome: form.nome.trim(),
          cpf: form.cpf.replace(/\D/g, ''),
          whatsapp: form.whatsapp.replace(/\D/g, ''),
          email: form.email.trim(),
          observacao: form.observacao.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erro ao registrar'); return }
      setSucesso({ ...data, nome: form.nome, numeros: selecionados })
      toast.success('Venda registrada com sucesso!')
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  function novaVenda() {
    setSucesso(null)
    setSelecionados([])
    setForm({ nome: '', cpf: '', whatsapp: '', email: '', observacao: '' })
    // Recarrega números atualizados
    if (rifaId) {
      setLoadingNumeros(true)
      createClient()
        .from('numeros').select('numero, status').eq('rifa_id', rifaId)
        .then(({ data }) => { setNumeros(data || []); setLoadingNumeros(false) })
    }
  }

  // Tela de sucesso
  if (sucesso) {
    return (
      <div className="p-6 max-w-lg">
        <div className="bg-white rounded-2xl shadow p-8 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-gray-800">Venda registrada!</h2>
          <p className="text-gray-500 text-sm">Os números já estão marcados como <strong>PAGOS</strong> no sistema.</p>
          <div className="bg-green-50 rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-semibold text-gray-700">{sucesso.nome}</p>
            <div className="flex flex-wrap gap-1.5">
              {sucesso.numeros.sort((a: number, b: number) => a - b).map((n: number) => (
                <span key={n} className="bg-green-600 text-white text-xs font-mono font-bold px-2 py-1 rounded">
                  {formatNumero(n, rifa?.total_numeros || 1000)}
                </span>
              ))}
            </div>
            <p className="text-sm font-bold text-green-700 pt-1">{formatCurrency(sucesso.valor_total)}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={novaVenda}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
              + Registrar outra venda
            </button>
            <Link href="/admin/pedidos"
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold text-center hover:bg-gray-50 transition-colors">
              Ver pedidos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-xl">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Venda em dinheiro</h1>
          <p className="text-sm text-gray-400">Registra a compra diretamente como paga, sem passar pelo PIX.</p>
        </div>
      </div>

      {/* Seleção de rifa */}
      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Qual rifa?</label>
        <select value={rifaId} onChange={e => setRifaId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Selecione uma rifa...</option>
          {rifas.map(r => (
            <option key={r.id} value={r.id}>
              {r.titulo} — {formatCurrency(r.valor_numero)}/nº
            </option>
          ))}
        </select>
      </div>

      {rifa && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Grid de números */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Selecione os números</p>
              <button onClick={() => setSelecionados([])}
                className="text-xs text-red-400 hover:text-red-600">
                Limpar seleção
              </button>
            </div>

            {/* Lotes rápidos */}
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 5, 10, 20, 50].map(n => (
                <button key={n} onClick={() => sortear(n)}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-full hover:bg-green-50 hover:border-green-400 hover:text-green-700 transition-colors">
                  +{n} aleatório{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>

            {loadingNumeros ? (
              <div className="text-center py-8 text-gray-400 text-sm">Carregando números...</div>
            ) : (
              <NumeroGrid
                total={rifa.total_numeros}
                numeros={numeros}
                selecionados={selecionados}
                onToggle={toggleNumero}
              />
            )}

            {/* Legenda */}
            <div className="flex gap-4 text-xs text-gray-400 flex-wrap pt-1">
              {[
                { color: 'bg-green-100 border-green-300', label: 'Disponível' },
                { color: 'bg-green-600', label: 'Selecionado' },
                { color: 'bg-yellow-100 border-yellow-300', label: 'Reservado' },
                { color: 'bg-gray-200', label: 'Pago' },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded border ${color} inline-block`} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            {/* Resumo seleção */}
            {selecionados.length > 0 && (
              <div className="bg-green-600 rounded-xl p-4 text-white">
                <p className="text-green-100 text-xs mb-1">
                  {selecionados.length} número{selecionados.length > 1 ? 's' : ''}
                </p>
                <p className="text-2xl font-bold">{formatCurrency(selecionados.length * rifa.valor_numero)}</p>
                <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                  {[...selecionados].sort((a, b) => a - b).map(n => (
                    <span key={n} className="bg-white/20 text-white text-xs font-mono px-1.5 py-0.5 rounded">
                      {formatNumero(n, rifa.total_numeros)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Dados do comprador</p>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nome completo *</label>
                <input value={form.nome} onChange={e => setField('nome', e.target.value)}
                  placeholder="João da Silva"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">CPF *</label>
                <input value={form.cpf} onChange={e => mascaraCPF(e.target.value)}
                  placeholder="000.000.000-00" maxLength={14}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${form.cpf && !cpfValido ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                {form.cpf && !cpfValido && <p className="text-xs text-red-400 mt-1">CPF inválido</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">WhatsApp *</label>
                <input value={form.whatsapp} onChange={e => mascaraWpp(e.target.value)}
                  placeholder="(11) 99999-0000" maxLength={15}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">E-mail <span className="text-gray-300">(opcional)</span></label>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                  placeholder="joao@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Observação <span className="text-gray-300">(opcional)</span></label>
                <input value={form.observacao} onChange={e => setField('observacao', e.target.value)}
                  placeholder="Ex: pagou na feira, evento X..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {!formValido && selecionados.length === 0 && (
                <p className="text-xs text-gray-400">Selecione ao menos 1 número para continuar.</p>
              )}

              <button onClick={registrar} disabled={!formValido || salvando}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {salvando ? 'Registrando...' : '💵 Registrar venda em dinheiro'}
              </button>

              <p className="text-xs text-center text-gray-400">
                Os números serão marcados como <strong>PAGOS</strong> imediatamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {!rifa && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          <p className="text-3xl mb-3">💵</p>
          <p className="text-sm">Selecione uma rifa acima para começar.</p>
        </div>
      )}
    </div>
  )
}
