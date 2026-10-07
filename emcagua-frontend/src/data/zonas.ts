/**
 * Sectores de la red (Centro, Líbano, Pique Tierra, Calle Nueva, San Luis) y sus barrios.
 * Con la API vienen de la base de datos (Configuración → Sectores y barrios); en demostración se guardan en el navegador.
 */
import { useSyncExternalStore } from 'react'
import { api, MODO_API } from './api'

export type BarrioZona = { id?: number; nombre: string; predios?: number }
export type SectorZona = { id?: number; nombre: string; predios?: number; barrios: BarrioZona[] }

export const SECTORES_INICIALES = ['Centro', 'Líbano', 'Pique Tierra', 'Calle Nueva', 'San Luis']
const KEY = 'emcagua_zonas'

let zonas: SectorZona[] = (() => {
  if (!MODO_API) {
    try { const g = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (Array.isArray(g) && g.length) return g } catch { /* sin almacenamiento */ }
  }
  return SECTORES_INICIALES.map((nombre) => ({ nombre, barrios: [] }))
})()
const oyentes = new Set<() => void>()
function fijar(z: SectorZona[]) {
  zonas = z
  if (!MODO_API) { try { localStorage.setItem(KEY, JSON.stringify(z)) } catch { /* sin almacenamiento */ } }
  oyentes.forEach((f) => f())
}

export const leerZonas = () => zonas
export const useZonas = () => useSyncExternalStore((f) => { oyentes.add(f); return () => { oyentes.delete(f) } }, leerZonas)

/** Nombres de los sectores, en orden. */
export const sectores = () => zonas.map((z) => z.nombre)
/** Barrios de un sector, en orden alfabético. */
export const barriosDe = (sector: string) => zonas.find((z) => z.nombre === sector)?.barrios.map((b) => b.nombre) ?? []
/** "Las Flores, Centro" o solo "Centro" si el predio aún no tiene barrio. */
export const ubicacion = (u: { sector: string; barrio?: string }) => (u.barrio ? `${u.barrio}, ${u.sector}` : u.sector)

/** Con sesión: trae sectores y barrios de la base de datos. */
export async function cargarZonasApi() {
  if (!MODO_API) return
  try { fijar(await api<SectorZona[]>('/vista/zonas')) } catch { /* se quedan los que había */ }
}

/** Cambio en el servidor (con la API) o en el navegador (demostración). Si el servidor lo rechaza, lanza el error. */
async function cambiar(local: () => SectorZona[], ruta: string, metodo: string, cuerpo?: unknown) {
  if (!MODO_API) { fijar(local()); return }
  await api(ruta, { metodo, cuerpo })
  await cargarZonasApi()
}

const ordenar = (b: BarrioZona[]) => [...b].sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
const idSector = (nombre: string) => zonas.find((z) => z.nombre === nombre)?.id

export const crearSector = (nombre: string) => cambiar(() => [...zonas, { nombre, barrios: [] }], '/vista/zonas/sectores', 'POST', { nombre })
export const renombrarSector = (anterior: string, nombre: string) =>
  cambiar(() => zonas.map((z) => (z.nombre === anterior ? { ...z, nombre } : z)), `/vista/zonas/sectores/${idSector(anterior)}`, 'PUT', { nombre })
export const borrarSector = (nombre: string) => cambiar(() => zonas.filter((z) => z.nombre !== nombre), `/vista/zonas/sectores/${idSector(nombre)}`, 'DELETE')

export const crearBarrio = (sector: string, nombre: string) =>
  cambiar(() => zonas.map((z) => (z.nombre === sector ? { ...z, barrios: ordenar([...z.barrios, { nombre }]) } : z)), '/vista/zonas/barrios', 'POST', { sector: idSector(sector), nombre })
export const renombrarBarrio = (sector: string, anterior: string, nombre: string) => {
  const id = zonas.find((z) => z.nombre === sector)?.barrios.find((b) => b.nombre === anterior)?.id
  return cambiar(() => zonas.map((z) => (z.nombre === sector ? { ...z, barrios: ordenar(z.barrios.map((b) => (b.nombre === anterior ? { ...b, nombre } : b))) } : z)), `/vista/zonas/barrios/${id}`, 'PUT', { nombre })
}
export const borrarBarrio = (sector: string, nombre: string) => {
  const id = zonas.find((z) => z.nombre === sector)?.barrios.find((b) => b.nombre === nombre)?.id
  return cambiar(() => zonas.map((z) => (z.nombre === sector ? { ...z, barrios: z.barrios.filter((b) => b.nombre !== nombre) } : z)), `/vista/zonas/barrios/${id}`, 'DELETE')
}
