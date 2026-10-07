/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Borrador, Formato } from './documentos'
import { getUsername } from '../utils/session'
import { anularDocumento, codigoDocumento, registrarDocumento, reemplazarRegistro, type RegistroDoc } from './verificacion'
import { api, mensajeError, MODO_API } from './api'
import { useToast } from '../components/ui/Toast'

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
  /** Emite el documento: con la API el consecutivo y el código los asigna el servidor. */
  emitir: (e: Omit<Emitido, 'consecutivo' | 'ts' | 'usuario' | 'codigo'>, prefijo: string) => Promise<Emitido>
  /** Anula un documento emitido (quien escanee su QR verá que ya no es válido). */
  anular: (consecutivo: string, motivo: string) => Promise<void>
}

const C = createContext<Ctx | null>(null)

/** Consecutivo por tipo y año: EMC-PS-2026-001 */
const consecutivo = (lista: Emitido[], prefijo: string, anio: number) => {
  const base = `EMC-${prefijo}-${anio}-`
  return `${base}${String(lista.filter((d) => d.consecutivo.startsWith(base)).length + 1).padStart(3, '0')}`
}

type DocServidor = Omit<Emitido, 'borrador'> & { contenido: string; anulado?: { ts: number; usuario: string; motivo: string } }

export function DocumentosProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  // Demostración: se guardan en este navegador para que el consecutivo no se repita al recargar
  const [emitidos, setEmitidos] = useState<Emitido[]>(() => { if (MODO_API) return []; try { return JSON.parse(localStorage.getItem('emcagua_emitidos') ?? '[]') } catch { return [] } })

  const recargar = useCallback(async () => {
    if (!MODO_API) return
    try {
      const lista = await api<DocServidor[]>('/vista/documentos')
      const docs: Emitido[] = lista.map(({ contenido, anulado: _a, ...d }) => ({ ...d, borrador: (() => { try { return JSON.parse(contenido) } catch { return { asunto: d.nombre, cuerpo: contenido } } })() }))
      setEmitidos(docs)
      reemplazarRegistro(lista.map((d): RegistroDoc => ({ consecutivo: d.consecutivo, plantillaId: d.plantillaId, nombre: d.nombre, dirigidoA: d.dirigidoA, sujetoId: d.sujetoId, ts: d.ts, usuario: d.usuario, codigo: d.codigo, anulado: d.anulado })))
    } catch { /* sin permiso del módulo o sin conexión: se queda la lista */ }
  }, [])
  useEffect(() => {
    if (!MODO_API) return
    const t = setTimeout(recargar, 0)
    return () => clearTimeout(t)
  }, [recargar])

  const siguiente = useCallback((prefijo: string) => consecutivo(emitidos, prefijo, new Date().getFullYear()), [emitidos])
  const emitir = useCallback(
    async (e: Omit<Emitido, 'consecutivo' | 'ts' | 'usuario' | 'codigo'>, prefijo: string) => {
      if (MODO_API) {
        const d = await api<{ consecutivo: string; emitido: string; emitidoPor: string; codigoVerificacion: string }>('/emision', { metodo: 'POST', cuerpo: { prefijo, plantillaId: e.plantillaId, nombre: e.nombre, dirigidoA: e.dirigidoA, sujetoId: e.sujetoId, formato: e.formato, contenido: JSON.stringify(e.borrador) } })
        const doc: Emitido = { ...e, consecutivo: d.consecutivo, ts: Date.parse(d.emitido), usuario: d.emitidoPor, codigo: d.codigoVerificacion }
        setEmitidos((l) => [doc, ...l])
        void recargar()
        return doc
      }
      const base = { ...e, consecutivo: consecutivo(emitidos, prefijo, new Date().getFullYear()), ts: Date.now(), usuario: getUsername() }
      const doc: Emitido = { ...base, codigo: codigoDocumento(base) }
      const lista = [doc, ...emitidos]
      setEmitidos(lista)
      try { localStorage.setItem('emcagua_emitidos', JSON.stringify(lista)) } catch { /* sin almacenamiento */ }
      registrarDocumento({ consecutivo: doc.consecutivo, plantillaId: doc.plantillaId, nombre: doc.nombre, dirigidoA: doc.dirigidoA, sujetoId: doc.sujetoId, ts: doc.ts, usuario: doc.usuario, codigo: doc.codigo })
      return doc
    },
    [emitidos, recargar],
  )
  const anular = useCallback(async (c: string, motivo: string) => {
    if (MODO_API) {
      try { await api(`/emision/${encodeURIComponent(c)}/anular`, { metodo: 'POST', cuerpo: { motivo } }) } catch (e) { toast('No se anuló el documento', mensajeError(e), 'warning'); throw e }
      await recargar()
      return
    }
    anularDocumento(c, getUsername(), motivo)
  }, [recargar, toast])
  const value = useMemo(() => ({ emitidos, siguiente, emitir, anular }), [emitidos, siguiente, emitir, anular])
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useDocumentos() {
  const c = useContext(C)
  if (!c) throw new Error('useDocumentos debe usarse dentro de <DocumentosProvider>')
  return c
}
