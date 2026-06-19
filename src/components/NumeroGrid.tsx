'use client'

import { useMemo } from 'react'
import { NumeroStatus } from '@/types'
import { formatNumero } from '@/lib/utils'

interface NumeroInfo {
  numero: number
  status: NumeroStatus
}

interface Props {
  total: number
  numeros: NumeroInfo[]
  selecionados: number[]
  onToggle: (n: number) => void
  disabled?: boolean
}

const STATUS_CLASS: Record<NumeroStatus, string> = {
  available: 'bg-white border-gray-300 hover:border-green-500 hover:bg-green-50 cursor-pointer text-gray-700',
  reserved:  'bg-yellow-100 border-yellow-400 text-yellow-700 cursor-not-allowed',
  paid:      'bg-green-500 border-green-600 text-white cursor-not-allowed',
}

export default function NumeroGrid({ total, numeros, selecionados, onToggle, disabled }: Props) {
  const digits = total.toString().length

  const statusMap = useMemo(() => {
    const map: Record<number, NumeroStatus> = {}
    numeros.forEach(n => { map[n.numero] = n.status })
    return map
  }, [numeros])

  const selecionadoSet = useMemo(() => new Set(selecionados), [selecionados])

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${digits > 3 ? 64 : 52}px, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => i + 1).map(n => {
        const status = statusMap[n] || 'available'
        const selected = selecionadoSet.has(n)
        const isAvailable = status === 'available'

        return (
          <button
            key={n}
            disabled={disabled || !isAvailable}
            onClick={() => isAvailable && onToggle(n)}
            className={`
              border rounded text-xs font-mono py-1 transition-all duration-100
              ${STATUS_CLASS[status]}
              ${selected && isAvailable
                ? '!bg-green-500 !border-green-600 !text-white !scale-105 shadow-md'
                : ''}
            `}
            title={
              status === 'paid' ? 'Número vendido'
              : status === 'reserved' ? 'Número reservado'
              : selected ? 'Selecionado — clique para remover'
              : 'Disponível — clique para selecionar'
            }
          >
            {formatNumero(n, total)}
          </button>
        )
      })}
    </div>
  )
}
