/**
 * Configuración de la empresa (datos para documentos, piezas de redes y parámetros de operación).
 * Mientras no exista el backend se guarda en este navegador.
 */
import { useSyncExternalStore } from 'react'
import { setParametros } from './constants'
import { setMetaIanc } from './perdidas'
import { api, API_URL, MODO_API } from './api'

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
  /** Cobro mensual fijo de los predios sin medidor, por estrato */
  cobroFijoEstrato1: number
  cobroFijoEstrato2: number
  cobroFijoEstrato3: number
  /** Modo sin medidores: todos los predios pagan el valor fijo de su estrato (la empresa aún no tiene medidores) */
  modoSinMedidores: boolean
  /** Dirección de internet del sistema (va en los QR). Vacío = la dirección actual del navegador. */
  urlPublica: string
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
  cobroFijoEstrato1: 14000,
  cobroFijoEstrato2: 16000,
  cobroFijoEstrato3: 20000,
  modoSinMedidores: true,
  urlPublica: '',
}

const KEY = 'emcagua_config'
let actual: Config = (() => {
  try { return { ...CONFIG_INICIAL, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return CONFIG_INICIAL }
})()
setParametros(actual)
setMetaIanc(actual.metaIanc)
const oyentes = new Set<() => void>()

export const cfg = () => actual

function aplicar(c: Config) {
  actual = c
  setParametros(c)
  setMetaIanc(c.metaIanc)
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* sin almacenamiento */ }
  oyentes.forEach((f) => f())
}

/** Guarda la configuración. Con la API se guarda en la base de datos (si falla, lanza el error con el mensaje). */
export async function guardarConfig(c: Config) {
  if (MODO_API) {
    const g = await api<Config>('/configuracion', { metodo: 'PUT', cuerpo: c })
    aplicar({ ...CONFIG_INICIAL, ...limpio(g) })
    return
  }
  aplicar(c)
}

/** El predio se cobra por consumo: tiene medidor instalado y el modo sin medidores está apagado. */
export const medido = (u: { conMedidor: boolean }, c = actual) => u.conMedidor && !c.modoSinMedidores

/** Prende o apaga el modo sin medidores (se guarda de una vez). */
export const cambiarModoSinMedidores = (activo: boolean) => guardarConfig({ ...actual, modoSinMedidores: activo })

/** Quita los null que puede devolver la base de datos. */
const limpio = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) as Partial<Config>

/** Con sesión: trae la configuración de la base de datos. */
export async function cargarConfigApi() {
  if (!MODO_API) return
  try { aplicar({ ...CONFIG_INICIAL, ...limpio(await api<Record<string, unknown>>('/configuracion')) }) } catch { /* se queda la guardada */ }
}

/** Páginas públicas (portal y verificación): datos de contacto de la empresa, si la API está encendida. */
export async function cargarConfigPublica() {
  try {
    const r = await fetch(`${API_URL}/api/configuracion/publica`)
    if (r.ok) aplicar({ ...actual, ...limpio(await r.json()) })
  } catch { /* sin API: se usa la guardada en el navegador */ }
}

const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f) } }

/** Lee la configuración y se vuelve a dibujar cuando cambia. */
export const useConfig = () => useSyncExternalStore(suscribir, cfg)

/** Línea de contacto para membretes: "NIT … · Dirección … · Tel. …" (solo lo que esté lleno). */
export const lineaContacto = (c = actual) => [c.nit && `NIT ${c.nit}`, c.direccion, c.telefono && `Tel. ${c.telefono}`, c.correo].filter(Boolean).join(' · ')
