// Gerador de payload PIX (padrão EMV/Banco Central)

function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    }
  }
  return ((crc & 0xffff).toString(16).toUpperCase()).padStart(4, '0')
}

function emv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`
}

export function gerarPayloadPix(
  chave: string,
  nome: string,
  cidade: string,
  valor: number,
  txid = '***'
): string {
  const merchantAccountInfo = emv('00', 'BR.GOV.BCB.PIX') + emv('01', chave)
  const payload =
    emv('00', '01') +
    emv('26', merchantAccountInfo) +
    emv('52', '0000') +
    emv('53', '986') +
    emv('54', valor.toFixed(2)) +
    emv('58', 'BR') +
    emv('59', nome.slice(0, 25)) +
    emv('60', cidade.slice(0, 15)) +
    emv('62', emv('05', txid.slice(0, 25))) +
    '6304'

  return payload + crc16(payload)
}
