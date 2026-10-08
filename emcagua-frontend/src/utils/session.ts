import { buscarCuenta, rolDe, type Cuenta, type Rol } from '../data/cuentas'
import type { CuentaApi } from '../data/api'

const KEY = 'emcagua_user'

/** Sesión guardada. Con `token` = conectada a la API; sin token = modo demostración (datos del navegador). */
type Guardada = { username: string; token?: string; cuenta?: CuentaApi; actividad?: number }

/** Minutos sin usar el sistema tras los que la sesión se cierra sola (computador compartido en la oficina). */
export const MINUTOS_INACTIVIDAD = 30

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

/** Segundos de vencimiento del token (campo exp del JWT), o undefined si no se puede leer. */
function expiraToken(token: string): number | undefined {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp } catch { return undefined }
}

/** ¿La sesión sigue siendo válida? (token sin vencer y uso reciente). Si no, la cierra. */
export function sesionVigente(): boolean {
  const s = leer()
  if (!s) return false
  const exp = s.token ? expiraToken(s.token) : undefined
  const vencida = (exp !== undefined && exp * 1000 <= Date.now()) || (s.actividad !== undefined && Date.now() - s.actividad > MINUTOS_INACTIVIDAD * 60_000)
  if (vencida) { logout(); return false }
  return true
}

export function isLoggedIn() {
  return sesionVigente()
}

/** Marca que el funcionario está usando el sistema (reinicia el contador de inactividad). */
export function registrarActividad() {
  const s = leer()
  if (!s) return
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, actividad: Date.now() })) } catch { /* sin almacenamiento */ }
}

/** ¿Hay una sesión de funcionario abierta en este navegador? (sin cerrarla) */
export function haySesionFuncionario() {
  return !!leer()
}

export function login(username: string, api?: { token: string; cuenta: CuentaApi }) {
  try { localStorage.setItem(KEY, JSON.stringify({ username, ...api, actividad: Date.now() })) } catch { /* sin almacenamiento */ }
}

/** Refresca nombre, rol y permisos de la sesión con lo que dice el servidor (si el gerente los cambió). */
export function actualizarCuentaApi(cuenta: CuentaApi) {
  const s = leer()
  if (s?.token) { try { localStorage.setItem(KEY, JSON.stringify({ ...s, cuenta })) } catch { /* sin almacenamiento */ } }
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
