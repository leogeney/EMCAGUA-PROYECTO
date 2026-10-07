import { useState } from 'react'
import { borrarBarrio, crearBarrio, renombrarBarrio, useZonas } from '../data/zonas'
import { useToast } from './ui/Toast'
import Ico from './ui/Icon'

const D = {
  plus: 'M12 4v16m8-8H4',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
}

const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** Configuración → Sectores y barrios: los 5 sectores de la red y los barrios que se van agregando. */
export default function SectoresBarrios() {
  const zonas = useZonas()
  const toast = useToast()
  const [nuevo, setNuevo] = useState<Record<string, string>>({})
  const [editando, setEditando] = useState<{ sector: string; barrio: string; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const agregar = async (sector: string) => {
    const nombre = (nuevo[sector] ?? '').trim().replace(/\s+/g, ' ')
    if (!nombre) return
    if (zonas.find((z) => z.nombre === sector)?.barrios.some((b) => b.nombre.toLowerCase() === nombre.toLowerCase())) return toast('Ya existe', `${nombre} ya está en ${sector}`, 'warning')
    setOcupado(true)
    try { await crearBarrio(sector, nombre); setNuevo((n) => ({ ...n, [sector]: '' })); toast('Barrio agregado', `${nombre} · ${sector}`) } catch (e) { toast('No se agregó el barrio', mensaje(e), 'warning') } finally { setOcupado(false) }
  }
  const guardarNombre = async () => {
    if (!editando) return
    const nombre = editando.texto.trim().replace(/\s+/g, ' ')
    if (!nombre || nombre === editando.barrio) return setEditando(null)
    setOcupado(true)
    try { await renombrarBarrio(editando.sector, editando.barrio, nombre); toast('Barrio actualizado', nombre); setEditando(null) } catch (e) { toast('No se cambió el nombre', mensaje(e), 'warning') } finally { setOcupado(false) }
  }
  const quitar = async (sector: string, barrio: string) => {
    setOcupado(true)
    try { await borrarBarrio(sector, barrio); toast('Barrio eliminado', `${barrio} · ${sector}`) } catch (e) { toast('No se eliminó', mensaje(e), 'warning') } finally { setOcupado(false) }
  }

  const total = zonas.reduce((s, z) => s + z.barrios.length, 0)

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="font-bold text-dark flex items-center gap-2"><Ico d={D.pin} className="w-4 h-4 text-secondary" /> Sectores y barrios</h2>
        <span className="text-xs text-gray-400 whitespace-nowrap">{zonas.length} sectores · {total} barrios</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">Cada predio pertenece a un sector y, si ya está creado, a un barrio. Agrega los barrios a medida que los vayas recordando; un barrio con predios no se puede borrar.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {zonas.map((z) => (
          <div key={z.nombre} className="rounded-2xl border border-gray-100 p-3.5">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="font-semibold text-dark">{z.nombre}</p>
              {z.predios !== undefined && <span className="text-[11px] text-gray-400">{z.predios} predio(s)</span>}
            </div>
            {z.barrios.length === 0 && <p className="text-xs text-gray-400 mb-2">Sin barrios todavía.</p>}
            <ul className="space-y-1 mb-2">
              {z.barrios.map((b) => (
                <li key={b.nombre} className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-soft text-sm">
                  {editando?.sector === z.nombre && editando.barrio === b.nombre ? (
                    <input autoFocus value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') void guardarNombre(); if (e.key === 'Escape') setEditando(null) }} onBlur={() => void guardarNombre()} className="field h-8 text-sm flex-1" />
                  ) : (
                    <>
                      <span className="flex-1 truncate text-gray-700">{b.nombre}</span>
                      {b.predios !== undefined && b.predios > 0 && <span className="text-[11px] text-gray-400">{b.predios}</span>}
                      <span className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <button disabled={ocupado} onClick={() => setEditando({ sector: z.nombre, barrio: b.nombre, texto: b.nombre })} className="h-7 w-7 rounded-md text-gray-400 hover:text-dark flex items-center justify-center" title="Cambiar nombre"><Ico d={D.edit} className="w-3.5 h-3.5" /></button>
                        <button disabled={ocupado || !!b.predios} onClick={() => void quitar(z.nombre, b.nombre)} className="h-7 w-7 rounded-md text-gray-400 hover:text-red-600 disabled:opacity-30 flex items-center justify-center" title={b.predios ? 'Tiene predios: no se puede borrar' : 'Borrar'}><Ico d={D.trash} className="w-3.5 h-3.5" /></button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); void agregar(z.nombre) }} className="flex gap-2">
              <input value={nuevo[z.nombre] ?? ''} onChange={(e) => setNuevo((n) => ({ ...n, [z.nombre]: e.target.value }))} placeholder={`Nuevo barrio en ${z.nombre}`} className="field h-9 text-sm flex-1" />
              <button disabled={ocupado || !(nuevo[z.nombre] ?? '').trim()} className="btn-secondary h-9 px-3 shrink-0" title="Agregar"><Ico d={D.plus} className="w-4 h-4" /></button>
            </form>
          </div>
        ))}
      </div>
    </section>
  )
}
