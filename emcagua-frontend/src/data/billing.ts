import { getFirstFriday } from '../utils/cutoff'
import { MESES, TARIFA } from './constants'
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
export const montoPeriodo = (consumo: number, estrato: number) => consumo * TARIFA[estrato]
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
  return [...set.entries()].sort((a, b) => a[0] - b[0]).slice(-n).map(([, v]) => v)
}

/** Periodo siguiente al último facturado: el que está en toma de lecturas. */
export function periodoEnLectura(usuarios: Usuario[]) {
  const ult = periodosFacturados(usuarios, 1)[0] ?? ultimoPeriodo()
  const d = new Date(ult.anio, ult.mes, 1)
  return { mes: d.getMonth() + 1, anio: d.getFullYear() }
}

/** Lectura acumulada del medidor (m³) al cierre del último periodo. */
export function lecturaMedidor(u: Usuario) {
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
    barrio: u.barrio,
    estrato: u.estrato,
    mes: p.mes,
    anio: p.anio,
    periodo: nombrePeriodo(p.mes, p.anio),
    consumo: p.consumo,
    monto: montoPeriodo(p.consumo, u.estrato),
    vencimiento: venc,
    estado,
    vencida: estado === 'Pendiente' && hoy > venc,
    fechaPago: p.fechaPago,
  }
}

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
