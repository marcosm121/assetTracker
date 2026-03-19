const COMPANY_NAMES: Record<string, string> = {
  GGAL:  'Grupo Financiero Galicia',
  YPFD:  'YPF S.A.',
  BMA:   'Banco Macro',
  BBAR:  'BBVA Argentina',
  PAMP:  'Pampa Energía',
  TECO2: 'Telecom Argentina',
  ALUA:  'Aluar Aluminio',
  TXAR:  'Ternium Argentina',
  SUPV:  'Grupo Supervielle',
  CEPU:  'Central Puerto',
  CRES:  'Cresud',
  LOMA:  'Loma Negra',
  MIRG:  'Mirgor',
  VALO:  'Grupo Financiero Valores',
}

export function getCompanyName(ticker: string): string {
  return COMPANY_NAMES[ticker] ?? ''
}
