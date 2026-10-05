/**
 * Agua no contabilizada: agua que sale de la planta (macromedidores) menos agua facturada.
 * Indicadores: IANC (%) e IPUF (m³ perdidos por suscriptor facturado al mes).
 * Los macromedidores de demostración se simulan; en producción vienen de la planta y de los sectores.
 */
import { BARRIOS } from './constants'
import { nombrePeriodo, periodosFacturados } from './billing'
import type { Usuario } from './types'

export const IPUF_REFERENCIA = 6 // m³/suscriptor/mes, referencia regulatoria de la CRA
export let IANC_META = 0.3 // meta de agua no contabilizada, editable en Configuración
export const setMetaIanc = (v: number) => { IANC_META = v }

export type Macro = { total: number; porBarrio: Record<string, number>; manual?: boolean; nota?: string }

/** Pérdida base de cada sector (más alta donde la red es más vieja). */
const PERDIDA_SECTOR: Record<string, number> = { Centro: 0.29, Guamalito: 0.46, 'El Carmen': 0.33, 'La Esperanza': 0.38 }

let registros: Record<string, Macro> = {}
export const claveMacro = (mes: number, anio: number) => `${anio}-${mes}`
export const registrarMacro = (mes: number, anio: number, m: Macro) => { registros = { ...registros, [claveMacro(mes, anio)]: m } }
export const macroRegistrado = (mes: number, anio: number) => registros[claveMacro(mes, anio)]

function facturadoPorBarrio(usuarios: Usuario[], mes: number, anio: number) {
  const out: Record<string, { m3: number; usuarios: number }> = Object.fromEntries(BARRIOS.map((b) => [b, { m3: 0, usuarios: 0 }]))
  for (const u of usuarios) {
    const p = u.historial.find((h) => h.mes === mes && h.anio === anio)
    if (!p || p.estado === 'Suspendido') continue
    out[u.barrio].m3 += p.consumo
    out[u.barrio].usuarios++
  }
  return out
}

/** Macromedición simulada: un poco de ruido y una mejora lenta mes a mes. */
function macroSimulado(fact: Record<string, { m3: number }>, mes: number, anio: number): Macro {
  const idx = anio * 12 + mes
  const porBarrio: Record<string, number> = {}
  for (const b of BARRIOS) {
    const ruido = (((idx * 37 + b.length * 11) % 13) - 6) / 200
    const mejora = Math.max(0, (idx - (2025 * 12 + 10)) * 0.002)
    const perdida = Math.min(0.6, Math.max(0.12, PERDIDA_SECTOR[b] + ruido - mejora))
    porBarrio[b] = Math.round(fact[b].m3 / (1 - perdida))
  }
  return { total: Object.values(porBarrio).reduce((s, v) => s + v, 0), porBarrio }
}

export type Balance = {
  mes: number; anio: number; label: string; full: string
  producido: number; facturado: number; perdido: number; ianc: number; ipuf: number; usuarios: number; manual: boolean
  sectores: { barrio: string; producido: number; facturado: number; perdido: number; ianc: number; usuarios: number }[]
}

export function balanceHidrico(usuarios: Usuario[], n = 12): Balance[] {
  return periodosFacturados(usuarios, n).map(({ mes, anio }) => {
    const fact = facturadoPorBarrio(usuarios, mes, anio)
    const macro = macroRegistrado(mes, anio) ?? macroSimulado(fact, mes, anio)
    const sectores = BARRIOS.map((b) => {
      const producido = macro.porBarrio[b] ?? 0
      const perdido = Math.max(0, producido - fact[b].m3)
      return { barrio: b, producido, facturado: fact[b].m3, perdido, ianc: producido ? perdido / producido : 0, usuarios: fact[b].usuarios }
    })
    const facturado = sectores.reduce((s, x) => s + x.facturado, 0)
    const producido = macro.total
    const perdido = Math.max(0, producido - facturado)
    const usuariosF = sectores.reduce((s, x) => s + x.usuarios, 0)
    return {
      mes, anio, label: nombrePeriodo(mes, anio).slice(0, 3), full: nombrePeriodo(mes, anio),
      producido, facturado, perdido, ianc: producido ? perdido / producido : 0, ipuf: usuariosF ? perdido / usuariosF : 0, usuarios: usuariosF, manual: !!macro.manual, sectores,
    }
  })
}
