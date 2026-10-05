/**
 * Tarifa de acueducto y alcantarillado con la estructura de la CRA:
 * cargo fijo + cargo por consumo (básico y complementario) y subsidios por estrato.
 * Los valores son de EJEMPLO: la empresa debe cargar los de su estudio de costos aprobado.
 */
import { TARIFA } from './constants'

export type Servicio = { cf: number; cc: number } // cargo fijo ($/mes) y cargo por consumo ($/m³)

export type TarifaCRA = {
  desde: { mes: number; anio: number } // primer periodo en que aplica
  acueducto: Servicio
  alcantarillado: Servicio
  consumoBasico: number // m³ subsidiables por mes
  subsidio: Record<1 | 2 | 3, number> // fracción (0.5 = 50 %)
  creada: number
}

/** Topes legales de subsidio (estratos 1, 2 y 3). El porcentaje exacto lo fija el Concejo municipal. */
export const TOPE_SUBSIDIO: Record<1 | 2 | 3, number> = { 1: 0.7, 2: 0.4, 3: 0.15 }

export const TARIFA_EJEMPLO: Omit<TarifaCRA, 'desde' | 'creada'> = {
  acueducto: { cf: 8500, cc: 1950 },
  alcantarillado: { cf: 4200, cc: 950 },
  consumoBasico: 13,
  subsidio: { 1: 0.5, 2: 0.4, 3: 0.15 },
}

/* ------------------- Almacén de vigencias (en memoria) ------------------- */

let vigencias: TarifaCRA[] = []
const oyentes = new Set<() => void>()
let version = 0

export const suscribirTarifa = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f) } }
export const versionTarifa = () => version
export const listaVigencias = () => vigencias

export function aplicarTarifa(t: TarifaCRA) {
  const clave = (x: TarifaCRA) => x.desde.anio * 12 + x.desde.mes
  vigencias = [...vigencias.filter((v) => clave(v) !== clave(t)), t].sort((a, b) => clave(a) - clave(b))
  version++
  oyentes.forEach((f) => f())
}

export function quitarTarifa(t: TarifaCRA) {
  vigencias = vigencias.filter((v) => v !== t)
  version++
  oyentes.forEach((f) => f())
}

/** Tarifa CRA vigente para un periodo, o undefined si aplica la tarifa simple anterior. */
export function tarifaVigente(mes: number, anio: number) {
  const k = anio * 12 + mes
  let v: TarifaCRA | undefined
  for (const t of vigencias) if (t.desde.anio * 12 + t.desde.mes <= k) v = t
  return v
}

/* ------------------------------- Cálculo ------------------------------- */

export type Linea = { concepto: string; cantidad?: string; valor: number; tipo?: 'subsidio' | 'total' }
export type Detalle = { lineas: Linea[]; subtotal: number; subsidio: number; total: number; cra: boolean }

const r = (n: number) => Math.round(n)

export function detalleTarifa(t: TarifaCRA, consumo: number, estrato: number): Detalle {
  const basico = Math.min(consumo, t.consumoBasico)
  const compl = Math.max(0, consumo - t.consumoBasico)
  const pct = t.subsidio[estrato as 1 | 2 | 3] ?? 0
  const lineas: Linea[] = []
  let subtotal = 0, subsidio = 0
  for (const [nombre, s] of [['Acueducto', t.acueducto], ['Alcantarillado', t.alcantarillado]] as const) {
    lineas.push({ concepto: `${nombre} · cargo fijo`, valor: s.cf })
    lineas.push({ concepto: `${nombre} · consumo básico`, cantidad: `${basico} m³`, valor: r(basico * s.cc) })
    if (compl) lineas.push({ concepto: `${nombre} · consumo complementario`, cantidad: `${compl} m³`, valor: r(compl * s.cc) })
    subtotal += s.cf + r(consumo * s.cc)
    // El subsidio cubre el cargo fijo y el consumo básico; el complementario se paga completo.
    subsidio += r((s.cf + basico * s.cc) * pct)
  }
  if (subsidio) lineas.push({ concepto: `Subsidio estrato ${estrato} (${Math.round(pct * 100)} %)`, valor: -subsidio, tipo: 'subsidio' })
  lineas.push({ concepto: 'Total', valor: subtotal - subsidio, tipo: 'total' })
  return { lineas, subtotal, subsidio, total: subtotal - subsidio, cra: true }
}

/** Valor de la factura de un periodo con la tarifa que estaba vigente. */
export function valorPeriodo(consumo: number, estrato: number, mes?: number, anio?: number): Detalle {
  const t = mes && anio ? tarifaVigente(mes, anio) : undefined
  if (t) return detalleTarifa(t, consumo, estrato)
  const total = consumo * TARIFA[estrato]
  return { lineas: [{ concepto: `Consumo (${consumo} m³ × tarifa estrato ${estrato})`, valor: total }, { concepto: 'Total', valor: total, tipo: 'total' }], subtotal: total, subsidio: 0, total, cra: false }
}
