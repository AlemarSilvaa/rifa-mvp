'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function NovaRifaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    titulo: '', descricao: '', foto_url: '',
    valor_numero: '', total_numeros: '100',
    data_sorteio: '', pix_key: '', pix_nome: '', pix_cidade: '',
    status: 'ativa',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo || !form.valor_numero || !form.total_numeros) {
      return toast.error('Preencha os campos obrigatórios')
    }

    setLoading(true)
    const slug = slugify(form.titulo) + '-' + Date.now().toString(36)

    const res = await fetch('/api/admin/rifas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        titulo: form.titulo,
        descricao: form.descricao || null,
        foto_url: form.foto_url || null,
        valor_numero: parseFloat(form.valor_numero),
        total_numeros: parseInt(form.total_numeros),
        data_sorteio: form.data_sorteio || null,
        pix_key: form.pix_key || null,
        pix_nome: form.pix_nome || null,
        pix_cidade: form.pix_cidade || null,
        status: form.status,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error('Erro ao criar rifa: ' + (data.error || 'Tente novamente'))
      setLoading(false)
    } else {
      toast.success('Rifa criada com sucesso!')
      router.push('/admin/rifas')
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/rifas" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-gray-800">Nova Rifa</h1>
      </div>

      <form onSubmit={salvar} className="bg-white rounded-xl shadow p-6 space-y-4">
        <Field label="Título *" required>
          <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
            placeholder="Ex: Honda CG 160 2024 0km"
            className="input" required />
        </Field>

        <Field label="Descrição">
          <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
            rows={3} placeholder="Descreva o prêmio e as regras..."
            className="input" />
        </Field>

        <Field label="URL da Foto">
          <input value={form.foto_url} onChange={e => set('foto_url', e.target.value)}
            placeholder="https://..." type="url" className="input" />
          {form.foto_url && (
            <img src={form.foto_url} alt="Preview" className="mt-2 h-32 object-cover rounded-lg" />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor por número (R$) *">
            <input value={form.valor_numero} onChange={e => set('valor_numero', e.target.value)}
              type="number" step="0.01" min="0.01" placeholder="25.00"
              className="input" required />
          </Field>
          <Field label="Total de números *">
            <input value={form.total_numeros} onChange={e => set('total_numeros', e.target.value)}
              type="number" min="10" max="1000000" className="input" required />
          </Field>
        </div>

        <Field label="Data do sorteio">
          <input value={form.data_sorteio} onChange={e => set('data_sorteio', e.target.value)}
            type="datetime-local" className="input" />
        </Field>

        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Dados PIX</p>
          <div className="space-y-3">
            <Field label="Chave PIX">
              <input value={form.pix_key} onChange={e => set('pix_key', e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome (PIX)">
                <input value={form.pix_nome} onChange={e => set('pix_nome', e.target.value)}
                  placeholder="Seu Nome" className="input" />
              </Field>
              <Field label="Cidade (PIX)">
                <input value={form.pix_cidade} onChange={e => set('pix_cidade', e.target.value)}
                  placeholder="Joinville" className="input" />
              </Field>
            </div>
          </div>
        </div>

        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
            <option value="rascunho">Rascunho</option>
            <option value="ativa">Ativa</option>
          </select>
        </Field>

        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
          {loading ? 'Salvando...' : 'Criar Rifa'}
        </button>
      </form>

      <style jsx>{`
        .input { width: 100%; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { ring: 2px solid #16a34a; }
      `}</style>
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
