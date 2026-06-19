'use client'

import { useEffect, useState } from 'react'

interface Props {
  expiresAt: string
  onExpired: () => void
}

export default function ContadorReserva({ expiresAt, onExpired }: Props) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    function calcRemaining() {
      return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    }

    setSeconds(calcRemaining())
    const interval = setInterval(() => {
      const rem = calcRemaining()
      setSeconds(rem)
      if (rem === 0) {
        clearInterval(interval)
        onExpired()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  const urgent = seconds < 120

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold
      ${urgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-yellow-100 text-yellow-800'}`}>
      <span>⏱</span>
      <span>{min.toString().padStart(2, '0')}:{sec.toString().padStart(2, '0')}</span>
      <span className="text-sm font-normal">para expirar</span>
    </div>
  )
}
