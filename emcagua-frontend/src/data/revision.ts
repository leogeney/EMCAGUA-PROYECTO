/* eslint-disable react-refresh/only-export-components */
/**
 * Revisión automática de la base de datos: en cada apartado busca lo que está MAL (problema),
 * lo que FALTA llenar (falta) y lo que conviene HACER (consejo). La usan la barra de cada
 * pantalla y la IA (va dentro del contexto que se le manda).
 */
import { useMemo, useSyncExternalStore } from 'react'
import { useData } from './DataContext'
import { usePqr } from './PqrContext'
import { useOperacion } from './OperacionContext'
import { claveNomina, useNomina } from './NominaContext'
import { useConfig } from './config'
import { useCuentas } from './cuentas'
import { useZonas } from './zonas'
import { useSolicitudes } from './solicitudes'
import { horasDesdeUltima, useRespaldos } from './respaldos'
import { listaVigencias, suscribirTarifa, versionTarifa } from './tarifa'
import { hayMacromediciones } from './perdidas'
import { diasHabilesRestantes } from './pqr'
import { iso } from './operacion'
import { cop } from '../utils/format'
import { isAdmin, puede } from '../utils/session'

export type NivelHallazgo = 'problema' | 'falta' | 'consejo'
export type Hallazgo = {
  id: string
  /** Módulo (ruta sin "/") donde se muestra */
  modulo: string
  nivel: NivelHallazgo
  titulo: string
  detalle: string
  accion?: { label: string; to: string }
}

export const NOMBRE_MODULO: Record<string, string> = {
  'mi-dia': 'Mi día', dashboard: 'Dashboard', analitica: 'Analítica', usuarios: 'Usuarios', lecturas: 'Medidores', facturacion: 'Facturación',
  pagos: 'Pagos y caja', pqr: 'PQR', perdidas: 'Pérdidas de agua', inventario: 'Inventario', documentos: 'Documentos', redes: 'Redes sociales',
  avisos: 'Avisos WhatsApp', tarifas: 'Tarifas', sui: 'Reportes SUI', nomina: 'Nómina', configuracion: 'Configuración', cuentas: 'Cuentas y roles',
  reporte: 'Reportes', asistente: 'Asistente IA',
}

/* "Ahora no": se esconde 7 días en este navegador */
const CLAVE = 'emcagua_revision_pospuestos'
const SIETE_DIAS = 7 * 86_400_000
let pospuestos: Record<string, number> = (() => { try { return JSON.parse(localStorage.getItem(CLAVE) ?? '{}') } catch { return {} } })()
const oyentes = new Set<() => void>()
export function posponerHallazgo(id: string) {
  pospuestos = { ...pospuestos, [id]: Date.now() }
  try { localStorage.setItem(CLAVE, JSON.stringify(pospuestos)) } catch { /* sin almacenamiento */ }
  oyentes.forEach((f) => f())
}
const usePospuestos = () => useSyncExternalStore((f) => { oyentes.add(f); return () => { oyentes.delete(f) } }, () => pospuestos)

const digitos = (s?: string) => (s ?? '').replace(/\D/g, '')
const lista = (xs: string[], n = 4) => xs.slice(0, n).join(', ') + (xs.length > n ? ` y ${xs.length - n} más` : '')

export function useRevision(): Hallazgo[] {
  const { usuarios, pagos, resumen, lecturas, periodoLectura } = useData()
  const { pqrs } = usePqr()
  const { materiales, egresos, cierres } = useOperacion()
  const { empleados, parametros, periodos } = useNomina()
  const conf = useConfig()
  const { cuentas, roles } = useCuentas()
  const zonas = useZonas()
  const solicitudes = useSolicitudes()
  const respaldos = useRespaldos()
  const tarifaV = useSyncExternalStore(suscribirTarifa, versionTarifa)
  const p = usePospuestos()

  const todos = useMemo(() => {
    const out: Hallazgo[] = []
    const hoy = new Date()
    const ahora = hoy.getTime()
    const DIA = 86_400_000
    const activos = usuarios.filter((u) => u.estado === 'Activo')

    /* ------------------------------ Configuración ------------------------------ */
    const faltanConf = ([['NIT', conf.nit], ['teléfono', conf.telefono], ['dirección', conf.direccion], ['WhatsApp', conf.whatsapp], ['gerente', conf.gerente]] as const).filter(([, v]) => !v?.trim()).map(([k]) => k)
    if (faltanConf.length) out.push({ id: `conf-${faltanConf.join('.')}`, modulo: 'configuracion', nivel: 'falta', titulo: `Faltan datos de la empresa: ${faltanConf.join(', ')}`, detalle: 'Salen en las facturas, recibos, cartas y en la oficina virtual. Sin ellos los documentos se ven incompletos.', accion: { label: 'Completar datos', to: '/configuracion' } })
    if (!conf.urlPublica?.trim()) out.push({ id: 'conf-url', modulo: 'configuracion', nivel: 'consejo', titulo: 'Define la dirección del sistema en internet', detalle: 'Los QR de facturas y recibos apuntan a esta dirección. Mientras esté vacía, solo funcionan dentro de este computador.', accion: { label: 'Configurar', to: '/configuracion' } })
    if (isAdmin() && respaldos) {
      const h = horasDesdeUltima(respaldos)
      if (respaldos.ultimoError) out.push({ id: `resp-err-${respaldos.ultimoIntento}`, modulo: 'configuracion', nivel: 'problema', titulo: 'La última copia de seguridad falló', detalle: respaldos.ultimoError, accion: { label: 'Ver copias', to: '/configuracion' } })
      else if (h > 26) out.push({ id: `resp-viejo-${Math.floor(h / 24)}`, modulo: 'configuracion', nivel: 'problema', titulo: respaldos.archivos.length ? `La última copia de seguridad tiene ${Math.floor(h / 24)} día(s)` : 'No hay ninguna copia de seguridad', detalle: 'Si el computador falla se perdería todo lo registrado desde entonces. Haz una copia ahora.', accion: { label: 'Hacer copia', to: '/configuracion' } })
      if (!respaldos.carpetaExtra?.trim()) out.push({ id: 'resp-extra', modulo: 'configuracion', nivel: 'consejo', titulo: 'Guarda las copias también fuera de este disco', detalle: 'Hoy las copias quedan solo en este computador. Elige una carpeta de OneDrive o una memoria USB como segunda copia.', accion: { label: 'Elegir carpeta', to: '/configuracion' } })
    }
    const sinBarrios = zonas.filter((z) => !z.barrios.length && usuarios.some((u) => u.sector === z.nombre)).map((z) => z.nombre)
    if (sinBarrios.length) out.push({ id: `zonas-${sinBarrios.join('.')}`, modulo: 'configuracion', nivel: 'consejo', titulo: `Agrega los barrios de ${lista(sinBarrios)}`, detalle: 'Esos sectores ya tienen predios pero ningún barrio creado: los reportes y avisos por barrio quedan incompletos.', accion: { label: 'Agregar barrios', to: '/configuracion' } })

    /* -------------------------------- Usuarios -------------------------------- */
    if (!usuarios.length) out.push({ id: 'usu-vacio', modulo: 'usuarios', nivel: 'falta', titulo: 'Todavía no hay suscriptores registrados', detalle: 'Sin predios no se puede facturar. Regístralos con «Nuevo predio» o aprueba las solicitudes que lleguen de la oficina virtual.', accion: { label: 'Ir a Usuarios', to: '/usuarios' } })
    const sinTel = usuarios.filter((u) => !digitos(u.telefono))
    if (sinTel.length) out.push({ id: `usu-sintel-${sinTel.length}`, modulo: 'usuarios', nivel: 'falta', titulo: `${sinTel.length} predio(s) sin celular`, detalle: `${lista(sinTel.map((u) => `${u.nombre} (${u.id})`))}. No pueden recibir avisos por WhatsApp ni crear su cuenta en la oficina virtual.`, accion: { label: 'Ver usuarios', to: '/usuarios' } })
    const telMalo = usuarios.filter((u) => digitos(u.telefono) && !/^3\d{9}$/.test(digitos(u.telefono)))
    if (telMalo.length) out.push({ id: `usu-telmalo-${telMalo.length}`, modulo: 'usuarios', nivel: 'problema', titulo: `${telMalo.length} celular(es) mal escritos`, detalle: `${lista(telMalo.map((u) => `${u.nombre}: ${u.telefono}`))}. Un celular colombiano tiene 10 dígitos y empieza por 3.`, accion: { label: 'Corregir', to: '/usuarios' } })
    const sinDir = usuarios.filter((u) => !u.direccion?.trim() || /^sin direcci/i.test(u.direccion))
    if (sinDir.length) out.push({ id: `usu-sindir-${sinDir.length}`, modulo: 'usuarios', nivel: 'falta', titulo: `${sinDir.length} predio(s) sin dirección`, detalle: `${lista(sinDir.map((u) => `${u.nombre} (${u.id})`))}. La dirección sale en la factura y la necesita el técnico para las visitas.`, accion: { label: 'Completar', to: '/usuarios' } })
    const sinBarrio = usuarios.filter((u) => !u.barrio && zonas.find((z) => z.nombre === u.sector)?.barrios.length)
    if (sinBarrio.length) out.push({ id: `usu-sinbarrio-${sinBarrio.length}`, modulo: 'usuarios', nivel: 'falta', titulo: `${sinBarrio.length} predio(s) sin barrio`, detalle: `${lista(sinBarrio.map((u) => `${u.nombre} (${u.sector})`))}. Su sector ya tiene barrios creados; asígnalos para que los reportes por barrio salgan completos.`, accion: { label: 'Asignar barrio', to: '/usuarios' } })
    const medSinNum = usuarios.filter((u) => u.conMedidor && (!u.medidor || u.medidor === `MED-${u.id}`))
    if (medSinNum.length) out.push({ id: `usu-medsinnum-${medSinNum.length}`, modulo: 'usuarios', nivel: 'falta', titulo: `${medSinNum.length} medidor(es) sin número real`, detalle: `${lista(medSinNum.map((u) => `${u.nombre} (${u.id})`))} están marcados con medidor pero tienen el número automático. Escribe el serial que trae el aparato.`, accion: { label: 'Completar', to: '/usuarios' } })
    const cortSinDeuda = usuarios.filter((u) => u.estado === 'Cortado' && resumen(u).deuda === 0)
    if (cortSinDeuda.length) out.push({ id: `usu-cortsindeuda-${cortSinDeuda.map((u) => u.id).join('.')}`, modulo: 'usuarios', nivel: 'consejo', titulo: `${cortSinDeuda.length} predio(s) cortado(s) que no deben nada`, detalle: `${lista(cortSinDeuda.map((u) => `${u.nombre} (${u.id})`))}. Revisa si ya se puede reconectar el servicio.`, accion: { label: 'Ver usuarios', to: '/usuarios' } })
    const pend = solicitudes.filter((s) => s.estado === 'Pendiente')
    if (pend.length) {
      const vieja = Math.max(...pend.map((s) => Math.floor((ahora - s.creada) / DIA)))
      out.push({ id: `usu-sol-${pend.length}-${vieja >= 3}`, modulo: 'usuarios', nivel: vieja >= 3 ? 'problema' : 'consejo', titulo: `${pend.length} solicitud(es) de registro esperando revisión`, detalle: `${lista(pend.map((s) => s.nombre))}.${vieja >= 3 ? ` La más antigua lleva ${vieja} días.` : ''} Mientras no se aprueben, esas personas no pueden entrar ni se les factura.`, accion: { label: 'Revisar solicitudes', to: '/usuarios?solicitudes=1' } })
    }

    /* ------------------------------- Facturación ------------------------------- */
    if (!conf.modoSinMedidores && !listaVigencias().length && usuarios.some((u) => u.conMedidor)) out.push({ id: 'fac-sintarifa', modulo: 'facturacion', nivel: 'problema', titulo: 'No hay tarifa CRA configurada', detalle: 'Con el modo sin medidores apagado, los predios con medidor se cobran por consumo y hoy se usa la tarifa simple de ejemplo. Registra la tarifa aprobada (cargo fijo, consumo y subsidios).', accion: { label: 'Ir a Tarifas', to: '/tarifas' } })
    if ([conf.cobroFijoEstrato1, conf.cobroFijoEstrato2, conf.cobroFijoEstrato3].some((v) => !v)) out.push({ id: 'fac-fijo0', modulo: 'facturacion', nivel: 'problema', titulo: 'Hay un cobro fijo en $0', detalle: 'Algún estrato no tiene valor fijo: a esos predios se les generarían facturas en cero.', accion: { label: 'Revisar cobro fijo', to: '/configuracion' } })
    const viejas = activos.map((u) => ({ u, f: resumen(u).pendientes.filter((f) => ahora - f.vencimiento.getTime() > 90 * DIA) })).filter((x) => x.f.length)
    if (viejas.length) out.push({ id: `fac-90-${viejas.length}`, modulo: 'facturacion', nivel: 'problema', titulo: `${viejas.length} usuario(s) con facturas vencidas hace más de 90 días`, detalle: `${lista(viejas.map((x) => `${x.u.nombre} (${cop(x.f.reduce((s, f) => s + f.monto, 0))})`))}. Siguen con el servicio activo: ofrece acuerdo de pago o inicia la suspensión.`, accion: { label: 'Ver usuarios en mora', to: '/usuarios?filtro=vencidos' } })

    /* ------------------------------ Pagos y caja ------------------------------ */
    const diasSinCierre: string[] = []
    for (let i = 1; i <= 7; i++) {
      const d = iso(new Date(ahora - i * DIA))
      if (pagos.some((x) => x.metodo === 'Efectivo' && iso(new Date(x.timestamp)) === d) && !cierres.some((c) => c.fecha === d)) diasSinCierre.push(d)
    }
    if (diasSinCierre.length) out.push({ id: `caja-sincierre-${diasSinCierre.join('.')}`, modulo: 'pagos', nivel: 'problema', titulo: `${diasSinCierre.length} día(s) con efectivo y sin cierre de caja`, detalle: `${diasSinCierre.join(', ')}. Sin arqueo no se puede saber si el efectivo cuadra.`, accion: { label: 'Cerrar caja', to: '/pagos?tab=caja' } })
    const descuadres = cierres.filter((c) => c.diferencia !== 0 && ahora - c.ts < 30 * DIA)
    if (descuadres.length) out.push({ id: `caja-desc-${descuadres.map((c) => c.fecha).join('.')}`, modulo: 'pagos', nivel: 'problema', titulo: `${descuadres.length} cierre(s) de caja descuadrado(s) este mes`, detalle: descuadres.slice(0, 3).map((c) => `${c.fecha}: ${c.diferencia > 0 ? 'sobran' : 'faltan'} ${cop(Math.abs(c.diferencia))}`).join(' · ') + '. Deja anotado el motivo en cada cierre.', accion: { label: 'Ver caja', to: '/pagos?tab=caja' } })
    const transfSin = pagos.filter((x) => x.metodo === 'Transferencia' && !x.comprobante && ahora - x.timestamp < 60 * DIA)
    if (transfSin.length) out.push({ id: `caja-transf-${transfSin.length}`, modulo: 'pagos', nivel: 'falta', titulo: `${transfSin.length} transferencia(s) sin comprobante`, detalle: `${lista(transfSin.map((x) => `${x.id} ${x.cliente}`))}. Guarda la foto o el número del comprobante para poder verificarlas con el banco.`, accion: { label: 'Ver pagos', to: '/pagos' } })
    const egrSin = egresos.filter((e) => !e.soporte && ahora - e.ts < 30 * DIA)
    if (egrSin.length) out.push({ id: `caja-egr-${egrSin.length}`, modulo: 'pagos', nivel: 'falta', titulo: `${egrSin.length} gasto(s) sin soporte`, detalle: `${lista(egrSin.map((e) => `${e.descripcion} (${cop(e.valor)})`), 3)}. Adjunta la factura o recibo: lo pide la revisoría y la contraloría.`, accion: { label: 'Ver gastos', to: '/pagos?tab=gastos' } })

    /* ----------------------------------- PQR ----------------------------------- */
    const abiertas = pqrs.filter((x) => x.estado === 'Radicada' || x.estado === 'En trámite')
    const vencidas = abiertas.filter((x) => diasHabilesRestantes(x.vence) < 0)
    if (vencidas.length) out.push({ id: `pqr-venc-${vencidas.map((x) => x.radicado).join('.')}`, modulo: 'pqr', nivel: 'problema', titulo: `${vencidas.length} PQR vencida(s)`, detalle: `${lista(vencidas.map((x) => x.radicado))}. Pasaron los 15 días hábiles: aplica el silencio administrativo positivo (se entiende a favor del usuario).`, accion: { label: 'Responder', to: '/pqr' } })
    const sinResp = abiertas.filter((x) => !x.responsable)
    if (sinResp.length) out.push({ id: `pqr-sinresp-${sinResp.length}`, modulo: 'pqr', nivel: 'falta', titulo: `${sinResp.length} PQR sin responsable`, detalle: `${lista(sinResp.map((x) => `${x.radicado} (${x.categoria})`))}. Asigna quién la atiende para que no se quede quieta.`, accion: { label: 'Asignar', to: '/pqr' } })
    const sinCerrar = pqrs.filter((x) => x.estado === 'Respondida' && x.respondidaEn && ahora - x.respondidaEn > 15 * DIA)
    if (sinCerrar.length) out.push({ id: `pqr-sincerrar-${sinCerrar.length}`, modulo: 'pqr', nivel: 'consejo', titulo: `Cierra ${sinCerrar.length} PQR respondida(s) hace más de 15 días`, detalle: 'El plazo para que el usuario apele ya pasó; cerrarlas deja los indicadores del SUI al día.', accion: { label: 'Ver PQR', to: '/pqr' } })

    /* -------------------------------- Inventario -------------------------------- */
    if (!materiales.length) out.push({ id: 'inv-vacio', modulo: 'inventario', nivel: 'falta', titulo: 'El inventario está vacío', detalle: 'Registra los materiales (medidores, tubería, químicos, dotación) con su stock y mínimo para que el sistema avise antes de que se acaben.', accion: { label: 'Ir a Inventario', to: '/inventario' } })
    const agotados = materiales.filter((m) => m.stock <= 0)
    if (agotados.length) out.push({ id: `inv-agot-${agotados.map((m) => m.id).join('.')}`, modulo: 'inventario', nivel: 'problema', titulo: `${agotados.length} material(es) agotado(s)`, detalle: `${lista(agotados.map((m) => m.nombre))}. Si hay un daño no habrá con qué repararlo.`, accion: { label: 'Ver inventario', to: '/inventario' } })
    const sinCosto = materiales.filter((m) => !m.costo || !m.minimo)
    if (sinCosto.length) out.push({ id: `inv-sincosto-${sinCosto.length}`, modulo: 'inventario', nivel: 'falta', titulo: `${sinCosto.length} material(es) sin costo o sin mínimo`, detalle: `${lista(sinCosto.map((m) => m.nombre))}. Sin costo no se puede calcular el valor del pedido; sin mínimo no hay aviso de reposición.`, accion: { label: 'Completar', to: '/inventario' } })

    /* --------------------------------- Nómina --------------------------------- */
    if (!empleados.length && cuentas.filter((c) => c.activo).length > 1) out.push({ id: 'nom-vacia', modulo: 'nomina', nivel: 'falta', titulo: 'No hay empleados en la nómina', detalle: 'Hay funcionarios con cuenta en el sistema pero ninguno registrado en nómina (cédula, salario, EPS, pensión y ARL).', accion: { label: 'Agregar empleados', to: '/nomina' } })
    const incompletos = empleados.filter((e) => e.activo && (!e.cedula || !e.eps || !e.pension))
    if (incompletos.length) out.push({ id: `nom-incomp-${incompletos.length}`, modulo: 'nomina', nivel: 'falta', titulo: `${incompletos.length} empleado(s) con datos incompletos`, detalle: `${lista(incompletos.map((e) => e.nombre))}: falta cédula, EPS o fondo de pensión. Se necesitan para la planilla PILA.`, accion: { label: 'Completar', to: '/nomina' } })
    const bajoMin = empleados.filter((e) => e.activo && e.salario < parametros.smmlv)
    if (bajoMin.length) out.push({ id: `nom-bajomin-${bajoMin.length}`, modulo: 'nomina', nivel: 'problema', titulo: `${bajoMin.length} salario(s) por debajo del mínimo`, detalle: `${lista(bajoMin.map((e) => `${e.nombre} (${cop(e.salario)})`))}. El mínimo vigente es ${cop(parametros.smmlv)}.`, accion: { label: 'Corregir', to: '/nomina' } })
    const per = periodos[claveNomina(hoy.getFullYear(), hoy.getMonth() + 1)]
    if (empleados.length && hoy.getDate() >= 24 && (!per || per.estado === 'Borrador')) out.push({ id: `nom-mes-${hoy.getMonth()}`, modulo: 'nomina', nivel: 'problema', titulo: 'La nómina de este mes no está aprobada', detalle: 'Revisa novedades (horas extra, incapacidades) y apruébala antes del día de pago.', accion: { label: 'Ir a nómina', to: '/nomina' } })

    /* ------------------------------ Cuentas y roles ------------------------------ */
    const gerentes = cuentas.filter((c) => c.activo && roles.find((r) => r.id === c.rol)?.fijo)
    if (gerentes.length === 1 && cuentas.length > 1) out.push({ id: 'cta-ungerente', modulo: 'cuentas', nivel: 'consejo', titulo: 'Solo hay una cuenta con acceso total', detalle: `Si ${gerentes[0].nombre} olvida la contraseña, nadie más puede cambiarla ni crear cuentas. Considera una segunda cuenta de gerente de respaldo.`, accion: { label: 'Ver cuentas', to: '/cuentas' } })
    const inactivas = cuentas.filter((c) => c.activo && c.ultimoAcceso && ahora - c.ultimoAcceso > 60 * DIA)
    if (inactivas.length) out.push({ id: `cta-inact-${inactivas.length}`, modulo: 'cuentas', nivel: 'consejo', titulo: `${inactivas.length} cuenta(s) sin usarse hace más de 60 días`, detalle: `${lista(inactivas.map((c) => c.nombre))}. Si esa persona ya no trabaja aquí, desactiva la cuenta.`, accion: { label: 'Revisar', to: '/cuentas' } })
    const sinNomina = cuentas.filter((c) => c.activo && c.usuario !== 'admin' && !empleados.some((e) => e.nombre.trim().toLowerCase() === c.nombre.trim().toLowerCase()))
    if (sinNomina.length && empleados.length) out.push({ id: `cta-sinnom-${sinNomina.length}`, modulo: 'cuentas', nivel: 'consejo', titulo: `${sinNomina.length} funcionario(s) con cuenta pero sin estar en nómina`, detalle: `${lista(sinNomina.map((c) => c.nombre))}. Si trabajan en la empresa, regístralos en Nómina.`, accion: { label: 'Ir a nómina', to: '/nomina' } })

    /* ---------------------------- Medidores y pérdidas ---------------------------- */
    if (conf.modoSinMedidores) out.push({ id: 'lec-modo', modulo: 'lecturas', nivel: 'consejo', titulo: 'Modo sin medidores activo', detalle: 'Las lecturas no se usan para cobrar: todos pagan el valor fijo de su estrato. Cuando instalen medidores, márcalos en cada predio y apaga el modo.', accion: { label: 'Ver modo', to: '/configuracion' } })
    else {
      const sinLect = activos.filter((u) => u.conMedidor && !lecturas[u.id])
      if (sinLect.length) out.push({ id: `lec-sin-${periodoLectura.mes}-${sinLect.length}`, modulo: 'lecturas', nivel: 'falta', titulo: `${sinLect.length} medidor(es) sin lectura este periodo`, detalle: `${lista(sinLect.map((u) => u.nombre))}. Si no llega la lectura, se facturan por promedio.`, accion: { label: 'Ver medidores', to: '/lecturas' } })
    }
    if (usuarios.length && !hayMacromediciones()) out.push({ id: 'perd-sinmacro', modulo: 'perdidas', nivel: conf.modoSinMedidores ? 'consejo' : 'falta', titulo: 'Las pérdidas de agua son un estimado', detalle: conf.modoSinMedidores ? 'No hay agua producida registrada (macromedidor u horas de bombeo) y, sin medidores en las casas, tampoco se mide el consumo: el índice de agua no contabilizada todavía no es real.' : 'No hay agua producida registrada (macromedidor u horas de bombeo): el índice de pérdidas se está estimando.', accion: { label: 'Ver pérdidas', to: '/perdidas' } })

    return out.filter((h) => puede(h.modulo))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarios, pagos, resumen, lecturas, periodoLectura, pqrs, materiales, egresos, cierres, empleados, parametros, periodos, conf, cuentas, roles, zonas, solicitudes, respaldos, tarifaV])

  return useMemo(() => { const ahora = Date.now(); return todos.filter((h) => !p[h.id] || ahora - p[h.id] > SIETE_DIAS) }, [todos, p])
}

/** Texto para la IA: lista compacta de hallazgos. */
export const hallazgosComoTexto = (hs: Hallazgo[], n = 12) =>
  hs.slice(0, n).map((h) => `- [${h.nivel.toUpperCase()} · ${NOMBRE_MODULO[h.modulo] ?? h.modulo}] ${h.titulo}. ${h.detalle}`).join('\n')
