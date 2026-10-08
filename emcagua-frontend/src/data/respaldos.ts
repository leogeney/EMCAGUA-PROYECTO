/** Copias de seguridad de la base de datos (solo el gerente, con el servidor encendido). */
import { useEffect, useSyncExternalStore } from 'react'
import { api, API_URL, MODO_API, tokenApi } from './api'
import { isAdmin } from '../utils/session'

export type ArchivoRespaldo = { nombre: string; bytes: number; fecha: string }
export type EstadoRespaldos = { carpeta: string; carpetaExtra: string; archivos: ArchivoRespaldo[]; ultimoError: string | null; ultimoIntento: string | null; conservar: number }

let estado: EstadoRespaldos | null = null
const oyentes = new Set<() => void>()
const fijar = (e: EstadoRespaldos | null) => { estado = e; oyentes.forEach((f) => f()) }

export async function cargarRespaldos() {
  if (!MODO_API || !isAdmin()) return
  try { fijar(await api<EstadoRespaldos>('/vista/respaldos')) } catch { /* sin permiso o sin servidor */ }
}

let activos = 0
let reloj: ReturnType<typeof setInterval> | undefined
export function useRespaldos() {
  useEffect(() => {
    if (activos++ === 0) { void cargarRespaldos(); reloj = setInterval(() => void cargarRespaldos(), 10 * 60_000) }
    return () => { if (--activos === 0) clearInterval(reloj) }
  }, [])
  return useSyncExternalStore((f) => { oyentes.add(f); return () => { oyentes.delete(f) } }, () => estado)
}

export async function respaldarAhora() {
  const r = await api<ArchivoRespaldo>('/vista/respaldos', { metodo: 'POST' })
  await cargarRespaldos()
  return r
}

/** Descarga un respaldo (con el token de la sesión) y lo guarda en el computador. */
export async function descargarRespaldo(nombre: string) {
  const r = await fetch(`${API_URL}/api/vista/respaldos/${encodeURIComponent(nombre)}`, { headers: { Authorization: `Bearer ${tokenApi() ?? ''}` } })
  if (!r.ok) throw new Error('No se pudo descargar la copia')
  const url = URL.createObjectURL(await r.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Horas desde la última copia (Infinity si no hay ninguna). */
export const horasDesdeUltima = (e: EstadoRespaldos | null) => (e?.archivos[0] ? (Date.now() - new Date(e.archivos[0].fecha).getTime()) / 3_600_000 : Infinity)
