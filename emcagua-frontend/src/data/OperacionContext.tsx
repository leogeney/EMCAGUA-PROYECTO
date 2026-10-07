/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { egresosDemo, MATERIALES_DEMO, type CierreCaja, type Egreso, type Material, type Movimiento } from './operacion'
import { getUsername } from '../utils/session'
import { api, mensajeError, MODO_API } from './api'
import { useToast } from '../components/ui/Toast'

type Ctx = {
  materiales: Material[]
  movimientos: Movimiento[]
  moverStock: (materialId: string, tipo: Movimiento['tipo'], cantidad: number, motivo: string) => void
  guardarMaterial: (m: Material) => void
  egresos: Egreso[]
  registrarEgreso: (e: Omit<Egreso, 'id' | 'usuario' | 'ts'>) => void
  cierres: CierreCaja[]
  cerrarCaja: (c: Omit<CierreCaja, 'ts' | 'cajero'>) => void
}

const C = createContext<Ctx | null>(null)

type DatosOperacion = { materiales: Material[]; movimientos: Movimiento[]; egresos: Egreso[]; cierres: CierreCaja[] }

/** Inventario, gastos y cierres de caja: en la base de datos con la API, o en memoria en la demostración. */
export function OperacionProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [materiales, setMateriales] = useState<Material[]>(MODO_API ? [] : MATERIALES_DEMO)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [egresos, setEgresos] = useState<Egreso[]>(() => (MODO_API ? [] : egresosDemo()))
  const [cierres, setCierres] = useState<CierreCaja[]>([])

  const recargar = useCallback(async () => {
    if (!MODO_API) return
    try {
      const d = await api<DatosOperacion>('/vista/operacion')
      setMateriales(d.materiales); setMovimientos(d.movimientos); setEgresos(d.egresos); setCierres(d.cierres)
    } catch (e) { toast('No se pudieron leer inventario y caja', mensajeError(e), 'warning') }
  }, [toast])
  useEffect(() => {
    if (!MODO_API) return
    const t = setTimeout(recargar, 0)
    const i = setInterval(recargar, 120_000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [recargar])
  const enApi = useCallback(async (titulo: string, fn: () => Promise<unknown>) => {
    try { await fn() } catch (e) { toast(titulo, mensajeError(e), 'warning') }
    await recargar()
  }, [toast, recargar])

  const moverStock = useCallback((materialId: string, tipo: Movimiento['tipo'], cantidad: number, motivo: string) => {
    setMateriales((prev) => prev.map((m) => (m.id !== materialId ? m : { ...m, stock: tipo === 'Ajuste' ? cantidad : Math.max(0, m.stock + (tipo === 'Entrada' ? cantidad : -cantidad)) })))
    setMovimientos((prev) => [{ id: `MV-${prev.length + 1}`, ts: Date.now(), materialId, tipo, cantidad, motivo, usuario: getUsername() }, ...prev])
    if (MODO_API) void enApi('No se registró el movimiento', () => api('/vista/movimientos', { metodo: 'POST', cuerpo: { materialId, tipo, cantidad, motivo } }))
  }, [enApi])
  const guardarMaterial = useCallback((m: Material) => {
    setMateriales((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]))
    if (MODO_API) void enApi('No se guardó el material', () => api(`/vista/materiales/${encodeURIComponent(m.id)}`, { metodo: 'PUT', cuerpo: m }))
  }, [enApi])
  const registrarEgreso = useCallback((e: Omit<Egreso, 'id' | 'usuario' | 'ts'>) => {
    setEgresos((prev) => [{ ...e, id: `EG-${Date.now()}`, usuario: getUsername(), ts: Date.now() }, ...prev])
    if (MODO_API) void enApi('No se registró el gasto', () => api('/vista/egresos', { metodo: 'POST', cuerpo: e }))
  }, [enApi])
  const cerrarCaja = useCallback((c: Omit<CierreCaja, 'ts' | 'cajero'>) => {
    setCierres((prev) => [{ ...c, cajero: getUsername(), ts: Date.now() }, ...prev.filter((x) => x.fecha !== c.fecha)])
    // El servidor vuelve a calcular lo esperado con sus propios datos; solo recibe lo contado
    if (MODO_API) void enApi('No se cerró la caja', () => api('/vista/cierres', { metodo: 'POST', cuerpo: { fecha: c.fecha, efectivoContado: c.efectivoContado, nota: c.nota } }))
  }, [enApi])

  const value = useMemo(
    () => ({ materiales, movimientos, moverStock, guardarMaterial, egresos, registrarEgreso, cierres, cerrarCaja }),
    [materiales, movimientos, moverStock, guardarMaterial, egresos, registrarEgreso, cierres, cerrarCaja],
  )
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useOperacion() {
  const c = useContext(C)
  if (!c) throw new Error('useOperacion debe usarse dentro de <OperacionProvider>')
  return c
}
