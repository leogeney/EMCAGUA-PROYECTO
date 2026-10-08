import { getFirstFriday } from '../utils/cutoff'
import { cobroFijo, MESES } from './constants'
import { valorPeriodo } from './tarifa'
import type { Factura, Periodo, Usuario } from './types'

/** Vence el primer viernes del mes siguiente al periodo consumido. */
export function vencimientoPeriodo(mes: number, anio: number): Date {
  const d = getFirstFriday(anio, mes) // mes 1-12 == índice JS del mes siguiente
  d.setHours(23, 59, 59, 999)
  return d
}

/** La factura se genera 2 semanas antes del vencimiento. */
export function generacionPeriodo(mes: number, anio: number): Date {
  const d = vencimientoPeriodo(mes, anio)
  d.setDate(d.getDate() - 14)
  d.setHours(0, 0, 0, 0)
  return d
}

export const facturaId = (clienteId: string, mes: number, anio: number) => `FAC-${anio}-${String(mes).padStart(2, '0')}-${clienteId}`
export const nombrePeriodo = (mes: number, anio: number) => `${MESES[mes - 1]} ${anio}`
/** Valor facturado de un periodo con la tarifa vigente en ese periodo (simple o CRA con subsidios). */
export const montoPeriodo = (consumo: number, estrato: number, mes?: number, anio?: number) => valorPeriodo(consumo, estrato, mes, anio).total
export const clavePeriodo = (mes: number, anio: number) => anio * 12 + (mes - 1)

/** "2026-9" o "2026-09" → { anio: 2026, mes: 9 } */
export function leerPeriodo(valor: string) {
  const [anio, mes] = valor.split('-').map(Number)
  return { anio, mes }
}

/** Periodos con facturas en los datos (cronológico), los últimos `n`. */
export function periodosFacturados(usuarios: Usuario[], n = 12) {
  const set = new Map<number, { mes: number; anio: number }>()
  for (const u of usuarios) for (const p of u.historial) set.set(clavePeriodo(p.mes, p.anio), { mes: p.mes, anio: p.anio })
  const lista = [...set.entries()].sort((a, b) => a[0] - b[0]).slice(-n).map(([, v]) => v)
  // Sistema recién empezado (sin facturas todavía): se muestra el periodo que corresponde por fecha
  return lista.length ? lista : [ultimoPeriodo()]
}

/** Periodo siguiente al último facturado: el que está en toma de lecturas. */
export function periodoEnLectura(usuarios: Usuario[]) {
  const ult = periodosFacturados(usuarios, 1)[0] ?? ultimoPeriodo()
  const d = new Date(ult.anio, ult.mes, 1)
  return { mes: d.getMonth() + 1, anio: d.getFullYear() }
}

/** Lectura acumulada del medidor (m³) al cierre del último periodo. */
export function lecturaMedidor(u: Usuario) {
  if (u.lecturaBase !== undefined) return u.lecturaBase
  let h = 0
  for (const ch of u.id) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return 1200 + (h % 3800) + u.historial.reduce((s, p) => s + p.consumo, 0)
}

/** Último periodo ya facturado a la fecha `hoy`. */
export function ultimoPeriodo(hoy = new Date()): { mes: number; anio: number } {
  const mes = hoy.getMonth() + 1
  const anio = hoy.getFullYear()
  if (hoy >= generacionPeriodo(mes, anio)) return { mes, anio }
  const d = new Date(anio, mes - 2, 1)
  return { mes: d.getMonth() + 1, anio: d.getFullYear() }
}

/** Lista de los últimos `n` periodos facturados, en orden cronológico. */
export function periodosRecientes(n = 12, hoy = new Date()) {
  const ult = ultimoPeriodo(hoy)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(ult.anio, ult.mes - 1 - (n - 1 - i), 1)
    return { mes: d.getMonth() + 1, anio: d.getFullYear() }
  })
}

export function periodoAFactura(u: Usuario, p: Periodo, hoy = new Date()): Factura {
  const venc = vencimientoPeriodo(p.mes, p.anio)
  const estado = p.estado === 'Pagada' ? 'Pagada' : 'Pendiente'
  return {
    id: facturaId(u.id, p.mes, p.anio),
    clienteId: u.id,
    cliente: u.nombre,
    sector: u.sector,
    barrio: u.barrio ? `${u.barrio}, ${u.sector}` : u.sector,
    estrato: u.estrato,
    mes: p.mes,
    anio: p.anio,
    periodo: nombrePeriodo(p.mes, p.anio),
    consumo: p.consumo,
    monto: montoDe(u, p),
    vencimiento: venc,
    estado,
    vencida: estado === 'Pendiente' && hoy > venc,
    fechaPago: p.fechaPago,
    codigo: p.codigo,
    fija: p.fija,
  }
}

/** Valor real de un periodo: el que guardó el servidor; si no hay, el cobro fijo o el calculado por consumo. */
export const montoDe = (u: Pick<Usuario, 'estrato'>, p: Periodo) => p.monto ?? (p.fija ? cobroFijo(u.estrato) : montoPeriodo(p.consumo, u.estrato, p.mes, p.anio))

export function facturasDe(u: Usuario, hoy = new Date()): Factura[] {
  return u.historial.filter((p) => p.estado !== 'Suspendido').map((p) => periodoAFactura(u, p, hoy))
}

export type Resumen = {
  consumoActual: number
  consumoPromedio: number
  pendientes: Factura[]
  pagosDebe: number
  deuda: number
  vencido: boolean
  ultimaLectura?: Periodo
}

export function resumenUsuario(u: Usuario, hoy = new Date()): Resumen {
  const facturadas = u.historial.filter((p) => p.estado !== 'Suspendido')
  const ultima = u.historial[u.historial.length - 1]
  const pendientes = facturasDe(u, hoy).filter((f) => f.estado === 'Pendiente')
  const previos = facturadas.slice(-7, -1)
  return {
    consumoActual: ultima?.consumo ?? 0,
    consumoPromedio: previos.length ? previos.reduce((s, p) => s + p.consumo, 0) / previos.length : ultima?.consumo ?? 0,
    pendientes,
    pagosDebe: pendientes.length,
    deuda: pendientes.reduce((s, f) => s + f.monto, 0),
    vencido: pendientes.some((f) => f.vencida),
    ultimaLectura: ultima,
  }
}

export function todasLasFacturas(usuarios: Usuario[], hoy = new Date()): Factura[] {
  return usuarios.flatMap((u) => facturasDe(u, hoy)).sort((a, b) => clavePeriodo(b.mes, b.anio) - clavePeriodo(a.mes, a.anio) || a.cliente.localeCompare(b.cliente))
}

/**
 * De qué meses son las facturas que se pagaron (p. ej. lo que entró hoy a caja).
 * La caja suma por DÍA DE PAGO; los informes de recaudo suman por MES DE LA FACTURA:
 * un pago de hoy puede traer facturas atrasadas de otros meses.
 */
export function desglosePorPeriodo(pagos: { facturaIds: string[]; monto: number }[], facturas: Factura[]) {
  const porId = new Map(facturas.map((f) => [f.id, f]))
  const grupos = new Map<number, { mes: number; anio: number; periodo: string; monto: number; facturas: number }>()
  let otros = 0
  for (const p of pagos) {
    let cubierto = 0
    for (const id of p.facturaIds) {
      const f = porId.get(id)
      if (!f) continue
      const k = f.anio * 12 + f.mes
      const g = grupos.get(k) ?? { mes: f.mes, anio: f.anio, periodo: f.periodo, monto: 0, facturas: 0 }
      g.monto += f.monto
      g.facturas++
      grupos.set(k, g)
      cubierto += f.monto
    }
    otros += Math.max(0, p.monto - cubierto) // reconexión u otros cobros
  }
  return { periodos: [...grupos.values()].sort((a, b) => b.anio * 12 + b.mes - (a.anio * 12 + a.mes)), otros }
}

/** "Octubre 2026 $14.000 · Marzo 2026 $14.000 (atrasada)" */
export function textoDesglose(d: ReturnType<typeof desglosePorPeriodo>, hoy = new Date()) {
  const actual = hoy.getFullYear() * 12 + hoy.getMonth() + 1
  const partes = d.periodos.map((g) => `${MESES[g.mes - 1].slice(0, 3)} ${g.anio}: $${Math.round(g.monto).toLocaleString('es-CO')}${g.anio * 12 + g.mes < actual - 1 ? ' (atrasada)' : ''}`)
  if (d.otros > 0) partes.push(`reconexión/otros: $${Math.round(d.otros).toLocaleString('es-CO')}`)
  return partes.join(' · ')
}
