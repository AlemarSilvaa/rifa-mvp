export type RifaStatus = 'rascunho' | 'ativa' | 'encerrada' | 'sorteada'
export type NumeroStatus = 'available' | 'reserved' | 'paid'
export type PedidoStatus = 'pendente' | 'pago' | 'cancelado'

export interface Rifa {
  id: string
  slug: string
  titulo: string
  descricao: string | null
  foto_url: string | null
  valor_numero: number
  total_numeros: number
  data_sorteio: string | null
  status: RifaStatus
  pix_key: string | null
  pix_tipo: string | null
  pix_nome: string | null
  pix_cidade: string | null
  created_at: string
}

export interface Cliente {
  id: string
  nome: string
  cpf: string
  whatsapp: string
  email: string
  created_at: string
}

export interface Pedido {
  id: string
  rifa_id: string
  cliente_id: string
  numeros: number[]
  quantidade: number
  valor_total: number
  status: PedidoStatus
  expires_at: string | null
  pago_em: string | null
  confirmado_por: string | null
  created_at: string
  clientes?: Cliente
  rifas?: Pick<Rifa, 'titulo' | 'slug' | 'valor_numero'>
}

export interface Numero {
  id: string
  rifa_id: string
  numero: number
  status: NumeroStatus
  reserved_by: string | null
  pedido_id: string | null
  reserved_at: string | null
  expires_at: string | null
  paid_at: string | null
}

export interface Sorteio {
  id: string
  rifa_id: string
  numero_sorteado: number
  cliente_id: string
  pedido_id: string
  realizado_em: string
  clientes?: Pick<Cliente, 'nome' | 'whatsapp'>
}

export interface RifaStats {
  total: number
  pagos: number
  reservados: number
  disponiveis: number
  arrecadado: number
}
