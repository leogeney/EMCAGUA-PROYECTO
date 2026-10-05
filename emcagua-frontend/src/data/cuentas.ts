/**
 * Cuentas de los funcionarios y roles con los módulos que cada uno puede ver.
 * Mientras no exista el backend se guardan en este navegador. Las contraseñas NO se guardan aquí:
 * las validará el servidor (con cifrado) cuando exista.
 */
import { useSyncExternalStore } from 'react'

export type Modulo = { id: string; nombre: string; grupo: string }

/** Módulos que se pueden permitir o negar. El id coincide con la ruta (sin "/"). */
export const MODULOS: Modulo[] = [
  { id: 'mi-dia', nombre: 'Mi día', grupo: 'General' },
  { id: 'dashboard', nombre: 'Dashboard', grupo: 'General' },
  { id: 'analitica', nombre: 'Analítica', grupo: 'General' },
  { id: 'asistente', nombre: 'Asistente IA (Gotita)', grupo: 'General' },
  { id: 'reporte', nombre: 'Reportes', grupo: 'General' },
  { id: 'usuarios', nombre: 'Usuarios', grupo: 'Operación' },
  { id: 'lecturas', nombre: 'Medidores', grupo: 'Operación' },
  { id: 'facturacion', nombre: 'Facturación', grupo: 'Operación' },
  { id: 'pagos', nombre: 'Pagos y caja (cobrar y arqueo)', grupo: 'Operación' },
  { id: 'gastos', nombre: 'Gastos y resumen de caja', grupo: 'Operación' },
  { id: 'pqr', nombre: 'PQR', grupo: 'Operación' },
  { id: 'perdidas', nombre: 'Pérdidas de agua', grupo: 'Operación' },
  { id: 'inventario', nombre: 'Inventario', grupo: 'Operación' },
  { id: 'documentos', nombre: 'Documentos', grupo: 'Comunicación' },
  { id: 'redes', nombre: 'Redes sociales', grupo: 'Comunicación' },
  { id: 'avisos', nombre: 'Avisos WhatsApp', grupo: 'Comunicación' },
  { id: 'tarifas', nombre: 'Tarifas', grupo: 'Administración' },
  { id: 'sui', nombre: 'Reportes SUI', grupo: 'Administración' },
  { id: 'nomina', nombre: 'Nómina', grupo: 'Administración' },
  { id: 'configuracion', nombre: 'Configuración', grupo: 'Administración' },
  { id: 'cuentas', nombre: 'Cuentas y roles', grupo: 'Administración' },
]

export type Rol = { id: string; nombre: string; descripcion: string; permisos: string[]; fijo?: boolean }
export type Cuenta = { usuario: string; nombre: string; cargo: string; rol: string; activo: boolean; creada: number; ultimoAcceso?: number }

const TODOS = MODULOS.map((m) => m.id)

export const ROLES_INICIALES: Rol[] = [
  { id: 'gerente', nombre: 'Gerente', descripcion: 'Acceso a todo el sistema.', permisos: TODOS, fijo: true },
  { id: 'secretaria', nombre: 'Atención al usuario', descripcion: 'Recibe usuarios, PQR y prepara documentos.', permisos: ['mi-dia', 'dashboard', 'asistente', 'usuarios', 'facturacion', 'pqr', 'documentos', 'redes', 'avisos'] },
  { id: 'cajera', nombre: 'Cajera', descripcion: 'Cobra facturas y hace el arqueo diario.', permisos: ['mi-dia', 'asistente', 'usuarios', 'facturacion', 'pagos'] },
  { id: 'tecnico', nombre: 'Técnico / fontanero', descripcion: 'Medidores, fugas, materiales y visitas.', permisos: ['mi-dia', 'asistente', 'usuarios', 'lecturas', 'perdidas', 'inventario', 'pqr'] },
  { id: 'contador', nombre: 'Contador', descripcion: 'Caja, gastos, tarifas, reportes y nómina.', permisos: ['mi-dia', 'dashboard', 'analitica', 'asistente', 'reporte', 'facturacion', 'pagos', 'gastos', 'tarifas', 'sui', 'nomina'] },
]

const ahora = Date.now()
export const CUENTAS_INICIALES: Cuenta[] = [
  { usuario: 'admin', nombre: 'Administrador', cargo: 'Gerencia', rol: 'gerente', activo: true, creada: ahora },
  { usuario: 'yaneth', nombre: 'Yaneth Quintero', cargo: 'Tesorera / Cajera', rol: 'cajera', activo: true, creada: ahora },
  { usuario: 'diana', nombre: 'Diana Carrascal', cargo: 'Secretaria', rol: 'secretaria', activo: true, creada: ahora },
  { usuario: 'alvaro', nombre: 'Álvaro Pacheco', cargo: 'Fontanero', rol: 'tecnico', activo: true, creada: ahora },
  { usuario: 'martha', nombre: 'Martha Ascanio', cargo: 'Contadora', rol: 'contador', activo: true, creada: ahora },
]

/* ------------------------------ Almacén ------------------------------ */

type Estado = { roles: Rol[]; cuentas: Cuenta[] }
const KEY = 'emcagua_cuentas'

let estado: Estado = (() => {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Estado | null
    if (g?.roles?.length && g?.cuentas?.length) {
      // El rol Gerente siempre conserva todos los permisos (incluidos módulos nuevos)
      return { cuentas: g.cuentas, roles: g.roles.map((r) => (r.fijo ? { ...r, permisos: TODOS } : r)) }
    }
  } catch { /* sin almacenamiento */ }
  return { roles: ROLES_INICIALES, cuentas: CUENTAS_INICIALES }
})()
const oyentes = new Set<() => void>()

function guardar(e: Estado) {
  estado = e
  try { localStorage.setItem(KEY, JSON.stringify(e)) } catch { /* sin almacenamiento */ }
  oyentes.forEach((f) => f())
}

export const leerCuentas = () => estado
export const useCuentas = () => useSyncExternalStore((f) => { oyentes.add(f); return () => { oyentes.delete(f) } }, leerCuentas)

export const guardarCuenta = (c: Cuenta) => guardar({ ...estado, cuentas: estado.cuentas.some((x) => x.usuario === c.usuario) ? estado.cuentas.map((x) => (x.usuario === c.usuario ? c : x)) : [...estado.cuentas, c] })
export const guardarRol = (r: Rol) => guardar({ ...estado, roles: estado.roles.some((x) => x.id === r.id) ? estado.roles.map((x) => (x.id === r.id ? r : x)) : [...estado.roles, r] })
export const borrarRol = (id: string) => guardar({ ...estado, roles: estado.roles.filter((r) => r.id !== id || r.fijo) })
export const registrarAcceso = (usuario: string) => guardar({ ...estado, cuentas: estado.cuentas.map((c) => (c.usuario === usuario ? { ...c, ultimoAcceso: Date.now() } : c)) })

export const buscarCuenta = (usuario: string) => estado.cuentas.find((c) => c.usuario.toLowerCase() === usuario.trim().toLowerCase())
export const rolDe = (c?: Cuenta) => estado.roles.find((r) => r.id === c?.rol)
