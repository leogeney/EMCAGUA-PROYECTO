// Parámetros editables en Configuración (live bindings: quien los importa ve el valor actualizado)
export let UMBRAL_ALTO = 30 // m³ por periodo
export let COSTO_RECONEXION = 30000
/** Cobro mensual fijo de los predios sin medidor, por estrato (se cambia en Configuración). */
export const COBRO_FIJO: Record<number, number> = { 1: 14000, 2: 16000, 3: 20000 }
export const cobroFijo = (estrato: number) => COBRO_FIJO[Math.min(3, Math.max(1, estrato))]
export function setParametros(p: { umbralAlto: number; reconexion: number; cobroFijoEstrato1?: number; cobroFijoEstrato2?: number; cobroFijoEstrato3?: number }) {
  UMBRAL_ALTO = p.umbralAlto
  COSTO_RECONEXION = p.reconexion
  if (p.cobroFijoEstrato1) COBRO_FIJO[1] = p.cobroFijoEstrato1
  if (p.cobroFijoEstrato2) COBRO_FIJO[2] = p.cobroFijoEstrato2
  if (p.cobroFijoEstrato3) COBRO_FIJO[3] = p.cobroFijoEstrato3
}
export const TARIFA: Record<number, number> = { 1: 1800, 2: 2600, 3: 3400 } // $ por m³
export const ESTRATOS = [1, 2, 3] as const

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const MESES_CORTOS = MESES.map((m) => m.slice(0, 3))

/** Colores de series para gráficos (validados para daltonismo y contraste). */
export const CHART = {
  serie1: '#00897b', // teal (marca)
  serie2: '#eb6834', // naranja
  critico: '#d03b3b',
  grid: '#eceeea',
  eje: '#9aa09a',
} as const
