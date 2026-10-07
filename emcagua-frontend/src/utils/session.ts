import { buscarCuenta, rolDe, type Cuenta, type Rol } from '../data/cuentas'
import type { CuentaApi } from '../data/api'

const KEY = 'emcagua_user'

/** Sesión guardada. Con `token` = conectada a la API; sin token = modo demostración (datos del navegador). */
type Guardada = { username: string; token?: string; cuenta?: CuentaApi }

function leer(): Guardada | null {
  try {
    const u = localStorage.getItem(KEY)
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export function getUsername(fallback = 'Trabajador'): string {
  return leer()?.username || fallback
}

export function isLoggedIn() {
  return !!leer()
}

export function login(username: string, api?: { token: string; cuenta: CuentaApi }) {
  try { localStorage.setItem(KEY, JSON.stringify({ username, ...api })) } catch { /* sin almacenamiento */ }
}

/** Refresca nombre, rol y permisos de la sesión con lo que dice el servidor (si el gerente los cambió). */
export function actualizarCuentaApi(cuenta: CuentaApi) {
  const s = leer()
  if (s?.token) login(s.username, { token: s.token, cuenta })
}

export function logout() {
  try { localStorage.removeItem(KEY) } catch { /* sin almacenamiento */ }
}

/** Token de la API (undefined en modo demostración). */
export { tokenApi } from '../data/api'

/** Cuenta del funcionario que inició sesión (o undefined si no existe o está inactiva). */
export function cuentaActual(): Cuenta | undefined {
  const s = leer()
  if (s?.token && s.cuenta) return { usuario: s.cuenta.usuario, nombre: s.cuenta.nombre, cargo: s.cuenta.cargo, rol: s.cuenta.rol, activo: true, creada: 0 }
  const c = buscarCuenta(s?.username ?? '')
  return c?.activo ? c : undefined
}

/** Rol del funcionario: el que devuelve la API o, en demostración, el guardado en el navegador. */
export function rolActual(): Rol | undefined {
  const s = leer()
  if (s?.token && s.cuenta) return { id: s.cuenta.rol, nombre: s.cuenta.rolNombre, descripcion: '', permisos: s.cuenta.permisos, fijo: s.cuenta.fijo }
  return rolDe(cuentaActual())
}

/** ¿El rol del funcionario permite ver este módulo? (id = ruta sin "/") */
export function puede(modulo: string) {
  const rol = rolActual()
  // El rol fijo (Gerente) ve todo, incluso módulos nuevos que no estaban cuando se guardó el rol
  return !!rol && (!!rol.fijo || rol.permisos.includes(modulo))
}

/** Administrador = rol con acceso total (Gerente). */
export function isAdmin() {
  return !!rolActual()?.fijo
}
