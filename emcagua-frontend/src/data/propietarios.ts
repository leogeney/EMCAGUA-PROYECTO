/**
 * Propietarios: una persona (cédula) puede tener varios predios.
 * Cada predio sigue siendo un suscriptor con su medidor, estrato y factura propios
 * (no se suman consumos: cambiaría los rangos y los subsidios).
 */
import { resumenUsuario, type Resumen } from './billing'
import { ubicacion } from './zonas'
import type { Usuario } from './types'

export type Propietario = { cedula: string; nombre: string; telefono: string; predios: Usuario[] }

export const limpiarCedula = (c: string) => c.replace(/\D/g, '')
export const formatoCedula = (c: string) => limpiarCedula(c).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** Agrupa los predios por la cédula del propietario. */
export function propietarios(usuarios: Usuario[]): Map<string, Propietario> {
  const m = new Map<string, Propietario>()
  for (const u of usuarios) {
    const k = limpiarCedula(u.cedula)
    if (!k) continue
    const p = m.get(k)
    if (p) p.predios.push(u)
    else m.set(k, { cedula: k, nombre: u.nombre, telefono: u.telefono, predios: [u] })
  }
  return m
}

/** Los otros predios del mismo dueño (sin incluir este). */
export const otrosPredios = (usuarios: Usuario[], u: Usuario) => {
  const k = limpiarCedula(u.cedula)
  return k ? usuarios.filter((x) => x.id !== u.id && limpiarCedula(x.cedula) === k) : []
}

/** Saldo de todos los predios del propietario. */
export function saldoPropietario(predios: Usuario[], resumen: (u: Usuario) => Resumen = resumenUsuario) {
  const rs = predios.map((u) => ({ u, r: resumen(u) }))
  return { deuda: rs.reduce((s, x) => s + x.r.deuda, 0), facturas: rs.reduce((s, x) => s + x.r.pagosDebe, 0), conDeuda: rs.filter((x) => x.r.deuda > 0).length, vencido: rs.some((x) => x.r.vencido), detalle: rs }
}

/** Nombre corto del predio para listas: "Calle 5 # 4-20 (Centro)". */
export const etiquetaPredio = (u: Usuario) => `${u.direccion || `Predio ${u.id}`} (${ubicacion(u)})`
