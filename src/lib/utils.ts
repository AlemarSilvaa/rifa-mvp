export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatWhatsApp(phone: string): string {
  const n = phone.replace(/\D/g, '')
  return n.length === 11
    ? n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    : n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function formatNumero(n: number, total: number): string {
  const digits = total.toString().length
  return n.toString().padStart(digits, '0')
}

export function validarCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let d1 = (sum * 10) % 11
  if (d1 === 10 || d1 === 11) d1 = 0
  if (d1 !== parseInt(c[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  let d2 = (sum * 10) % 11
  if (d2 === 10 || d2 === 11) d2 = 0
  return d2 === parseInt(c[10])
}

export function whatsappLink(phone: string, message: string): string {
  const n = phone.replace(/\D/g, '')
  const num = n.startsWith('55') ? n : `55${n}`
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}
