'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'ativa', label: 'Ativa' },
  { value: 'encerrada', label: 'Encerrada' },
]

export default function EditarRifaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNova = id === 'nova'

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    slug: '',
    valor_numero: '',
    total_numeros: '100',
    pix_key: '',
    pix_nome: '',
    pix_cidade: '',
    foto_url: '',
    status: 'rascunho',
    data_sorteio: '',
  })
  const [loading, setLoading] = useState(!isNova)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (isNova) return
    const supabase = createClient()
    supabase.from('rifas').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) { toast.error('Rifa não encontrada'); router.push('/admin/rifas'); return }
      setForm({
        titulo: data.titulo || '',
        descricao: data.descricao || '',
        slug: data.slug || '',
        valor_numero: String(data.valor_numero || ''),
        total_numeros: String(data.total_numeros || '100'),
        pix_key: data.pix_key || '',
        pix_nome: data.pix_nome || '',
        pix_cidade: data.pix_cidade || '',
        foto_url: data.foto_url || '',
        status: data.status || 'rascunho',
        data_sorteio: data.data_sorteio ? data.data_sorteio.slice(0, 16) : '',
      })
      setLoading(false)
    })
  }, [id, isNova, router])

  function gerarSlug(titulo: string) {
    return titulo
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  }

  function set(field: string, value: string) {
    setForm(f => {
      const next = { ...f, [field]: value }
      if (field === 'titulo' && isNova) next.slug = gerarSlug(value)
      return next
    })
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo || !form.slug || !form.valor_numero || !form.pix_key || !form.pix_nome || !form.pix_cidade) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }
    setSalvando(true)

    const payload = {
      titulo: form.titulo,
      descricao: form.descricao,
      slug: form.slug,
      valor_numero: parseFloat(form.valor_numero),
      total_numeros: parseInt(form.total_numeros),
      pix_key: form.pix_key,
      pix_nome: form.pix_nome,
      pix_cidade: form.pix_cidade,
      foto_url: form.foto_url || null,
      status: form.status,
      data_sorteio: form.data_sorteio || null,
    }

    const res = await fetch(isNova ? '/api/admin/rifas' : `/api/admin/rifas/${id}`, {
      method: isNova ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    setSalvando(false)

    if (!res.ok) { toast.error(data.error || 'Erro ao salvar'); return }
    toast.success(isNova ? 'Rifa criada!' : 'Rifa atualizada!')
    router.push('/admin/rifas')
  }

  if (loading) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/rifas" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-gray-800">{isNova ? 'Nova Rifa' : 'Editar Rifa'}</h1>
      </div>

      <form onSubmit={salvar} className="space-y-5">
        {/* Informações básicas */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Informações básicas</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex: Rifa Beneficente 2025" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL) *</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
              <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-300">/rifa/</span>
              <input value={form.slug} onChange={e => set('slug', e.target.value)}
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                placeholder="minha-rifa-2025" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Descreva o prêmio e a causa beneficente..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL da Foto</label>
            <input value={form.foto_url} onChange={e => set('foto_url', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://..." />
          </div>
        </div>

        {/* Configurações */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Configurações</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor por número (R$) *</label>
              <input type="number" step="0.01" min="0.01" value={form.valor_numero}
                onChange={e => set('valor_numero', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="5.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total de números *</label>
              <input type="number" min="10" max="100000" value={form.total_numeros}
                onChange={e => set('total_numeros', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="100" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Sorteio</label>
              <input type="datetime-local" value={form.data_sorteio}
                onChange={e => set('data_sorteio', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </div>

        {/* PIX */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Configuração PIX</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX *</label>
            <input value={form.pix_key} onChange={e => set('pix_key', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do recebedor *</label>
              <input value={form.pix_nome} onChange={e => set('pix_nome', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="João Silva" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
              <input value={form.pix_cidade} onChange={e => set('pix_cidade', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="São Paulo" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/rifas"
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-center text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={salvando}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            {salvando ? 'Salvando...' : isNova ? 'Criar Rifa' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
