import { useState } from 'react'
import Modal from './ui/Modal'
import type { DatosPago } from '../data/DataContext'
import type { MetodoPago } from '../data/types'
import { cop } from '../utils/format'

type Linea = { label: string; monto: number; sub?: string }

type Props = {
  open: boolean
  onClose: () => void
  titulo: string
  cliente: string
  lineas: Linea[]
  onConfirm: (datos: DatosPago) => void
  confirmLabel?: string
}

export default function PagoDialog({ open, onClose, titulo, cliente, lineas, onConfirm, confirmLabel = 'Registrar pago' }: Props) {
  const total = lineas.reduce((s, l) => s + l.monto, 0)
  // Se monta de nuevo cada vez que se abre, así el estado inicia limpio.
  const [metodo, setMetodo] = useState<MetodoPago>('Efectivo')
  const [recibido, setRecibido] = useState(() => String(total))
  const [comprobante, setComprobante] = useState<string | undefined>()

  const rec = Number(recibido.replace(/\D/g, '')) || 0
  const vueltos = rec - total
  const valido = metodo === 'Transferencia' || rec >= total
  const sugeridos = Array.from(new Set([total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000]))

  const onFile = (file?: File) => {
    if (!file) return
    const r = new FileReader()
    r.onload = () => setComprobante(r.result as string)
    r.readAsDataURL(file)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={cliente}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            disabled={!valido}
            onClick={() => onConfirm(metodo === 'Efectivo' ? { metodo, recibido: rec } : { metodo, comprobante })}
            className="btn-primary flex-1"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="px-6 py-5 space-y-5">
        <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {lineas.map((l) => (
            <div key={l.label} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
              <div>
                <p className="text-dark">{l.label}</p>
                {l.sub && <p className="text-[11px] text-gray-400 font-mono">{l.sub}</p>}
              </div>
              <span className="font-semibold text-dark tabular-nums">{cop(l.monto)}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-gray-soft">
            <span className="text-sm font-bold text-dark">Total</span>
            <span className="text-lg font-extrabold text-dark tabular-nums">{cop(total)}</span>
          </div>
        </div>

        <div>
          <p className="field-label">Método de pago</p>
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-soft rounded-xl">
            {(['Efectivo', 'Transferencia'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                className={`h-9 rounded-lg text-sm font-semibold transition-all ${metodo === m ? 'bg-white text-dark shadow-sm' : 'text-gray-500 hover:text-dark'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {metodo === 'Efectivo' ? (
          <div>
            <label className="field-label" htmlFor="recibido">Dinero recibido</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
              <input
                id="recibido"
                inputMode="numeric"
                autoFocus
                value={rec ? rec.toLocaleString('es-CO') : ''}
                onChange={(e) => setRecibido(e.target.value)}
                className="field pl-7 text-lg font-bold tabular-nums"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {sugeridos.map((v) => (
                <button key={v} onClick={() => setRecibido(String(v))} className={rec === v ? 'chip-on' : 'chip'}>
                  {v === total ? 'Exacto' : cop(v)}
                </button>
              ))}
            </div>
            <div className={`mt-4 rounded-xl px-4 py-3 flex justify-between items-center ${!valido ? 'bg-red-50 text-red-700' : vueltos > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>
              <span className="text-sm font-semibold">{!valido ? `Faltan ${cop(-vueltos)}` : vueltos > 0 ? 'Vueltos a entregar' : 'Pago exacto, sin vueltos'}</span>
              {valido && vueltos > 0 && <span className="text-lg font-extrabold tabular-nums">{cop(vueltos)}</span>}
            </div>
          </div>
        ) : (
          <div>
            <p className="field-label">Comprobante (opcional)</p>
            {comprobante ? (
              <div className="relative rounded-xl border border-gray-100 overflow-hidden">
                <img src={comprobante} alt="Comprobante" className="w-full max-h-48 object-contain bg-gray-soft" />
                <button onClick={() => setComprobante(undefined)} className="absolute top-2 right-2 chip">Quitar</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors text-sm text-gray-500">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="font-medium">Adjuntar foto del comprobante</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
