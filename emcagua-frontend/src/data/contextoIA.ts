/**
 * Contexto ampliado para la IA: lo que no cubre resumenParaModelo (configuración, caja y gastos,
 * inventario, nómina, cuentas, zonas, solicitudes, tarifas, documentos, copias de seguridad)
 * más la revisión automática. Solo entra lo que el rol del funcionario puede ver, y para no
 * saturar el modelo se mandan las secciones del apartado actual y las que nombra la pregunta.
 */
import type { Config } from './config'
import type { Cuenta, Rol } from './cuentas'
import type { SectorZona } from './zonas'
import type { SolicitudRegistro } from './solicitudes'
import type { EstadoRespaldos } from './respaldos'
import type { Material, Egreso, CierreCaja } from './operacion'
import { estadoStock } from './operacion'
import type { Empleado, Parametros } from './nomina'
import type { PeriodoNomina } from './NominaContext'
import type { Emitido } from './DocumentosContext'
import type { Usuario, Pago } from './types'
import { listaVigencias } from './tarifa'
import { hallazgosComoTexto, type Hallazgo } from './revision'
import { cop } from '../utils/format'
import { puede } from '../utils/session'

export type DatosAmpliados = {
  modulo: string
  conf: Config
  usuarios: Usuario[]
  pagos: Pago[]
  materiales: Material[]
  egresos: Egreso[]
  cierres: CierreCaja[]
  empleados: Empleado[]
  parametros: Parametros
  periodos: Record<string, PeriodoNomina>
  cuentas: Cuenta[]
  roles: Rol[]
  zonas: SectorZona[]
  solicitudes: SolicitudRegistro[]
  respaldos: EstadoRespaldos | null
  emitidos: Emitido[]
  hallazgos: Hallazgo[]
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function contextoAmpliado(pregunta: string, d: DatosAmpliados) {
  const q = norm(pregunta)
  const general = !q || /resumen|gerencia|informe|general|como va|todo|revis|analiz|mal|falta|recomiend/.test(q) || d.modulo === 'mi-dia' || d.modulo === 'dashboard'
  /** La sección entra si es del apartado actual, si la pregunta la nombra o si es una revisión general. */
  const entra = (mod: string, re: RegExp) => puede(mod) && (general || d.modulo === mod || re.test(q))
  const hoy = new Date()
  const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const s: string[] = []

  s.push(`APARTADO DONDE ESTÁ EL FUNCIONARIO: ${d.modulo}.`)

  if (entra('configuracion', /config|empresa|nit|telefono|modo|medidor|fijo|estrato|respald|copia|barrio|sector/)) {
    const c = d.conf
    s.push(`CONFIGURACIÓN: empresa ${c.nombre}; NIT ${c.nit || '(vacío)'}; teléfono ${c.telefono || '(vacío)'}; WhatsApp ${c.whatsapp || '(vacío)'}; dirección ${c.direccion || '(vacía)'}; gerente ${c.gerente || '(vacío)'}. Modo sin medidores: ${c.modoSinMedidores ? 'ACTIVO (todos pagan valor fijo)' : 'apagado'}. Cobro fijo por estrato: E1 ${cop(c.cobroFijoEstrato1)}, E2 ${cop(c.cobroFijoEstrato2)}, E3+ ${cop(c.cobroFijoEstrato3)}. Reconexión ${cop(c.reconexion)}. Consumo alto desde ${c.umbralAlto} m³. Meta de pérdidas ${Math.round(c.metaIanc * 100)} %.`)
    s.push(`SECTORES Y BARRIOS: ${d.zonas.map((z) => `${z.nombre} (${z.barrios.length ? z.barrios.map((b) => b.nombre).join(', ') : 'sin barrios'})`).join('; ')}.`)
    if (d.respaldos) s.push(`COPIAS DE SEGURIDAD: ${d.respaldos.archivos.length} guardadas; última ${d.respaldos.archivos[0] ? new Date(d.respaldos.archivos[0].fecha).toLocaleString('es-CO') : 'ninguna'}${d.respaldos.ultimoError ? `; ÚLTIMO ERROR: ${d.respaldos.ultimoError}` : ''}; segunda carpeta ${d.respaldos.carpetaExtra || '(no configurada)'}.`)
  }
  if (entra('usuarios', /usuario|suscrip|predio|solicitud|registro|celular|telefono|direccion/)) {
    const pend = d.solicitudes.filter((x) => x.estado === 'Pendiente')
    s.push(`SOLICITUDES DE REGISTRO (oficina virtual): ${pend.length} pendientes${pend.length ? `: ${pend.slice(0, 6).map((x) => `${x.nombre} (${x.sector}, estrato ${x.estrato}, desde ${new Date(x.creada).toLocaleDateString('es-CO')})`).join('; ')}` : ''}. Revisadas: ${d.solicitudes.length - pend.length}.`)
    s.push(`DATOS DE PREDIOS: ${d.usuarios.filter((u) => !u.telefono?.replace(/\D/g, '')).length} sin celular, ${d.usuarios.filter((u) => !u.barrio).length} sin barrio, ${d.usuarios.filter((u) => u.conMedidor).length} con medidor, ${d.usuarios.filter((u) => u.cuentaPortal).length} con cuenta en la oficina virtual. Por estrato: ${[1, 2, 3].map((e) => `E${e} ${d.usuarios.filter((u) => Math.min(3, u.estrato) === e).length}`).join(', ')}.`)
  }
  if (entra('facturacion', /factur|tarifa|cobro|cierre|periodo/) || entra('tarifas', /tarifa|cra|subsid/)) {
    const v = listaVigencias()
    s.push(`TARIFAS CRA REGISTRADAS: ${v.length ? v.map((t) => `desde ${t.desde.mes}/${t.desde.anio}`).join(', ') : 'ninguna (se usa la tarifa simple de ejemplo para quien tenga medidor)'}.`)
  }
  if (entra('pagos', /caja|pago|gasto|egreso|cierre|efectivo|cuadr|arqueo/)) {
    const gMes = d.egresos.filter((e) => e.fecha.startsWith(mes))
    const porCat = Object.entries(gMes.reduce<Record<string, number>>((a, e) => ((a[e.categoria] = (a[e.categoria] ?? 0) + e.valor), a), {}))
    s.push(`GASTOS DEL MES: ${cop(gMes.reduce((t, e) => t + e.valor, 0))} en ${gMes.length} registros${porCat.length ? ` (${porCat.map(([k, v]) => `${k} ${cop(v)}`).join(', ')})` : ''}; ${gMes.filter((e) => !e.soporte).length} sin soporte.`)
    s.push(`CIERRES DE CAJA (últimos 7): ${d.cierres.slice(-7).map((c) => `${c.fecha} ${c.diferencia === 0 ? 'cuadró' : `${c.diferencia > 0 ? 'sobró' : 'faltó'} ${cop(Math.abs(c.diferencia))}`}`).join('; ') || 'ninguno'}.`)
    s.push(`PAGOS POR MEDIO (60 días): ${['Efectivo', 'Transferencia', 'En línea'].map((m) => `${m} ${cop(d.pagos.filter((p) => p.metodo === m && Date.now() - p.timestamp < 60 * 864e5).reduce((t, p) => t + p.monto, 0))}`).join(', ')}.`)
  }
  if (entra('inventario', /inventar|material|stock|compra|bodega|repuest/)) {
    s.push(`INVENTARIO: ${d.materiales.length} materiales${d.materiales.length ? `; bajo mínimo o agotados: ${d.materiales.filter((m) => estadoStock(m) !== 'OK').map((m) => `${m.nombre} (${m.stock}/${m.minimo} ${m.unidad})`).join(', ') || 'ninguno'}; valor en bodega ${cop(d.materiales.reduce((t, m) => t + m.stock * m.costo, 0))}` : ''}.`)
  }
  if (entra('nomina', /nomina|emplead|salario|sueldo|prima|vacacion|eps|pension|arl/)) {
    const act = d.empleados.filter((e) => e.activo)
    const per = d.periodos[mes]
    s.push(`NÓMINA: ${act.length} empleados activos; salarios ${cop(act.reduce((t, e) => t + e.salario, 0))} al mes; SMMLV ${cop(d.parametros.smmlv)}; nómina de este mes: ${per ? per.estado : 'sin crear'}. ${act.map((e) => `${e.nombre} (${e.cargo}, ${cop(e.salario)}${!e.eps || !e.pension ? ', falta EPS/pensión' : ''})`).join('; ')}.`)
  }
  if (entra('cuentas', /cuenta|rol|permiso|funcionari|acceso|contrasen/)) {
    s.push(`CUENTAS DEL SISTEMA: ${d.cuentas.map((c) => `${c.nombre} [${c.usuario}] rol ${d.roles.find((r) => r.id === c.rol)?.nombre ?? c.rol}${c.activo ? '' : ' (inactiva)'}${c.ultimoAcceso ? `, último acceso ${new Date(c.ultimoAcceso).toLocaleDateString('es-CO')}` : ', nunca ha entrado'}`).join('; ')}.`)
  }
  if (entra('documentos', /document|carta|certific|acta|consecutiv/)) {
    s.push(`DOCUMENTOS EMITIDOS: ${d.emitidos.length}${d.emitidos.length ? `; últimos: ${d.emitidos.slice(-5).map((e) => `${e.consecutivo} ${e.nombre} a ${e.dirigidoA}`).join('; ')}` : ''}.`)
  }
  if (d.hallazgos.length) {
    const rel = general ? d.hallazgos : d.hallazgos.filter((h) => h.modulo === d.modulo || re(h.modulo, q))
    if (rel.length) s.push(`REVISIÓN AUTOMÁTICA (problemas, datos faltantes y consejos que el sistema ya detectó):\n${hallazgosComoTexto(rel, general ? 12 : 8)}`)
  }
  return s.join('\n')
}

const re = (modulo: string, q: string) => q.includes(norm(modulo).slice(0, 5))
