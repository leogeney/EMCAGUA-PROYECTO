import { useEffect, useRef, useState } from 'react'
import { cambiarModoSinMedidores, useConfig } from '../data/config'
import { puede } from '../utils/session'
import { cop } from '../utils/format'
import { useToast } from './ui/Toast'

const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Interruptor (on/off) del modo sin medidores. */
export function Interruptor({ activo, onChange, disabled }: { activo: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={activo} disabled={disabled} onClick={() => onChange(!activo)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${activo ? 'bg-amber-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

function useCambiar() {
  const toast = useToast()
  const [ocupado, setOcupado] = useState(false)
  const cambiar = async (v: boolean) => {
    setOcupado(true)
    try {
      await cambiarModoSinMedidores(v)
      toast(v ? 'Modo sin medidores activado' : 'Modo sin medidores apagado', v ? 'Todos los predios pagan el valor fijo de su estrato.' : 'Los predios con medidor instalado se cobran por consumo.')
    } catch (e) { toast('No se cambió el modo', mensaje(e), 'warning') } finally { setOcupado(false) }
  }
  return { cambiar, ocupado }
}

/** Botón del encabezado: muestra si el modo está activo y deja prenderlo/apagarlo. */
export function BotonSinMedidores() {
  const c = useConfig()
  const { cambiar, ocupado } = useCambiar()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const editable = puede('configuracion')
  useEffect(() => {
    if (!abierto) return
    const cerrar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [abierto])
  const on = c.modoSinMedidores

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAbierto(!abierto)} title="Modo de cobro"
        className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${on ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3c3.5 4.2 6 7.6 6 10.5A6 6 0 016 13.5C6 10.6 8.5 7.2 12 3z" /></svg>
        <span className="hidden md:inline">{on ? 'Sin medidores' : 'Con medidores'}</span>
        <span className={`w-2 h-2 rounded-full ${on ? 'bg-amber-500' : 'bg-green-500'}`} />
      </button>
      {abierto && (
        <div className="absolute right-0 top-11 w-[300px] card p-4 shadow-xl z-50">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="font-bold text-dark text-sm">Modo sin medidores</p>
            <Interruptor activo={on} disabled={!editable || ocupado} onChange={(v) => void cambiar(v)} />
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {on ? 'Activo: todos los predios pagan un valor fijo al mes según su estrato, tengan o no medidor.' : 'Apagado: los predios con medidor instalado se cobran por consumo (m³); los que no tienen, valor fijo.'}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[1, 2, 3].map((e) => (
              <div key={e} className="rounded-lg bg-gray-soft py-2">
                <p className="text-[10px] text-gray-400 uppercase">Estrato {e}</p>
                <p className="text-sm font-bold text-dark tabular-nums">{cop(e === 1 ? c.cobroFijoEstrato1 : e === 2 ? c.cobroFijoEstrato2 : c.cobroFijoEstrato3)}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">{editable ? 'El cambio aplica desde la próxima factura. Los valores se editan en Configuración.' : 'Solo quien tiene acceso a Configuración puede cambiarlo.'}</p>
        </div>
      )}
    </div>
  )
}

/** Aviso para las páginas de medidores (Lecturas) cuando el modo está activo. */
export function AvisoSinMedidores() {
  const c = useConfig()
  const { cambiar, ocupado } = useCambiar()
  if (!c.modoSinMedidores) return null
  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <p className="font-bold text-amber-900 text-sm">Modo sin medidores activo</p>
        <p className="text-xs text-amber-800 mt-0.5">Las facturas se generan con el valor fijo de cada estrato ({cop(c.cobroFijoEstrato1)} / {cop(c.cobroFijoEstrato2)} / {cop(c.cobroFijoEstrato3)}). Las lecturas no se usan para cobrar hasta que se apague este modo.</p>
      </div>
      {puede('configuracion') && <button disabled={ocupado} onClick={() => void cambiar(false)} className="btn-secondary shrink-0">Apagar modo</button>}
    </div>
  )
}
