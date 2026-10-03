/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Borrador, Formato } from './documentos'
import { getUsername } from '../utils/session'

export type Emitido = {
  consecutivo: string
  plantillaId: string
  nombre: string
  dirigidoA: string
  formato: Formato
  borrador: Borrador
  ts: number
  usuario: string
}

type Ctx = {
  emitidos: Emitido[]
  siguiente: (prefijo: string) => string
  emitir: (e: Omit<Emitido, 'consecutivo' | 'ts' | 'usuario'>, prefijo: string) => Emitido
}

const C = createContext<Ctx | null>(null)

/** Consecutivo por tipo y año: EMC-PS-2026-001 */
const consecutivo = (lista: Emitido[], prefijo: string, anio: number) => {
  const base = `EMC-${prefijo}-${anio}-`
  return `${base}${String(lista.filter((d) => d.consecutivo.startsWith(base)).length + 1).padStart(3, '0')}`
}

export function DocumentosProvider({ children }: { children: ReactNode }) {
  const [emitidos, setEmitidos] = useState<Emitido[]>([])
  const siguiente = useCallback((prefijo: string) => consecutivo(emitidos, prefijo, new Date().getFullYear()), [emitidos])
  const emitir = useCallback(
    (e: Omit<Emitido, 'consecutivo' | 'ts' | 'usuario'>, prefijo: string) => {
      const doc: Emitido = { ...e, consecutivo: consecutivo(emitidos, prefijo, new Date().getFullYear()), ts: Date.now(), usuario: getUsername() }
      setEmitidos((prev) => [doc, ...prev])
      return doc
    },
    [emitidos],
  )
  const value = useMemo(() => ({ emitidos, siguiente, emitir }), [emitidos, siguiente, emitir])
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useDocumentos() {
  const c = useContext(C)
  if (!c) throw new Error('useDocumentos debe usarse dentro de <DocumentosProvider>')
  return c
}
