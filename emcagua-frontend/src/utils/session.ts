import { buscarCuenta, rolDe } from '../data/cuentas'

const KEY = 'emcagua_user'

export function getUsername(fallback = 'Trabajador'): string {
  try {
    const u = localStorage.getItem(KEY)
    return u ? JSON.parse(u).username || fallback : fallback
  } catch {
    return fallback
  }
}

export function isLoggedIn() {
  try {
    return !!localStorage.getItem(KEY)
  } catch {
    return false
  }
}

export function login(username: string) {
  localStorage.setItem(KEY, JSON.stringify({ username }))
}

export function logout() {
  localStorage.removeItem(KEY)
}

/** Cuenta del funcionario que inició sesión (o undefined si no existe o está inactiva). */
export function cuentaActual() {
  const c = buscarCuenta(getUsername(''))
  return c?.activo ? c : undefined
}

/** ¿El rol del funcionario permite ver este módulo? (id = ruta sin "/") */
export function puede(modulo: string) {
  const rol = rolDe(cuentaActual())
  // El rol fijo (Gerente) ve todo, incluso módulos nuevos que no estaban cuando se guardó el rol
  return !!rol && (!!rol.fijo || rol.permisos.includes(modulo))
}

/** Administrador = rol con acceso total (Gerente). */
export function isAdmin() {
  return !!rolDe(cuentaActual())?.fijo
}
