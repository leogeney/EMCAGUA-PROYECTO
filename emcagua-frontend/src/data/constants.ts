export const UMBRAL_ALTO = 30 // m³ por periodo
export const COSTO_RECONEXION = 30000
export const TARIFA: Record<number, number> = { 1: 1800, 2: 2600, 3: 3400 } // $ por m³
export const BARRIOS = ['Centro', 'Guamalito', 'El Carmen', 'La Esperanza'] as const
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
