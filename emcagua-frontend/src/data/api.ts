/**
 * Conexión con la API (backend Spring Boot).
 * Si la API no responde, la aplicación sigue funcionando con los datos de demostración del navegador.
 */
/** Sesión guardada por utils/session (se lee aquí directamente para no crear importaciones circulares). */
const KEY_SESION = 'emcagua_user'
export function tokenApi(): string | undefined {
  try { return JSON.parse(localStorage.getItem(KEY_SESION) ?? 'null')?.token } catch { return undefined }
}

/** La API respondió 401 (token vencido): se cierra la sesión y se vuelve al inicio de sesión. */
export function cerrarSesionApi() {
  try { localStorage.removeItem(KEY_SESION) } catch { /* sin almacenamiento */ }
  if (!window.location.pathname.startsWith('/login')) window.location.assign('/login')
}

export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080').replace(/\/+$/, '')

export class ErrorApi extends Error {
  estado: number
  constructor(estado: number, mensaje: string) { super(mensaje); this.estado = estado }
}

export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  const token = tokenApi()
  let r: Response
  try {
    r = await fetch(`${API_URL}/api${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: { ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el servidor. Revisa que la API esté encendida.')
  }
  if (r.status === 401 && token) {
    cerrarSesionApi()
    throw new ErrorApi(401, 'La sesión venció. Vuelve a iniciar sesión.')
  }
  const texto = await r.text()
  const datos = texto ? (() => { try { return JSON.parse(texto) } catch { return texto } })() : null
  if (!r.ok) throw new ErrorApi(r.status, (datos && typeof datos === 'object' && 'error' in datos ? String(datos.error) : '') || `Error ${r.status} del servidor`)
  return datos as T
}

export type CuentaApi = { id: number; usuario: string; nombre: string; cargo: string; rol: string; rolNombre: string; fijo: boolean; permisos: string[] }
export type LoginApi = { token: string; expiraEnSegundos: number; cuenta: CuentaApi }

/**
 * Inicia sesión en la API. Devuelve:
 * - la sesión si la clave es correcta,
 * - un ErrorApi con el mensaje si la API rechaza la clave,
 * - null si la API no está encendida (se usa el modo demostración).
 */
export async function loginApi(usuario: string, clave: string): Promise<LoginApi | ErrorApi | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const r = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, clave }), signal: ctrl.signal })
    clearTimeout(t)
    const datos = await r.json().catch(() => ({}))
    if (!r.ok) return new ErrorApi(r.status, datos.error || 'Usuario o contraseña incorrectos')
    return datos as LoginApi
  } catch {
    return null
  }
}

/** true = hay sesión con la API: los datos se leen y guardan en la base de datos. Se decide al cargar la página. */
export const MODO_API = !!tokenApi()

/** Mensaje legible de cualquier error. */
export const mensajeError = (e: unknown) => (e instanceof Error ? e.message : String(e))
