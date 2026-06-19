'use client'

interface Props {
  total: number
  vendidos: number
  reservados?: number
}

export default function BarraProgresso({ total, vendidos, reservados = 0 }: Props) {
  const pctVendidos = Math.min((vendidos / total) * 100, 100)
  const pctReservados = Math.min((reservados / total) * 100, 100 - pctVendidos)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-green-600">{vendidos} pagos</span>
        <span className="text-gray-500">{total - vendidos - reservados} disponíveis</span>
      </div>
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${pctVendidos}%` }}
        />
        <div
          className="h-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${pctReservados}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{pctVendidos.toFixed(1)}% vendido</span>
        {reservados > 0 && <span className="text-yellow-600">{reservados} reservados</span>}
        <span>{total.toLocaleString('pt-BR')} total</span>
      </div>
    </div>
  )
}
