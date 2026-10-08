import { useState } from 'react'
import { descargarRespaldo, horasDesdeUltima, respaldarAhora, useRespaldos } from '../data/respaldos'
import { useToast } from './ui/Toast'
import { fecha, hora } from '../utils/format'

const tam = (b: number) => (b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Configuración → Copias de seguridad (solo el gerente). La carpeta extra se guarda con "Guardar cambios". */
export default function Respaldos({ carpetaExtra, onCarpetaExtra }: { carpetaExtra: string; onCarpetaExtra: (v: string) => void }) {
  const e = useRespaldos()
  const toast = useToast()
  const [haciendo, setHaciendo] = useState(false)
  const [todas, setTodas] = useState(false)
  if (!e) return null
  const h = horasDesdeUltima(e)
  const ult = e.archivos[0]
  const tono = e.ultimoError ? 'border-red-200 bg-red-50 text-red-800' : h <= 26 ? 'border-green-200 bg-green-50 text-green-900' : 'border-amber-200 bg-amber-50 text-amber-900'

  const ahora = async () => {
    setHaciendo(true)
    try { const r = await respaldarAhora(); toast('Copia de seguridad lista', `${r.nombre} · ${tam(r.bytes)}`) } catch (x) { toast('No se hizo la copia', mensaje(x), 'warning') } finally { setHaciendo(false) }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-bold text-dark">Copias de seguridad</h2>
          <p className="text-xs text-gray-500 mt-1">Se hace una copia de toda la base de datos cada noche a las 11 p. m. (y al encender el servidor si faltó la del día). Se guardan las últimas {e.conservar}.</p>
        </div>
        <button disabled={haciendo} onClick={() => void ahora()} className="btn-primary shrink-0">{haciendo ? 'Copiando…' : 'Hacer copia ahora'}</button>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${tono}`}>
        {ult ? <p><b>Última copia:</b> {fecha(new Date(ult.fecha))} {hora(new Date(ult.fecha))} · {tam(ult.bytes)}{h > 26 && !e.ultimoError ? ' · hace más de un día' : ''}</p> : <p><b>Todavía no hay copias.</b> Haz la primera con el botón.</p>}
        {e.ultimoError && <p className="mt-1"><b>Último error:</b> {e.ultimoError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="field-label">Carpeta principal</label>
          <p className="field bg-gray-soft text-xs font-mono break-all h-auto py-2.5">{e.carpeta}</p>
        </div>
        <div>
          <label className="field-label">Segunda copia en (opcional)</label>
          <input value={carpetaExtra} onChange={(x) => onCarpetaExtra(x.target.value)} placeholder="Ej: C:\Users\Usuario\OneDrive\EMCAGUA o E:\Respaldos" className="field text-xs font-mono" />
          <p className="text-[11px] text-gray-500 mt-1">Una carpeta de OneDrive o una memoria USB: si el disco del computador se daña, las copias quedan a salvo.</p>
        </div>
      </div>

      {e.archivos.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
          {(todas ? e.archivos : e.archivos.slice(0, 5)).map((a) => (
            <li key={a.nombre} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="flex-1 min-w-0 truncate font-mono text-xs text-gray-600">{a.nombre}</span>
              <span className="text-xs text-gray-400 tabular-nums">{tam(a.bytes)}</span>
              <button onClick={() => descargarRespaldo(a.nombre).catch((x) => toast('No se descargó', mensaje(x), 'warning'))} className="btn-sm">Descargar</button>
            </li>
          ))}
        </ul>
      )}
      {e.archivos.length > 5 && <button onClick={() => setTodas(!todas)} className="text-xs font-semibold text-secondary mt-2">{todas ? 'Ver menos' : `Ver las ${e.archivos.length} copias`}</button>}
      <p className="text-[11px] text-gray-400 mt-3">Para restaurar una copia: doble clic en <b>RESTAURAR-COPIA.bat</b> en la carpeta emcagua-backend (reemplaza todos los datos actuales por los de la copia).</p>
    </section>
  )
}
