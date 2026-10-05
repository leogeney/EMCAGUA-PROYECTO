/**
 * Configuración de la empresa (datos para documentos, piezas de redes y parámetros de operación).
 * Mientras no exista el backend se guarda en este navegador.
 */
import { useSyncExternalStore } from 'react'
import { setParametros } from './constants'
import { setMetaIanc } from './perdidas'

export type Config = {
  nombre: string
  razon: string
  nit: string
  direccion: string
  ciudad: string
  telefono: string
  whatsapp: string
  correo: string
  horario: string
  gerente: string
  reconexion: number // $ por reconexión
  umbralAlto: number // m³ por periodo
  baseCaja: number // $ base inicial de caja
  metaIanc: number // fracción (0.3 = 30 %)
}

export const CONFIG_INICIAL: Config = {
  nombre: 'EMCAGUA APC',
  razon: 'Empresa de Servicios Públicos de El Carmen y Guamalito · Administración Pública Cooperativa',
  nit: '',
  direccion: '',
  ciudad: 'El Carmen, Norte de Santander',
  telefono: '',
  whatsapp: '',
  correo: '',
  horario: 'Lunes a viernes, 8:00 a. m. a 12:00 m. y 2:00 a 6:00 p. m.',
  gerente: '',
  reconexion: 30000,
  umbralAlto: 30,
  baseCaja: 200000,
  metaIanc: 0.3,
}

const KEY = 'emcagua_config'
let actual: Config = (() => {
  try { return { ...CONFIG_INICIAL, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return CONFIG_INICIAL }
})()
setParametros(actual)
setMetaIanc(actual.metaIanc)
const oyentes = new Set<() => void>()

export const cfg = () => actual

export function guardarConfig(c: Config) {
  actual = c
  setParametros(c)
  setMetaIanc(c.metaIanc)
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* sin almacenamiento */ }
  oyentes.forEach((f) => f())
}

const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f) } }

/** Lee la configuración y se vuelve a dibujar cuando cambia. */
export const useConfig = () => useSyncExternalStore(suscribir, cfg)

/** Línea de contacto para membretes: "NIT … · Dirección … · Tel. …" (solo lo que esté lleno). */
export const lineaContacto = (c = actual) => [c.nit && `NIT ${c.nit}`, c.direccion, c.telefono && `Tel. ${c.telefono}`, c.correo].filter(Boolean).join(' · ')
