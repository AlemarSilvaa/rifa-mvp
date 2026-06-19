'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

interface Props {
  payload: string
  valor: number
}

export default function QRCodePix({ payload, valor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, payload, { width: 220, margin: 2 })
    }
  }, [payload])

  async function copiar() {
    await navigator.clipboard.writeText(payload)
    setCopied(true)
    toast.success('Código PIX copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-xl border-2 border-green-200">
      <div className="text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Pague via PIX</p>
        <p className="text-2xl font-bold text-green-600">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
        </p>
      </div>

      <canvas ref={canvasRef} className="rounded-lg shadow" />

      <button
        onClick={copiar}
        className={`w-full py-3 rounded-lg font-semibold transition-all
          ${copied
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'}`}
      >
        {copied ? '✓ Copiado!' : '📋 Copiar código PIX'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Após o pagamento, aguarde a confirmação pelo administrador.
        Você receberá uma notificação.
      </p>
    </div>
  )
}
