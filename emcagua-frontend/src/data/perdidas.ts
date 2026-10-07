/**
 * Agua no contabilizada: agua que sale de la planta menos agua facturada.
 * Indicadores: IANC (%) e IPUF (m³ perdidos por suscriptor facturado al mes).
 * El agua producida por sector se estima en esta demostración; en producción llega del backend.
 */
import { MESES_CORTOS } from './constants'
import { sectores } from './zonas'
import { nombrePeriodo, periodosFacturados } from './billing'
import type { Usuario } from './types'

export const IPUF_REFERENCIA = 6 // m³/suscriptor/mes, referencia regulatoria de la CRA
export let IANC_META = 0.3 // meta de agua no contabilizada, editable en Configuración
export const setMetaIanc = (v: number) => { IANC_META = v }

/** Pérdida base de cada sector (más alta donde la red es más vieja). */
const PERDIDA_SECTOR: Record<string, number> = { Centro: 0.29, 'Líbano': 0.46, 'Pique Tierra': 0.33, 'Calle Nueva': 0.38, 'San Luis': 0.35 }

function facturadoPorBarrio(usuarios: Usuario[], mes: number, anio: number) {
  const out: Record<string, { m3: number; usuarios: number }> = Object.fromEntries(sectores().map((b) => [b, { m3: 0, usuarios: 0 }]))
  for (const u of usuarios) {
    const p = u.historial.find((h) => h.mes === mes && h.anio === anio)
    if (!p || p.estado === 'Suspendido') continue
    const s = out[u.sector]
    if (!s) continue // sector borrado o desconocido
    s.m3 += p.consumo
    s.usuarios++
  }
  return out
}

/** Volumen medido por los macromedidores (llega de la base de datos): "2026-9|Centro" → m³. */
let MACRO: Map<string, number> | null = null
export const setMacromediciones = (lista: { anio: number; mes: number; sector: string; volumen: number }[]) => {
  MACRO = new Map(lista.map((m) => [`${m.anio}-${m.mes}|${m.sector}`, m.volumen]))
}

/** Agua producida por sector: la medida en la base de datos o, si no hay, un estimado (ruido y una mejora lenta mes a mes). */
function producidoPorBarrio(fact: Record<string, { m3: number }>, mes: number, anio: number) {
  const idx = anio * 12 + mes
  const porBarrio: Record<string, number> = {}
  for (const b of sectores()) {
    const medido = MACRO?.get(`${anio}-${mes}|${b}`)
    if (medido !== undefined) { porBarrio[b] = medido; continue }
    const ruido = (((idx * 37 + b.length * 11) % 13) - 6) / 200
    const mejora = Math.max(0, (idx - (2025 * 12 + 10)) * 0.002)
    const perdida = Math.min(0.6, Math.max(0.12, (PERDIDA_SECTOR[b] ?? 0.33) + ruido - mejora))
    porBarrio[b] = Math.round(fact[b].m3 / (1 - perdida))
  }
  return porBarrio
}

export type Balance = {
  mes: number; anio: number; label: string; full: string
  producido: number; facturado: number; perdido: number; ianc: number; ipuf: number; usuarios: number
  sectores: { sector: string; producido: number; facturado: number; perdido: number; ianc: number; usuarios: number }[]
}

/** Balance hídrico de los últimos `n` periodos facturados (cronológico). */
export function balanceHidrico(usuarios: Usuario[], n = 12): Balance[] {
  return periodosFacturados(usuarios, n).map(({ mes, anio }) => {
    const fact = facturadoPorBarrio(usuarios, mes, anio)
    const prod = producidoPorBarrio(fact, mes, anio)
    const porSector = sectores().map((b) => {
      const perdido = Math.max(0, prod[b] - fact[b].m3)
      return { sector: b, producido: prod[b], facturado: fact[b].m3, perdido, ianc: prod[b] ? perdido / prod[b] : 0, usuarios: fact[b].usuarios }
    })
    const producido = porSector.reduce((s, x) => s + x.producido, 0)
    const facturado = porSector.reduce((s, x) => s + x.facturado, 0)
    const perdido = Math.max(0, producido - facturado)
    const nUsu = porSector.reduce((s, x) => s + x.usuarios, 0)
    return { mes, anio, label: MESES_CORTOS[mes - 1], full: nombrePeriodo(mes, anio), producido, facturado, perdido, ianc: producido ? perdido / producido : 0, ipuf: nUsu ? perdido / nUsu : 0, usuarios: nUsu, sectores: porSector }
  })
}
