import { useState } from 'react'
import { useOperacion } from '../data/OperacionContext'
import { estadoStock, type CategoriaMaterial, type Material, type Movimiento } from '../data/operacion'
import Modal from '../components/ui/Modal'
import StatTile from '../components/ui/StatTile'
import Ico from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'
import { cop, copCompacto, fecha, hora, num } from '../utils/format'

const CATEGORIAS: CategoriaMaterial[] = ['Medidores', 'Tubería y accesorios', 'Químicos de planta', 'Dotación y herramientas']
const D = {
  plus: 'M12 4v16m8-8H4',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  warn: 'M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
}

export default function Inventario() {
  const { materiales, movimientos, moverStock, guardarMaterial, registrarEgreso } = useOperacion()
  const toast = useToast()
  const [cat, setCat] = useState<'Todas' | CategoriaMaterial>('Todas')
  const [q, setQ] = useState('')
  const [mov, setMov] = useState<{ m: Material; tipo: Movimiento['tipo'] } | null>(null)
  const [nuevo, setNuevo] = useState(false)

  const bajos = materiales.filter((m) => estadoStock(m) !== 'OK')
  const valor = materiales.reduce((s, m) => s + m.stock * m.costo, 0)
  const mesActual = new Date().getMonth()
  const salidasMes = movimientos.filter((x) => x.tipo === 'Salida' && new Date(x.ts).getMonth() === mesActual)
  const lista = materiales.filter((m) => (cat === 'Todas' || m.categoria === cat) && (!q || m.nombre.toLowerCase().includes(q.toLowerCase())))
  const porComprar = bajos.reduce((s, m) => s + Math.max(0, m.minimo * 2 - m.stock) * m.costo, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Almacén</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Inventario</h1>
          <p className="text-sm text-gray-500 mt-2">Medidores, tubería, químicos y dotación, con alertas cuando algo se está acabando.</p>
        </div>
        <button onClick={() => setNuevo(true)} className="btn-primary"><Ico d={D.plus} /> Nuevo material</button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile label="Materiales" value={materiales.length} sub={`${CATEGORIAS.length} categorías`} />
        <StatTile label="Por debajo del mínimo" value={bajos.length} tone={bajos.length ? 'danger' : 'secondary'} sub={bajos.length ? 'Hay que comprar' : 'Todo en orden'} />
        <StatTile label="Valor en bodega" value={copCompacto(valor)} sub="a costo de compra" />
        <StatTile label="Salidas este mes" value={salidasMes.length} sub={`${num(salidasMes.reduce((s, x) => s + x.cantidad, 0))} unidades usadas en obra`} />
      </section>

      {bajos.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 mb-5 text-sm text-red-900 flex items-start gap-3">
          <Ico d={D.warn} className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Pedido sugerido: {bajos.map((m) => m.nombre).join(', ')}</p>
            <p className="text-xs mt-0.5">Llevarlos al doble del mínimo cuesta aproximadamente {cop(porComprar)}.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
          {(['Todas', ...CATEGORIAS] as const).map((c) => <button key={c} onClick={() => setCat(c)} className={`px-3 h-9 rounded-lg text-sm font-semibold whitespace-nowrap ${cat === c ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>{c}</button>)}
        </div>
        <div className="relative flex-1"><Ico d={D.search} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar material" className="field h-11 pl-10" /></div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_340px] gap-5 items-start">
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-soft/60 border-b border-gray-100"><tr><th className="th">Material</th><th className="th text-right">Existencia</th><th className="th">Nivel</th><th className="th text-right">Costo</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {lista.map((m) => {
                  const e = estadoStock(m)
                  return (
                    <tr key={m.id} className="hover:bg-gray-soft/40">
                      <td className="td min-w-[220px]"><p className="font-semibold text-dark">{m.nombre}</p><p className="text-xs text-gray-400">{m.categoria}</p></td>
                      <td className="td text-right tabular-nums"><b className="text-dark">{num(m.stock)}</b> <span className="text-xs text-gray-400">{m.unidad}</span><p className="text-[11px] text-gray-400">mín. {m.minimo}</p></td>
                      <td className="td w-40">
                        <div className="h-2 rounded-full bg-gray-soft overflow-hidden"><div className={`h-full rounded-full ${e === 'OK' ? 'bg-secondary' : e === 'Bajo' ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (m.stock / (m.minimo * 2)) * 100)}%` }} /></div>
                        <span className={`text-[11px] font-semibold ${e === 'OK' ? 'text-gray-400' : e === 'Bajo' ? 'text-amber-700' : 'text-red-600'}`}>{e === 'OK' ? 'Suficiente' : e === 'Bajo' ? 'Bajo el mínimo' : 'Agotado'}</span>
                      </td>
                      <td className="td text-right tabular-nums text-gray-600">{cop(m.costo)}</td>
                      <td className="td text-right whitespace-nowrap">
                        <button onClick={() => setMov({ m, tipo: 'Entrada' })} className="btn-sm">Entrada</button>{' '}
                        <button onClick={() => setMov({ m, tipo: 'Salida' })} className="btn-sm">Salida</button>{' '}
                        <button onClick={() => setMov({ m, tipo: 'Ajuste' })} className="text-xs text-gray-400 hover:text-dark px-1">Ajustar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-dark mb-3">Últimos movimientos</h2>
          {movimientos.length === 0 ? <p className="text-sm text-gray-500">Aún no hay movimientos. Las entradas, salidas y ajustes aparecen aquí.</p> : (
            <ul className="space-y-3">
              {movimientos.slice(0, 12).map((x) => {
                const m = materiales.find((y) => y.id === x.materialId)
                return (
                  <li key={x.id} className="flex gap-3 text-sm">
                    <span className={`h-7 min-w-7 px-1.5 rounded-lg text-xs font-bold flex items-center justify-center ${x.tipo === 'Entrada' ? 'bg-green-50 text-green-700' : x.tipo === 'Salida' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{x.tipo === 'Entrada' ? '+' : x.tipo === 'Salida' ? '−' : '='}{x.cantidad}</span>
                    <div className="min-w-0"><p className="font-medium text-dark truncate">{m?.nombre}</p><p className="text-xs text-gray-400 truncate">{x.motivo} · {fecha(x.ts)} {hora(x.ts)}</p></div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {mov && (
        <MovModal
          m={mov.m}
          tipo={mov.tipo}
          onClose={() => setMov(null)}
          onGuardar={(cant, motivo, egreso) => {
            moverStock(mov.m.id, mov.tipo, cant, motivo)
            if (egreso) registrarEgreso({ fecha: new Date().toISOString().slice(0, 10), categoria: 'Químicos y materiales', descripcion: `${mov.m.nombre} (${cant} ${mov.m.unidad})`, proveedor: motivo, valor: cant * mov.m.costo, medio: 'Transferencia' })
            toast(`${mov.tipo} registrada`, `${mov.m.nombre}: ${cant} ${mov.m.unidad}${egreso ? ' · gasto registrado en caja' : ''}`)
            setMov(null)
          }}
        />
      )}
      {nuevo && <NuevoMaterial onClose={() => setNuevo(false)} onGuardar={(m) => { guardarMaterial({ ...m, id: `M${String(materiales.length + 1).padStart(2, '0')}` }); setNuevo(false); toast('Material creado', m.nombre) }} />}
    </div>
  )
}

function MovModal({ m, tipo, onClose, onGuardar }: { m: Material; tipo: Movimiento['tipo']; onClose: () => void; onGuardar: (cant: number, motivo: string, egreso: boolean) => void }) {
  const [cant, setCant] = useState(tipo === 'Ajuste' ? String(m.stock) : '')
  const [motivo, setMotivo] = useState('')
  const [egreso, setEgreso] = useState(tipo === 'Entrada')
  const n = Number(cant) || 0
  const ok = tipo === 'Ajuste' ? n >= 0 && motivo.trim().length > 2 : n > 0 && (tipo !== 'Salida' || n <= m.stock)
  return (
    <Modal open onClose={onClose} size="sm" title={`${tipo} · ${m.nombre}`} subtitle={`Existencia actual: ${m.stock} ${m.unidad}`}
      footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancelar</button><button disabled={!ok} onClick={() => onGuardar(n, motivo || (tipo === 'Entrada' ? 'Compra' : 'Salida manual'), tipo === 'Entrada' && egreso)} className="btn-primary">Guardar</button></div>}>
      <div className="p-6 space-y-4">
        <div><label className="field-label">{tipo === 'Ajuste' ? 'Cantidad real contada' : 'Cantidad'} ({m.unidad})</label><input autoFocus type="number" min={0} value={cant} onChange={(e) => setCant(e.target.value)} className="field tabular-nums" /></div>
        <div><label className="field-label">{tipo === 'Entrada' ? 'Proveedor o factura' : tipo === 'Salida' ? 'Para qué se usó' : 'Motivo del ajuste (obligatorio)'}</label><input value={motivo} onChange={(e) => setMotivo(e.target.value)} className="field" /></div>
        {tipo === 'Entrada' && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={egreso} onChange={(e) => setEgreso(e.target.checked)} className="accent-[#156D6D]" /> Registrar también el gasto en Caja ({cop(n * m.costo)})</label>}
        {tipo === 'Salida' && n > m.stock && <p className="text-xs text-red-600">No hay suficiente existencia.</p>}
      </div>
    </Modal>
  )
}

function NuevoMaterial({ onClose, onGuardar }: { onClose: () => void; onGuardar: (m: Omit<Material, 'id'>) => void }) {
  const [m, setM] = useState<Omit<Material, 'id'>>({ nombre: '', categoria: 'Tubería y accesorios', unidad: 'und', stock: 0, minimo: 1, costo: 0 })
  const set = <K extends keyof typeof m>(k: K, v: (typeof m)[K]) => setM((x) => ({ ...x, [k]: v }))
  return (
    <Modal open onClose={onClose} size="sm" title="Nuevo material"
      footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancelar</button><button disabled={!m.nombre.trim()} onClick={() => onGuardar(m)} className="btn-primary">Crear</button></div>}>
      <div className="p-6 grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="field-label">Nombre</label><input value={m.nombre} onChange={(e) => set('nombre', e.target.value)} className="field" /></div>
        <div className="col-span-2"><label className="field-label">Categoría</label><select value={m.categoria} onChange={(e) => set('categoria', e.target.value as CategoriaMaterial)} className="field">{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="field-label">Unidad</label><input value={m.unidad} onChange={(e) => set('unidad', e.target.value)} className="field" /></div>
        <div><label className="field-label">Costo unitario</label><input type="number" value={m.costo} onChange={(e) => set('costo', Number(e.target.value))} className="field" /></div>
        <div><label className="field-label">Existencia inicial</label><input type="number" value={m.stock} onChange={(e) => set('stock', Number(e.target.value))} className="field" /></div>
        <div><label className="field-label">Mínimo</label><input type="number" value={m.minimo} onChange={(e) => set('minimo', Number(e.target.value))} className="field" /></div>
      </div>
    </Modal>
  )
}
