/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { COSTO_RECONEXION } from './constants'
import { facturaId, facturasDe, nombrePeriodo, resumenUsuario, todasLasFacturas, type Resumen } from './billing'
import { crearDatosDemo } from './seed'
import type { Factura, MetodoPago, Pago, Usuario, UsuarioForm } from './types'

export type DatosPago = { metodo: MetodoPago; recibido?: number; comprobante?: string }

type DataCtx = {
  usuarios: Usuario[]
  pagos: Pago[]
  facturas: Factura[]
  resumen: (u: Usuario) => Resumen
  crearUsuario: (f: UsuarioForm) => string | null
  editarUsuario: (id: string, f: Omit<UsuarioForm, 'id'>) => void
  cortar: (id: string) => void
  reactivar: (id: string, pago: DatosPago) => Pago
  pagarFactura: (facturaId: string, pago: DatosPago) => Pago | null
}

const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [inicial] = useState(() => crearDatosDemo())
  const [usuarios, setUsuarios] = useState<Usuario[]>(inicial.usuarios)
  const [pagos, setPagos] = useState<Pago[]>(inicial.pagos)
  const [consecutivo, setConsecutivo] = useState(inicial.pagos.length + 1)

  const facturas = useMemo(() => todasLasFacturas(usuarios), [usuarios])
  const resumenes = useMemo(() => new Map(usuarios.map((u) => [u.id, resumenUsuario(u)])), [usuarios])
  const resumen = useCallback((u: Usuario) => resumenes.get(u.id) ?? resumenUsuario(u), [resumenes])

  const nuevoPago = useCallback(
    (base: Omit<Pago, 'id' | 'timestamp' | 'vueltos'>): Pago => {
      const pago: Pago = {
        ...base,
        id: `PAG-${String(consecutivo).padStart(5, '0')}`,
        vueltos: base.recibido !== undefined ? base.recibido - base.monto : undefined,
        timestamp: Date.now(),
      }
      setConsecutivo((n) => n + 1)
      setPagos((prev) => [pago, ...prev])
      return pago
    },
    [consecutivo],
  )

  const crearUsuario = useCallback(
    (f: UsuarioForm) => {
      if (usuarios.some((u) => u.id === f.id)) return `Ya existe un usuario con el ID ${f.id}`
      setUsuarios((prev) => [{ ...f, estado: 'Activo', historial: [] }, ...prev])
      return null
    },
    [usuarios],
  )

  const editarUsuario = useCallback((id: string, f: Omit<UsuarioForm, 'id'>) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...f } : u)))
  }, [])

  const cortar = useCallback((id: string) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, estado: 'Cortado' } : u)))
  }, [])

  const pagarFactura = useCallback(
    (fid: string, datos: DatosPago) => {
      const u = usuarios.find((x) => facturasDe(x).some((f) => f.id === fid))
      const f = u && facturasDe(u).find((x) => x.id === fid)
      if (!u || !f || f.estado === 'Pagada') return null
      const ts = Date.now()
      setUsuarios((prev) =>
        prev.map((x) =>
          x.id !== u.id ? x : { ...x, historial: x.historial.map((p) => (facturaId(x.id, p.mes, p.anio) === fid ? { ...p, estado: 'Pagada', fechaPago: ts } : p)) },
        ),
      )
      return nuevoPago({ clienteId: u.id, cliente: u.nombre, facturaIds: [fid], concepto: `Factura ${f.periodo}`, monto: f.monto, ...datos })
    },
    [usuarios, nuevoPago],
  )

  const reactivar = useCallback(
    (id: string, datos: DatosPago) => {
      const u = usuarios.find((x) => x.id === id)!
      const pend = facturasDe(u).filter((f) => f.estado === 'Pendiente')
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
    [usuarios, nuevoPago],
  )

  const value = useMemo(
    () => ({ usuarios, pagos, facturas, resumen, crearUsuario, editarUsuario, cortar, reactivar, pagarFactura }),
    [usuarios, pagos, facturas, resumen, crearUsuario, editarUsuario, cortar, reactivar, pagarFactura],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useData debe usarse dentro de <DataProvider>')
  return c
}
