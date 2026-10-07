/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { COSTO_RECONEXION } from './constants'
import { facturaId, facturasDe, generacionPeriodo, lecturaMedidor, nombrePeriodo, periodoEnLectura, resumenUsuario, todasLasFacturas, type Resumen } from './billing'
import { crearDatosDemo } from './seed'
import { actualizarCuentaApi, getUsername } from '../utils/session'
import { api, ErrorApi, MODO_API, type CuentaApi } from './api'
import { useToast } from '../components/ui/Toast'
import { generarTelemetria, lecturaRemota, lecturasRemotas, enLinea, todasLasAlarmas, type AlarmaMedidor, type Telemetria } from './telemetria'
import { aplicarTarifa as guardarTarifa, quitarTarifa as borrarTarifa, reemplazarVigencias, type TarifaCRA } from './tarifa'
import { setMacromediciones } from './perdidas'
import { cargarConfigApi, medido, useConfig } from './config'
import { cargarCuentasApi } from './cuentas'
import { cargarZonasApi } from './zonas'
import type { Factura, Lectura, MetodoPago, Pago, Usuario, UsuarioForm } from './types'

export type DatosPago = { metodo: MetodoPago; recibido?: number; comprobante?: string; cajero?: string }

type DataCtx = {
  usuarios: Usuario[]
  pagos: Pago[]
  facturas: Factura[]
  resumen: (u: Usuario) => Resumen
  /** true = los datos vienen de la API (base de datos); false = demostración en el navegador. */
  modoApi: boolean
  /** Cargando los datos de la API por primera vez. */
  cargando: boolean
  /** Vuelve a leer todo de la API (no hace nada en demostración). */
  recargar: () => Promise<void>
  /** Devuelve un mensaje de error o null si se creó. */
  crearUsuario: (f: UsuarioForm) => Promise<string | null>
  editarUsuario: (id: string, f: Omit<UsuarioForm, 'id'>) => Promise<void>
  cortar: (id: string) => void
  reactivar: (id: string, pago: DatosPago) => Promise<Pago | null>
  pagarFactura: (facturaId: string, pago: DatosPago) => Promise<Pago | null>
  /** Varias facturas (p. ej. todos los predios de un mismo propietario) en un solo recibo. */
  pagarFacturas: (facturaIds: string[], pago: DatosPago) => Promise<Pago | null>
  periodoLectura: { mes: number; anio: number }
  /** Fecha en que el periodo se cierra y factura solo (14 días antes del vencimiento). */
  cierrePeriodo: Date
  lecturas: Record<string, Lectura>
  registrarLectura: (usuarioId: string, l: Lectura) => void
  borrarLectura: (usuarioId: string) => void
  facturarPeriodo: () => Promise<{ leidos: number; estimados: number; suspendidos: number }>
  /** Medidores inteligentes: estado de comunicación, señal y perfil horario. */
  medidores: Record<string, Telemetria>
  alarmas: AlarmaMedidor[]
  /** Consulta la pasarela y trae las lecturas nuevas. Devuelve cuántas llegaron. */
  sincronizar: () => Promise<number>
  /** Aplica una tarifa CRA desde un periodo (no retroactiva) y recalcula todo. */
  aplicarTarifa: (t: TarifaCRA) => void
  quitarTarifa: (t: TarifaCRA) => void
}

const Ctx = createContext<DataCtx | null>(null)

const VACIO = { usuarios: [] as Usuario[], pagos: [] as Pago[] }

type Vista = { usuarios: Usuario[]; pagos: Pago[]; lecturas: Record<string, Lectura>; telemetria: Record<string, Pick<Telemetria, 'ultimaComunicacion' | 'senal' | 'eventos'>> }
async function leerVista(): Promise<Vista> {
  const [usuarios, pagos, lecturas, tarifas, macro, telemetria] = await Promise.all([
    api<Usuario[]>('/vista/suscriptores'),
    api<Pago[]>('/vista/pagos'),
    api<Record<string, Lectura>>('/vista/lecturas'),
    api<TarifaCRA[]>('/vista/tarifas'),
    api<{ anio: number; mes: number; sector: string; volumen: number }[]>('/vista/macromediciones'),
    api<Vista['telemetria']>('/vista/telemetria'),
    cargarConfigApi(),
    cargarCuentasApi(),
    cargarZonasApi(),
    api<CuentaApi>('/auth/yo').then(actualizarCuentaApi),
  ])
  // Tarifas y agua producida antes que los suscriptores: así los cálculos salen con los datos reales
  reemplazarVigencias(tarifas)
  setMacromediciones(macro)
  return { usuarios, pagos, lecturas, telemetria }
}

const METODO_API: Record<MetodoPago, string> = { Efectivo: 'Efectivo', Transferencia: 'Transferencia', 'En línea': 'En línea' }

export function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [inicial] = useState(() => (MODO_API ? VACIO : crearDatosDemo()))
  const [usuarios, setUsuarios] = useState<Usuario[]>(inicial.usuarios)
  const [pagos, setPagos] = useState<Pago[]>(inicial.pagos)
  const [cargando, setCargando] = useState(MODO_API)
  const [consecutivo, setConsecutivo] = useState(inicial.pagos.length + 1)
  const [medidores, setMedidores] = useState(() => generarTelemetria(inicial.usuarios))
  const [lecturas, setLecturas] = useState<Record<string, Lectura>>(() => lecturasRemotas(inicial.usuarios, medidores))

  const recargar = useCallback(async () => {
    if (!MODO_API) return
    try {
      const v = await leerVista()
      setUsuarios(v.usuarios)
      setPagos(v.pagos)
      setLecturas(v.lecturas)
      // Comunicación, señal y eventos vienen de la base de datos; el perfil por horas se estima mientras los equipos no lo reporten
      setMedidores((m) => {
        const base = Object.keys(m).length === v.usuarios.length ? m : generarTelemetria(v.usuarios)
        return Object.fromEntries(Object.entries(base).map(([id, t]) => [id, v.telemetria[id] ? { ...t, ...v.telemetria[id] } : t]))
      })
    } catch (e) {
      toast('No se pudieron leer los datos', e instanceof Error ? e.message : String(e), 'warning')
    } finally {
      setCargando(false)
    }
  }, [toast])

  // Con la API: carga inicial y se refresca cada minuto (pagos de otras cajas, cierre automático del servidor)
  useEffect(() => {
    if (!MODO_API) return
    const t = setTimeout(recargar, 0)
    const i = setInterval(recargar, 60_000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [recargar])

  /** Ejecuta una operación en la API y recarga; si falla, avisa y recarga para deshacer el cambio optimista. */
  const enApi = useCallback(async (titulo: string, fn: () => Promise<unknown>) => {
    try { await fn() } catch (e) { toast(titulo, e instanceof Error ? e.message : String(e), 'warning') }
    await recargar()
  }, [toast, recargar])
  // Solo los predios con medidor instalado pueden tener alarmas de medidor (en modo sin medidores, ninguno)
  const conf = useConfig()
  const alarmas = useMemo(() => todasLasAlarmas(usuarios.filter((u) => medido(u, conf)), medidores, lecturas), [usuarios, medidores, lecturas, conf])
  const periodoLectura = useMemo(() => periodoEnLectura(usuarios), [usuarios])
  const cierrePeriodo = useMemo(() => generacionPeriodo(periodoLectura.mes, periodoLectura.anio), [periodoLectura])

  const facturas = useMemo(() => todasLasFacturas(usuarios), [usuarios])
  const resumenes = useMemo(() => new Map(usuarios.map((u) => [u.id, resumenUsuario(u)])), [usuarios])
  const resumen = useCallback((u: Usuario) => resumenes.get(u.id) ?? resumenUsuario(u), [resumenes])

  const nuevoPago = useCallback(
    (base: Omit<Pago, 'id' | 'timestamp' | 'vueltos'>): Pago => {
      const pago: Pago = {
        ...base,
        id: `PAG-${String(consecutivo).padStart(5, '0')}`,
        vueltos: base.recibido !== undefined ? base.recibido - base.monto : undefined,
        cajero: base.cajero ?? (base.metodo === 'En línea' ? 'Portal web' : getUsername()),
        timestamp: Date.now(),
      }
      setConsecutivo((n) => n + 1)
      setPagos((prev) => [pago, ...prev])
      return pago
    },
    [consecutivo],
  )

  const crearUsuario = useCallback(
    async (f: UsuarioForm) => {
      if (usuarios.some((u) => u.id === f.id)) return `Ya existe un usuario con el ID ${f.id}`
      if (MODO_API) {
        try { await api('/vista/suscriptores', { metodo: 'POST', cuerpo: f }) } catch (e) { return e instanceof Error ? e.message : String(e) }
        await recargar()
        return null
      }
      setUsuarios((prev) => [{ ...f, estado: 'Activo', historial: [] }, ...prev])
      return null
    },
    [usuarios, recargar],
  )

  const editarUsuario = useCallback(async (id: string, f: Omit<UsuarioForm, 'id'>) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...f } : u)))
    if (MODO_API) await enApi('No se guardó el predio', () => api(`/vista/suscriptores/${id}`, { metodo: 'PUT', cuerpo: { id, ...f } }))
  }, [enApi])

  const cortar = useCallback((id: string) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, estado: 'Cortado' } : u)))
    if (MODO_API) void enApi('No se cortó el servicio', () => api(`/vista/suscriptores/${id}/cortar`, { metodo: 'POST' }))
  }, [enApi])

  /** Cobro en la API: devuelve el recibo con su número y código del servidor. Si falla, avisa y devuelve null. */
  const cobrarApi = useCallback(async (facturas: string[], datos: DatosPago, reconectar?: string) => {
    try {
      const p = await api<Pago>('/vista/cobrar', { metodo: 'POST', cuerpo: { facturas, metodo: METODO_API[datos.metodo], recibido: datos.recibido, comprobante: datos.comprobante, reconectar: !!reconectar, predio: reconectar } })
      await recargar()
      return p
    } catch (e) {
      toast('No se registró el pago', e instanceof ErrorApi || e instanceof Error ? e.message : String(e), 'warning')
      await recargar()
      return null
    }
  }, [recargar, toast])

  const pagarFactura = useCallback(
    async (fid: string, datos: DatosPago) => {
      const u = usuarios.find((x) => facturasDe(x).some((f) => f.id === fid))
      const f = u && facturasDe(u).find((x) => x.id === fid)
      if (!u || !f || f.estado === 'Pagada') return null
      if (MODO_API) return cobrarApi([fid], datos)
      const ts = Date.now()
      setUsuarios((prev) =>
        prev.map((x) =>
          x.id !== u.id ? x : { ...x, historial: x.historial.map((p) => (facturaId(x.id, p.mes, p.anio) === fid ? { ...p, estado: 'Pagada', fechaPago: ts } : p)) },
        ),
      )
      return nuevoPago({ clienteId: u.id, cliente: u.nombre, facturaIds: [fid], concepto: `Factura ${f.periodo}`, monto: f.monto, ...datos })
    },
    [usuarios, nuevoPago, cobrarApi],
  )

  const pagarFacturas = useCallback(
    async (ids: string[], datos: DatosPago) => {
      const set = new Set(ids)
      const cobradas = usuarios.flatMap((u) => facturasDe(u).filter((f) => set.has(f.id) && f.estado === 'Pendiente').map((f) => ({ u, f })))
      if (!cobradas.length) return null
      if (MODO_API) return cobrarApi(cobradas.map((c) => c.f.id), datos)
      const ts = Date.now()
      setUsuarios((prev) => prev.map((x) => (!cobradas.some((c) => c.u.id === x.id) ? x : { ...x, historial: x.historial.map((p) => (set.has(facturaId(x.id, p.mes, p.anio)) ? { ...p, estado: 'Pagada', fechaPago: ts } : p)) })))
      const predios = [...new Set(cobradas.map((c) => c.u.id))]
      const primero = cobradas[0].u
      return nuevoPago({
        clienteId: primero.id,
        cliente: primero.nombre,
        facturaIds: cobradas.map((c) => c.f.id),
        concepto: predios.length > 1 ? `${cobradas.length} facturas de ${predios.length} predios (${predios.join(', ')})` : `Facturas ${cobradas.map((c) => c.f.periodo).join(', ')}`,
        monto: cobradas.reduce((s, c) => s + c.f.monto, 0),
        ...datos,
      })
    },
    [usuarios, nuevoPago, cobrarApi],
  )

  const reactivar = useCallback(
    async (id: string, datos: DatosPago) => {
      const u = usuarios.find((x) => x.id === id)!
      const pend = facturasDe(u).filter((f) => f.estado === 'Pendiente')
      if (MODO_API) return cobrarApi(pend.map((f) => f.id), datos, id)
      const deuda = pend.reduce((s, f) => s + f.monto, 0)
      const ts = Date.now()
      setUsuarios((prev) =>
        prev.map((x) => (x.id !== id ? x : { ...x, estado: 'Activo', historial: x.historial.map((p) => (p.estado === 'Pendiente' ? { ...p, estado: 'Pagada', fechaPago: ts } : p)) })),
      )
      const periodos = pend.map((f) => nombrePeriodo(f.mes, f.anio)).join(', ')
      return nuevoPago({
        clienteId: u.id,
        cliente: u.nombre,
        facturaIds: pend.map((f) => f.id),
        concepto: pend.length ? `Reconexión + facturas (${periodos})` : 'Reconexión del servicio',
        monto: deuda + COSTO_RECONEXION,
        ...datos,
      })
    },
    [usuarios, nuevoPago, cobrarApi],
  )

  const registrarLectura = useCallback((id: string, l: Lectura) => {
    setLecturas((prev) => ({ ...prev, [id]: l }))
    if (MODO_API) void enApi('No se guardó la lectura', () => api('/vista/lecturas', { metodo: 'POST', cuerpo: { predio: id, valor: l.valor, nota: l.nota, foto: l.foto } }))
  }, [enApi])
  const borrarLectura = useCallback((id: string) => {
    setLecturas((prev) => { const n = { ...prev }; delete n[id]; return n })
    if (MODO_API) void enApi('No se quitó la lectura', () => api(`/vista/lecturas/${id}`, { metodo: 'DELETE' }))
  }, [enApi])

  /** Cierra la toma de lecturas y genera las facturas del periodo. Sin lectura => se factura por promedio. */
  const facturarPeriodo = useCallback(async () => {
    if (MODO_API) {
      const r = await api<{ leidos: number; estimados: number; suspendidos: number }>('/vista/facturar', { metodo: 'POST' })
      await recargar()
      return r
    }
    const { mes, anio } = periodoLectura
    let leidos = 0, estimados = 0, suspendidos = 0
    const nuevos: Usuario[] = usuarios.map((u) => {
      if (u.historial.some((h) => h.mes === mes && h.anio === anio)) return u
      if (!medido(u, conf) && u.estado !== 'Cortado') { return { ...u, historial: [...u.historial, { mes, anio, consumo: 0, estado: 'Pendiente', fija: true }] } }
      if (u.estado === 'Cortado') { suspendidos++; return { ...u, historial: [...u.historial, { mes, anio, consumo: 0, estado: 'Suspendido' }] } }
      const l = lecturas[u.id]
      if (l) { leidos++; return { ...u, historial: [...u.historial, { mes, anio, consumo: Math.max(0, l.valor - lecturaMedidor(u)), estado: 'Pendiente' }] } }
      estimados++
      return { ...u, historial: [...u.historial, { mes, anio, consumo: Math.round(resumenUsuario(u).consumoPromedio), estado: 'Pendiente', estimado: true }] }
    })
    setUsuarios(nuevos)
    // Los medidores siguen reportando: el periodo nuevo arranca con sus lecturas automáticas.
    setLecturas(lecturasRemotas(nuevos, medidores))
    return { leidos, estimados, suspendidos }
  }, [usuarios, periodoLectura, lecturas, medidores, recargar, conf])

  const sincronizar = useCallback(async () => {
    if (MODO_API) {
      const antes = Object.keys(lecturas).length
      const nuevas = await api<Record<string, Lectura>>('/vista/lecturas').catch(() => lecturas)
      setLecturas(nuevas)
      return Math.max(0, Object.keys(nuevas).length - antes)
    }
    const ahora = Date.now()
    const m = { ...medidores }
    for (const [id, t] of Object.entries(m)) if (enLinea(t, ahora)) m[id] = { ...t, ultimaComunicacion: ahora - (id.charCodeAt(id.length - 1) % 5) * 60_000 }
    let nuevas = 0
    const l = { ...lecturas }
    for (const u of usuarios) {
      const t = m[u.id]
      if (!medido(u, conf) || u.estado !== 'Activo' || !enLinea(t, ahora) || l[u.id]?.origen === 'manual') continue
      if (!l[u.id]) nuevas++
      l[u.id] = lecturaRemota(u, t, ahora)
    }
    setMedidores(m)
    setLecturas(l)
    return nuevas
  }, [medidores, lecturas, usuarios, conf])

  // Cierre automático mensual: cuando llega la fecha de generación de la factura, el periodo se factura solo.
  // Con la API el cierre lo hace el servidor todos los días a las 12:10 a. m. (aquí solo se refresca).
  useEffect(() => {
    if (MODO_API) return
    const revisar = () => { if (Date.now() >= cierrePeriodo.getTime()) void facturarPeriodo() }
    const t = setTimeout(revisar, 0)
    const i = setInterval(revisar, 60_000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [cierrePeriodo, facturarPeriodo])

  // Cambiar la tarifa cambia los montos: se crea un arreglo nuevo para que todo se recalcule.
  const aplicarTarifa = useCallback((t: TarifaCRA) => {
    guardarTarifa(t); setUsuarios((u) => [...u])
    if (MODO_API) void enApi('No se guardó la tarifa', () => api('/vista/tarifas', { metodo: 'POST', cuerpo: t }))
  }, [enApi])
  const quitarTarifa = useCallback((t: TarifaCRA) => {
    borrarTarifa(t); setUsuarios((u) => [...u])
    if (MODO_API) void enApi('No se quitó la tarifa', () => api(`/vista/tarifas/${t.desde.anio}/${t.desde.mes}`, { metodo: 'DELETE' }))
  }, [enApi])

  const value = useMemo(
    () => ({ modoApi: MODO_API, cargando, recargar, usuarios, pagos, facturas, resumen, crearUsuario, editarUsuario, cortar, reactivar, pagarFactura, pagarFacturas, periodoLectura, cierrePeriodo, lecturas, registrarLectura, borrarLectura, facturarPeriodo, medidores, alarmas, sincronizar, aplicarTarifa, quitarTarifa }),
    [cargando, recargar, usuarios, pagos, facturas, resumen, crearUsuario, editarUsuario, cortar, reactivar, pagarFactura, pagarFacturas, periodoLectura, cierrePeriodo, lecturas, registrarLectura, borrarLectura, facturarPeriodo, medidores, alarmas, sincronizar, aplicarTarifa, quitarTarifa],
  )
  // Con la API se espera la primera carga: las demás partes del sistema arrancan con los datos reales
  if (cargando) return <CargandoDatos />
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function CargandoDatos() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F4F5F3] text-gray-500">
      <img src="/logo_circulo.png" alt="" className="h-14 w-14 animate-pulse" />
      <p className="text-sm">Cargando los datos de la empresa…</p>
    </div>
  )
}

export function useData() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useData debe usarse dentro de <DataProvider>')
  return c
}
