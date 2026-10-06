/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Borrador, Formato } from './documentos'
import { getUsername } from '../utils/session'
import { codigoDocumento, registrarDocumento } from './verificacion'

export type Emitido = {
  consecutivo: string
  plantillaId: string
  nombre: string
  dirigidoA: string
  formato: Formato
  borrador: Borrador
  ts: number
  usuario: string
  /** Suscriptor, empleado o radicado al que se refiere (para verificarlo después). */
  sujetoId?: string
  /** Código de seguridad que va en el QR. */
  codigo: string
}

type Ctx = {
  emitidos: Emitido[]
  siguiente: (prefijo: string) => string
  emitir: (e: Omit<Emitido, 'consecutivo' | 'ts' | 'usuario' | 'codigo'>, prefijo: string) => Emitido
}

const C = createContext<Ctx | null>(null)

/** Consecutivo por tipo y año: EMC-PS-2026-001 */
const consecutivo = (lista: Emitido[], prefijo: string, anio: number) => {
  const base = `EMC-${prefijo}-${anio}-`
  return `${base}${String(lista.filter((d) => d.consecutivo.startsWith(base)).length + 1).padStart(3, '0')}`
}

export function DocumentosProvider({ children }: { children: ReactNode }) {
  // Se guardan en este navegador para que el consecutivo no se repita al recargar (luego: servidor)
  const [emitidos, setEmitidos] = useState<Emitido[]>(() => { try { return JSON.parse(localStorage.getItem('emcagua_emitidos') ?? '[]') } catch { return [] } })
  const siguiente = useCallback((prefijo: string) => consecutivo(emitidos, prefijo, new Date().getFullYear()), [emitidos])
  const emitir = useCallback(
    (e: Omit<Emitido, 'consecutivo' | 'ts' | 'usuario' | 'codigo'>, prefijo: string) => {
      const base = { ...e, consecutivo: consecutivo(emitidos, prefijo, new Date().getFullYear()), ts: Date.now(), usuario: getUsername() }
      const doc: Emitido = { ...base, codigo: codigoDocumento(base) }
      const lista = [doc, ...emitidos]
      setEmitidos(lista)
      try { localStorage.setItem('emcagua_emitidos', JSON.stringify(lista)) } catch { /* sin almacenamiento */ }
      registrarDocumento({ consecutivo: doc.consecutivo, plantillaId: doc.plantillaId, nombre: doc.nombre, dirigidoA: doc.dirigidoA, sujetoId: doc.sujetoId, ts: doc.ts, usuario: doc.usuario, codigo: doc.codigo })
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
