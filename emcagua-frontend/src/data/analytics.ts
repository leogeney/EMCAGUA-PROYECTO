import { BARRIOS, ESTRATOS, MESES_CORTOS, UMBRAL_ALTO } from './constants'
import { montoPeriodo, nombrePeriodo, periodosRecientes, resumenUsuario, vencimientoPeriodo } from './billing'
import type { Usuario } from './types'

export type PuntoMensual = {
  mes: number
  anio: number
  label: string
  full: string
  consumo: number
  facturado: number
  recaudado: number
  pendiente: number
  facturas: number
  pagadas: number
  usuariosConsumo: number
}

export function serieMensual(usuarios: Usuario[], n = 12, hoy = new Date()): PuntoMensual[] {
  return periodosRecientes(n, hoy).map(({ mes, anio }) => {
    const p: PuntoMensual = { mes, anio, label: `${MESES_CORTOS[mes - 1]}`, full: nombrePeriodo(mes, anio), consumo: 0, facturado: 0, recaudado: 0, pendiente: 0, facturas: 0, pagadas: 0, usuariosConsumo: 0 }
    for (const u of usuarios) {
      const per = u.historial.find((h) => h.mes === mes && h.anio === anio)
      if (!per || per.estado === 'Suspendido') continue
      const monto = montoPeriodo(per.consumo, u.estrato)
      p.consumo += per.consumo
      p.usuariosConsumo++
      p.facturado += monto
      p.facturas++
      if (per.estado === 'Pagada') {
        p.recaudado += monto
        p.pagadas++
      } else p.pendiente += monto
    }
    return p
  })
}

export function porBarrio(usuarios: Usuario[], hoy = new Date()) {
  return BARRIOS.map((b) => {
    const us = usuarios.filter((u) => u.barrio === b)
    const res = us.map((u) => resumenUsuario(u, hoy))
    const conConsumo = res.filter((r) => r.consumoActual > 0)
    return {
      barrio: b,
      usuarios: us.length,
      consumoPromedio: conConsumo.length ? conConsumo.reduce((s, r) => s + r.consumoActual, 0) / conConsumo.length : 0,
      morosos: res.filter((r) => r.vencido).length,
      cartera: res.reduce((s, r) => s + r.deuda, 0),
    }
  })
}

export function porEstrato(usuarios: Usuario[], hoy = new Date()) {
  return ESTRATOS.map((e) => {
    const us = usuarios.filter((u) => u.estrato === e)
    const res = us.map((u) => resumenUsuario(u, hoy))
    return {
      estrato: e,
      usuarios: us.length,
      morosidad: us.length ? res.filter((r) => r.vencido).length / us.length : 0,
      cartera: res.reduce((s, r) => s + r.deuda, 0),
    }
  })
}

export const RANGOS_CONSUMO = [
  { label: '0–10', min: 0, max: 10 },
  { label: '11–20', min: 11, max: 20 },
  { label: '21–30', min: 21, max: 30 },
  { label: '31–40', min: 31, max: 40 },
  { label: '41–50', min: 41, max: 50 },
  { label: '+50', min: 51, max: Infinity },
]

export function distribucionConsumo(usuarios: Usuario[], hoy = new Date()) {
  const valores = usuarios.map((u) => resumenUsuario(u, hoy).consumoActual).filter((v) => v > 0)
  return RANGOS_CONSUMO.map((r) => ({ ...r, usuarios: valores.filter((v) => v >= r.min && v <= r.max).length, alto: r.min > UMBRAL_ALTO }))
}

/** Usuarios cuyo último consumo se dispara frente a su propio promedio (posible fuga). */
export function consumosAtipicos(usuarios: Usuario[], hoy = new Date()) {
  return usuarios
    .map((u) => {
      const r = resumenUsuario(u, hoy)
      return { usuario: u, actual: r.consumoActual, promedio: r.consumoPromedio, variacion: r.consumoPromedio ? r.consumoActual / r.consumoPromedio - 1 : 0 }
    })
    .filter((x) => x.actual >= 15 && x.variacion >= 0.4)
    .sort((a, b) => b.variacion - a.variacion)
}

/** Edad de la cartera: días vencidos de cada factura pendiente. */
export function edadCartera(usuarios: Usuario[], hoy = new Date()) {
  const tramos = [
    { label: 'Por vencer', min: -Infinity, max: 0, monto: 0, facturas: 0 },
    { label: '1–30 días', min: 1, max: 30, monto: 0, facturas: 0 },
    { label: '31–60 días', min: 31, max: 60, monto: 0, facturas: 0 },
    { label: '61–90 días', min: 61, max: 90, monto: 0, facturas: 0 },
    { label: '+90 días', min: 91, max: Infinity, monto: 0, facturas: 0 },
  ]
  for (const u of usuarios) {
    for (const p of u.historial) {
      if (p.estado !== 'Pendiente') continue
      const dias = Math.floor((hoy.getTime() - vencimientoPeriodo(p.mes, p.anio).getTime()) / 86_400_000)
      const t = tramos.find((t) => dias >= t.min && dias <= t.max)!
      t.monto += montoPeriodo(p.consumo, u.estrato)
      t.facturas++
    }
  }
  return tramos
}
