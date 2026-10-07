/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { EMPLEADOS_DEMO, NOVEDAD_VACIA, PARAMETROS_2026, novedadesDemo, type Empleado, type Novedad, type Parametros } from './nomina'
import { getUsername, puede } from '../utils/session'
import { api, mensajeError, MODO_API } from './api'
import { useToast } from '../components/ui/Toast'

export type EstadoNomina = 'Borrador' | 'Aprobada' | 'Pagada'
export type Evento = { ts: number; usuario: string; accion: string }
export type PeriodoNomina = { clave: string; anio: number; mes: number; estado: EstadoNomina; novedades: Record<string, Novedad>; log: Evento[] }

export const claveNomina = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, '0')}`

type Ctx = {
  parametros: Parametros
  setParametros: (p: Parametros) => void
  empleados: Empleado[]
  guardarEmpleado: (e: Empleado) => void
  periodos: Record<string, PeriodoNomina>
  obtenerPeriodo: (anio: number, mes: number) => PeriodoNomina
  setNovedad: (clave: string, empleadoId: string, n: Novedad) => void
  cambiarEstado: (clave: string, estado: EstadoNomina, detalle?: string) => void
}

const C = createContext<Ctx | null>(null)

function semilla(): Record<string, PeriodoNomina> {
  const hoy = new Date()
  const out: Record<string, PeriodoNomina> = {}
  for (let i = 8; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const anio = d.getFullYear()
    const mes = d.getMonth() + 1
    const k = claveNomina(anio, mes)
    const activos = EMPLEADOS_DEMO.filter((e) => new Date(e.fechaIngreso) <= new Date(anio, mes, 0))
    const fin = new Date(anio, mes, 0)
    out[k] = {
      clave: k,
      anio,
      mes,
      estado: i === 0 ? 'Borrador' : 'Pagada',
      novedades: i === 0 ? { ...novedadesDemo(activos, mes), E05: { ...novedadesDemo(activos, mes).E05, dias: 25 } } : novedadesDemo(activos, mes),
      log: i === 0
        ? [{ ts: hoy.getTime() - 3_600_000, usuario: 'sistema', accion: 'Nómina creada con las novedades del mes' }]
        : [
            { ts: new Date(anio, mes - 1, 26, 10).getTime(), usuario: 'admin', accion: 'Nómina aprobada' },
            { ts: new Date(anio, mes - 1, fin.getDate(), 15).getTime(), usuario: 'admin', accion: 'Nómina marcada como pagada' },
          ],
    }
  }
  return out
}

type DatosNomina = { parametros: Parametros | null; empleados: Empleado[]; periodos: Record<string, PeriodoNomina> }

export function NominaProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [parametros, setParametrosLocal] = useState<Parametros>(PARAMETROS_2026)
  const [empleados, setEmpleados] = useState<Empleado[]>(MODO_API ? [] : EMPLEADOS_DEMO)
  const [periodos, setPeriodos] = useState<Record<string, PeriodoNomina>>(() => (MODO_API ? {} : semilla()))

  // Con la API: solo quien tiene el módulo de nómina la lee (los demás solo necesitan la lista vacía)
  const recargar = useCallback(async () => {
    if (!MODO_API) return
    if (!puede('nomina')) {
      // Sin el módulo de nómina solo se necesita el directorio de empleados (responsables, certificados)
      try { setEmpleados(await api<Empleado[]>('/vista/nomina/directorio')) } catch { /* sin directorio */ }
      return
    }
    try {
      const d = await api<DatosNomina>('/vista/nomina')
      if (d.parametros) setParametrosLocal(d.parametros)
      setEmpleados(d.empleados)
      setPeriodos(d.periodos)
    } catch (e) { toast('No se pudo leer la nómina', mensajeError(e), 'warning') }
  }, [toast])
  useEffect(() => {
    if (!MODO_API) return
    const t = setTimeout(recargar, 0)
    return () => clearTimeout(t)
  }, [recargar])
  const enApi = useCallback(async (titulo: string, fn: () => Promise<unknown>) => {
    try { await fn() } catch (e) { toast(titulo, mensajeError(e), 'warning') }
    await recargar()
  }, [toast, recargar])

  const setParametros = useCallback((p: Parametros) => {
    setParametrosLocal(p)
    if (MODO_API) void enApi('No se guardaron los parámetros', () => api('/vista/nomina/parametros', { metodo: 'PUT', cuerpo: p }))
  }, [enApi])

  /** Periodo guardado o, si no existe, uno nuevo en borrador con los empleados activos. */
  const asegurar = (prev: Record<string, PeriodoNomina>, clave: string): PeriodoNomina => {
    if (prev[clave]) return prev[clave]
    const [anio, mes] = clave.split('-').map(Number)
    const novedades: Record<string, Novedad> = {}
    empleados.filter((e) => e.activo).forEach((e) => (novedades[e.id] = { ...NOVEDAD_VACIA }))
    return { clave, anio, mes, estado: 'Borrador', novedades, log: [] }
  }

  const obtenerPeriodo = useCallback(
    (anio: number, mes: number) => asegurar(periodos, claveNomina(anio, mes)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodos, empleados],
  )

  const setNovedad = useCallback(
    (clave: string, empleadoId: string, n: Novedad) => {
      setPeriodos((prev) => {
        const p = asegurar(prev, clave)
        if (p.estado !== 'Borrador') return prev
        const emp = empleados.find((e) => e.id === empleadoId)
        return {
          ...prev,
          [clave]: { ...p, novedades: { ...p.novedades, [empleadoId]: n }, log: [...p.log, { ts: Date.now(), usuario: getUsername(), accion: `Novedades editadas: ${emp?.nombre ?? empleadoId}` }] },
        }
      })
      if (MODO_API) void enApi('No se guardaron las novedades', () => api(`/vista/nomina/${clave}/novedades/${empleadoId}`, { metodo: 'PUT', cuerpo: n }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empleados, enApi],
  )

  const cambiarEstado = useCallback(
    (clave: string, estado: EstadoNomina, detalle?: string) => {
      setPeriodos((prev) => {
        const p = asegurar(prev, clave)
        const accion = detalle ?? (estado === 'Aprobada' ? 'Nómina aprobada' : estado === 'Pagada' ? 'Nómina marcada como pagada' : 'Nómina devuelta a borrador')
        return { ...prev, [clave]: { ...p, estado, log: [...p.log, { ts: Date.now(), usuario: getUsername(), accion }] } }
      })
      if (MODO_API) void enApi('No se cambió el estado de la nómina', () => api(`/vista/nomina/${clave}/estado`, { metodo: 'POST', cuerpo: { estado, detalle } }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empleados, enApi],
  )

  const guardarEmpleado = useCallback((e: Empleado) => {
    setEmpleados((prev) => (prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e]))
    // Si es nuevo, entra a la nómina en borrador del mes actual
    setPeriodos((prev) => {
      const hoy = new Date()
      const k = claveNomina(hoy.getFullYear(), hoy.getMonth() + 1)
      const p = prev[k]
      if (!p || p.estado !== 'Borrador' || p.novedades[e.id] || !e.activo) return prev
      return { ...prev, [k]: { ...p, novedades: { ...p.novedades, [e.id]: { ...NOVEDAD_VACIA } } } }
    })
    if (MODO_API) void enApi('No se guardó el empleado', () => api(`/vista/nomina/empleados/${encodeURIComponent(e.id)}`, { metodo: 'PUT', cuerpo: e }))
  }, [enApi])

  const value = useMemo(
    () => ({ parametros, setParametros, empleados, guardarEmpleado, periodos, obtenerPeriodo, setNovedad, cambiarEstado }),
    [parametros, setParametros, empleados, guardarEmpleado, periodos, obtenerPeriodo, setNovedad, cambiarEstado],
  )
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useNomina() {
  const c = useContext(C)
  if (!c) throw new Error('useNomina debe usarse dentro de <NominaProvider>')
  return c
}
