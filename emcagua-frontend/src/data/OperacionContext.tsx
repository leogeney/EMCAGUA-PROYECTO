/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { egresosDemo, MATERIALES_DEMO, type CierreCaja, type Egreso, type Material, type Movimiento } from './operacion'
import { getUsername } from '../utils/session'

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

/** Inventario y caja (en memoria hasta que exista el backend). */
export function OperacionProvider({ children }: { children: ReactNode }) {
  const [materiales, setMateriales] = useState<Material[]>(MATERIALES_DEMO)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [egresos, setEgresos] = useState<Egreso[]>(() => egresosDemo())
  const [cierres, setCierres] = useState<CierreCaja[]>([])

  const moverStock = useCallback((materialId: string, tipo: Movimiento['tipo'], cantidad: number, motivo: string) => {
    setMateriales((prev) => prev.map((m) => (m.id !== materialId ? m : { ...m, stock: tipo === 'Ajuste' ? cantidad : Math.max(0, m.stock + (tipo === 'Entrada' ? cantidad : -cantidad)) })))
    setMovimientos((prev) => [{ id: `MV-${prev.length + 1}`, ts: Date.now(), materialId, tipo, cantidad, motivo, usuario: getUsername() }, ...prev])
  }, [])
  const guardarMaterial = useCallback((m: Material) => setMateriales((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m])), [])
  const registrarEgreso = useCallback((e: Omit<Egreso, 'id' | 'usuario' | 'ts'>) => setEgresos((prev) => [{ ...e, id: `EG-${Date.now()}`, usuario: getUsername(), ts: Date.now() }, ...prev]), [])
  const cerrarCaja = useCallback((c: Omit<CierreCaja, 'ts' | 'cajero'>) => setCierres((prev) => [{ ...c, cajero: getUsername(), ts: Date.now() }, ...prev.filter((x) => x.fecha !== c.fecha)]), [])

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
