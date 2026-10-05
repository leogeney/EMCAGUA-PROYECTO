/* eslint-disable react-refresh/only-export-components */
/** Pestañas de caja que se muestran dentro de Pagos: arqueo del día, gastos y resumen mensual. */
import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { useOperacion } from '../data/OperacionContext'
import { CATEGORIAS_EGRESO, iso, type CategoriaEgreso, type Egreso } from '../data/operacion'
import { CHART, MESES } from '../data/constants'
import { BarList, ChartCard, ColumnChart } from '../components/charts/charts'
import StatTile from '../components/ui/StatTile'
import Ico from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'
import { cop, copCompacto, fecha, hora } from '../utils/format'
import { exportarXls } from '../utils/excel'
import { cfg } from '../data/config'

const D = {
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  down: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  cam: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z',
}

/* ------------------------------- Caja del día ------------------------------- */

export function CajaDia() {
  const { pagos } = useData()
  const { egresos, cierres, cerrarCaja } = useOperacion()
  const toast = useToast()
  const [dia, setDia] = useState(() => iso(new Date()))
  const [base, setBase] = useState(() => String(cfg().baseCaja))
  const [contado, setContado] = useState('')
  const [nota, setNota] = useState('')

  const delDia = pagos.filter((p) => iso(new Date(p.timestamp)) === dia)
  const suma = (m: string) => delDia.filter((p) => p.metodo === m).reduce((s, p) => s + p.monto, 0)
  const efectivo = suma('Efectivo'), transf = suma('Transferencia'), linea = suma('En línea')
  const gastosEf = egresos.filter((e) => e.fecha === dia && e.medio === 'Efectivo (caja)').reduce((s, e) => s + e.valor, 0)
  const esperado = (Number(base) || 0) + efectivo - gastosEf
  const dif = contado === '' ? null : (Number(contado) || 0) - esperado
  const cierre = cierres.find((c) => c.fecha === dia)
  const ahora = new Date()
  const temprano = dia === iso(ahora) && ahora.getHours() < 17 // el cierre del día se hace desde las 5:00 p. m.
  const porCajero = Object.entries(delDia.reduce<Record<string, number>>((a, p) => ((a[p.cajero ?? '—'] = (a[p.cajero ?? '—'] ?? 0) + p.monto), a), {}))

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="date" value={dia} onChange={(e) => { setDia(e.target.value); setContado('') }} className="field w-auto" />
        {cierre ? <span className="badge-ok">Caja cerrada por {cierre.cajero} a las {hora(cierre.ts)}</span> : <span className="badge-warn">Caja abierta</span>}
      </div>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile label="Recaudo del día" value={cop(efectivo + transf + linea)} sub={`${delDia.length} pago(s)`} />
        <StatTile label="Efectivo" value={cop(efectivo)} />
        <StatTile label="Transferencias" value={cop(transf)} />
        <StatTile label="Pagos en línea" value={cop(linea)} sub="desde el portal del usuario" />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 items-start">
        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <b className="text-dark">Pagos recibidos</b>
            {porCajero.map(([c, v]) => <span key={c} className="text-gray-500">{c}: <b className="text-dark">{cop(v)}</b></span>)}
          </div>
          {delDia.length === 0 ? <p className="p-10 text-center text-sm text-gray-500">No hay pagos este día.</p> : (
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full">
                <thead className="bg-gray-soft/60 sticky top-0"><tr><th className="th">Hora</th><th className="th">Usuario</th><th className="th">Concepto</th><th className="th">Medio</th><th className="th text-right">Valor</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {delDia.map((p) => <tr key={p.id}><td className="td text-gray-500 whitespace-nowrap">{hora(p.timestamp)}</td><td className="td font-medium">{p.cliente}</td><td className="td text-gray-500">{p.concepto}</td><td className="td"><span className="badge-muted">{p.metodo}</span></td><td className="td text-right tabular-nums font-semibold">{cop(p.monto)}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="font-bold text-dark flex items-center gap-2"><Ico d={D.lock} className="w-4 h-4" /> Arqueo y cierre</h2>
          {cierre ? (
            <div className="space-y-2 text-sm">
              <Linea k="Efectivo esperado" v={cop(cierre.efectivoSistema)} />
              <Linea k="Efectivo contado" v={cop(cierre.efectivoContado)} />
              <Linea k={cierre.diferencia >= 0 ? 'Sobrante' : 'Faltante'} v={cop(Math.abs(cierre.diferencia))} tono={cierre.diferencia === 0 ? 'ok' : 'mal'} />
              {cierre.nota && <p className="text-xs text-gray-500">Nota: {cierre.nota}</p>}
            </div>
          ) : (
            <>
              <div><label className="field-label">Base inicial de caja</label><input type="number" value={base} onChange={(e) => setBase(e.target.value)} className="field tabular-nums" /></div>
              <div className="rounded-xl bg-gray-soft p-3 space-y-1.5 text-sm">
                <Linea k="Base" v={cop(Number(base) || 0)} />
                <Linea k="+ Pagos en efectivo" v={cop(efectivo)} />
                <Linea k="− Gastos pagados de caja" v={cop(gastosEf)} />
                <Linea k="= Efectivo que debe haber" v={cop(esperado)} fuerte />
              </div>
              <div><label className="field-label">Efectivo contado</label><input type="number" value={contado} onChange={(e) => setContado(e.target.value)} placeholder="Cuenta billetes y monedas" className="field tabular-nums" /></div>
              {dif !== null && <p className={`text-sm font-semibold ${dif === 0 ? 'text-green-700' : 'text-red-600'}`}>{dif === 0 ? 'La caja cuadra.' : `${dif > 0 ? 'Sobran' : 'Faltan'} ${cop(Math.abs(dif))}.`}</p>}
              {dif !== null && dif !== 0 && <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Explica la diferencia (obligatorio)" className="field" />}
              {temprano && <p className="text-xs text-gray-500">El cierre de hoy se habilita a las 5:00 p. m.</p>}
              <button disabled={temprano || dif === null || (dif !== 0 && nota.trim().length < 4)} onClick={() => { cerrarCaja({ fecha: dia, efectivoSistema: esperado, efectivoContado: Number(contado) || 0, egresosEfectivo: gastosEf, transferencias: transf, enLinea: linea, diferencia: dif ?? 0, nota: nota || undefined }); toast('Caja cerrada', `${fecha(new Date(dia + 'T12:00'))} · ${dif === 0 ? 'cuadró' : `diferencia ${cop(dif ?? 0)}`}`) }} className="btn-primary w-full">Cerrar caja del día</button>
            </>
          )}
        </section>
      </div>
    </>
  )
}

function Linea({ k, v, fuerte, tono }: { k: string; v: string; fuerte?: boolean; tono?: 'ok' | 'mal' }) {
  return <div className={`flex justify-between ${fuerte ? 'font-bold text-dark pt-1.5 border-t border-gray-200' : 'text-gray-600'} ${tono === 'ok' ? 'text-green-700' : tono === 'mal' ? 'text-red-600 font-semibold' : ''}`}><span>{k}</span><span className="tabular-nums">{v}</span></div>
}

/* --------------------------------- Gastos --------------------------------- */

export function Gastos() {
  const { egresos, registrarEgreso } = useOperacion()
  const toast = useToast()
  const hoy = new Date()
  const [mes, setMes] = useState(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`)
  const vacio = { fecha: iso(hoy), categoria: 'Químicos y materiales' as CategoriaEgreso, descripcion: '', proveedor: '', valor: '', medio: 'Transferencia' as Egreso['medio'], soporte: undefined as string | undefined }
  const [f, setF] = useState(vacio)
  const lista = egresos.filter((e) => e.fecha.startsWith(mes))
  const onFile = (file?: File) => { if (!file) return; const r = new FileReader(); r.onload = () => setF((x) => ({ ...x, soporte: r.result as string })); r.readAsDataURL(file) }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5 items-start">
      <section className="card p-5 space-y-3">
        <h2 className="font-bold text-dark">Registrar gasto</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="field-label">Fecha</label><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className="field" /></div>
          <div><label className="field-label">Valor</label><input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} className="field tabular-nums" /></div>
        </div>
        <div><label className="field-label">Categoría</label><select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value as CategoriaEgreso })} className="field">{CATEGORIAS_EGRESO.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="field-label">Descripción</label><input value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Ej: gasolina moto cuadrilla" className="field" /></div>
        <div><label className="field-label">Proveedor</label><input value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} className="field" /></div>
        <div><label className="field-label">Se pagó con</label><select value={f.medio} onChange={(e) => setF({ ...f, medio: e.target.value as Egreso['medio'] })} className="field"><option>Transferencia</option><option>Efectivo (caja)</option></select></div>
        <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-600">
          <span className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden">{f.soporte ? <img src={f.soporte} alt="" className="h-full w-full object-cover" /> : <Ico d={D.cam} className="w-5 h-5 text-gray-400" />}</span>
          Foto de la factura o recibo
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <button disabled={!f.descripcion.trim() || !(Number(f.valor) > 0)} onClick={() => { registrarEgreso({ ...f, valor: Number(f.valor) }); toast('Gasto registrado', `${f.descripcion} · ${cop(Number(f.valor))}`); setF(vacio) }} className="btn-primary w-full">Guardar gasto</button>
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div><b className="text-dark">Gastos del mes</b><p className="text-xs text-gray-500">{lista.length} registro(s) · {cop(lista.reduce((s, e) => s + e.valor, 0))}</p></div>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="field w-auto" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-soft/60"><tr><th className="th">Fecha</th><th className="th">Descripción</th><th className="th">Categoría</th><th className="th">Medio</th><th className="th text-right">Valor</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((e) => <tr key={e.id}><td className="td text-gray-500 whitespace-nowrap">{e.fecha}</td><td className="td"><p className="font-medium text-dark">{e.descripcion}</p><p className="text-xs text-gray-400">{e.proveedor}{e.soporte ? ' · con soporte' : ''}</p></td><td className="td text-gray-600">{e.categoria}</td><td className="td"><span className="badge-muted">{e.medio}</span></td><td className="td text-right tabular-nums font-semibold">{cop(e.valor)}</td></tr>)}
            </tbody>
          </table>
          {lista.length === 0 && <p className="p-10 text-center text-sm text-gray-500">Sin gastos este mes.</p>}
        </div>
      </section>
    </div>
  )
}

/* ------------------------------ Resumen mensual ------------------------------ */

export function ResumenCaja() {
  const { pagos } = useData()
  const { egresos } = useOperacion()
  const meses = useMemo(() => {
    const hoy = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1)
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const ingresos = pagos.filter((p) => iso(new Date(p.timestamp)).startsWith(clave)).reduce((s, p) => s + p.monto, 0)
      const gastos = egresos.filter((e) => e.fecha.startsWith(clave))
      return { clave, label: MESES[d.getMonth()].slice(0, 3), full: `${MESES[d.getMonth()]} ${d.getFullYear()}`, ingresos, egresos: gastos.reduce((s, e) => s + e.valor, 0), gastos }
    })
  }, [pagos, egresos])
  const [sel, setSel] = useState(meses.length - 1)
  const m = meses[sel]
  const porCat = CATEGORIAS_EGRESO.map((c) => ({ label: c, value: m.gastos.filter((g) => g.categoria === c).reduce((s, g) => s + g.valor, 0) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)

  const exportar = () => {
    const filas: (string | number)[][] = [
      ...pagos.filter((p) => iso(new Date(p.timestamp)).startsWith(m.clave)).map((p) => [iso(new Date(p.timestamp)), 'Ingreso', 'Recaudo servicios', `${p.cliente} · ${p.concepto}`, p.metodo, p.monto]),
      ...m.gastos.map((g) => [g.fecha, 'Egreso', g.categoria, `${g.descripcion} · ${g.proveedor}`, g.medio, -g.valor]),
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    exportarXls(`EMCAGUA caja ${m.clave}`, `Movimientos de caja · ${m.full}`, `Ingresos ${cop(m.ingresos)} · Egresos ${cop(m.egresos)} · Resultado ${cop(m.ingresos - m.egresos)}`, ['Fecha', 'Tipo', 'Categoría', 'Detalle', 'Medio', 'Valor'], filas, [5])
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <select value={sel} onChange={(e) => setSel(Number(e.target.value))} className="field w-auto">{meses.map((x, i) => <option key={x.clave} value={i}>{x.full}</option>)}</select>
        <button onClick={exportar} className="btn-secondary"><Ico d={D.down} /> Exportar para el contador</button>
      </div>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatTile label="Ingresos" value={copCompacto(m.ingresos)} sub="pagos de usuarios" />
        <StatTile label="Gastos" value={copCompacto(m.egresos)} sub={`${m.gastos.length} registro(s)`} />
        <StatTile label="Resultado de caja" value={copCompacto(m.ingresos - m.egresos)} tone={m.ingresos - m.egresos < 0 ? 'danger' : 'secondary'} sub="no incluye nómina ni provisiones" />
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard className="xl:col-span-2" title="Resultado de caja por mes" subtitle="Ingresos menos gastos registrados" table={{ columns: ['Mes', 'Ingresos', 'Gastos', 'Resultado'], rows: meses.map((x) => [x.full, cop(x.ingresos), cop(x.egresos), cop(x.ingresos - x.egresos)]) }}>
          <ColumnChart data={meses.map((x) => ({ label: x.label, full: x.full, values: [Math.max(0, x.ingresos - x.egresos)], colors: [x.ingresos - x.egresos < 0 ? CHART.critico : CHART.serie1] }))} series={[{ name: 'Resultado', color: CHART.serie1 }]} format={copCompacto} />
        </ChartCard>
        <ChartCard title="¿En qué se gasta?" subtitle={m.full}>
          {porCat.length ? <BarList data={porCat} format={copCompacto} color={CHART.serie2} /> : <p className="text-sm text-gray-500">Sin gastos registrados.</p>}
        </ChartCard>
      </div>
    </>
  )
}
