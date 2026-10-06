/**
 * Verificación antifraude: cada factura, recibo y documento lleva un QR con su número y un código de seguridad.
 * Cualquiera (notaría, banco, el mismo usuario) lo escanea y la página /verificar confirma si es auténtico.
 *
 * El código sale de una firma de los datos del documento: si alguien cambia el nombre, el valor o el número,
 * el código ya no coincide. En producción la firma la hace el servidor con una clave secreta (HMAC);
 * aquí se calcula en el navegador para la demostración.
 */
import { useSyncExternalStore } from 'react'
import { cfg } from './config'

const CLAVE_DEMO = 'emcagua-apc-verificacion-2026'
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0/O ni 1/I para que no se confundan

/** Código de seguridad de 8 caracteres: "K7F3-9QX2". */
export function firmar(partes: (string | number)[]): string {
  const texto = `${CLAVE_DEMO}|${partes.join('|')}`
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0
    h2 = Math.imul(h2 ^ c, 2246822507) >>> 0
    h2 = (h2 ^ (h2 >>> 13)) >>> 0
  }
  let n = BigInt(h1) * 4294967296n + BigInt(h2)
  let out = ''
  for (let i = 0; i < 8; i++) { out += ALFABETO[Number(n % 32n)]; n /= 32n }
  return `${out.slice(0, 4)}-${out.slice(4)}`
}

export const normalizarCodigo = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})(.{4}).*/, '$1-$2')

/** Enlace que va dentro del QR. */
export const urlVerificacion = (id: string, codigo: string) => `${(cfg().urlPublica || window.location.origin).replace(/\/+$/, '')}/verificar?d=${encodeURIComponent(id)}&c=${codigo}`

/* -------- Firmas de cada tipo (las mismas al imprimir y al verificar) -------- */
export const codigoFactura = (f: { id: string; clienteId: string; monto: number }) => firmar(['FAC', f.id, f.clienteId, Math.round(f.monto)])
export const codigoRecibo = (p: { id: string; clienteId: string; monto: number; timestamp: number }) => firmar(['PAG', p.id, p.clienteId, Math.round(p.monto), p.timestamp])
const dia = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }
export const codigoDocumento = (d: { consecutivo: string; plantillaId: string; dirigidoA: string; ts: number }) => firmar(['DOC', d.consecutivo, d.plantillaId, d.dirigidoA, dia(d.ts)])

/* -------- Registro de documentos emitidos (para verificarlos y poder anularlos) -------- */
export type RegistroDoc = {
  consecutivo: string
  plantillaId: string
  nombre: string
  dirigidoA: string
  sujetoId?: string
  ts: number
  usuario: string
  codigo: string
  anulado?: { ts: number; usuario: string; motivo: string }
}

const KEY = 'emcagua_documentos_verificables'
let registro: Record<string, RegistroDoc> = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } })()
const oyentes = new Set<() => void>()
const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify(registro)) } catch { /* sin almacenamiento */ } oyentes.forEach((f) => f()) }

export function registrarDocumento(r: RegistroDoc) { registro = { ...registro, [r.consecutivo]: r }; guardar() }
export function anularDocumento(consecutivo: string, usuario: string, motivo: string) {
  const r = registro[consecutivo]
  if (!r) return
  registro = { ...registro, [consecutivo]: { ...r, anulado: { ts: Date.now(), usuario, motivo } } }
  guardar()
}
export const buscarDocumento = (consecutivo: string) => registro[consecutivo]
export const useRegistroDocs = () => useSyncExternalStore((f) => { oyentes.add(f); return () => { oyentes.delete(f) } }, () => registro)
