import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { usePqr } from '../data/PqrContext'
import { facturaId, nombrePeriodo, periodosFacturados } from '../data/billing'
import { diasHabilesEntre } from '../data/pqr'
import { balanceHidrico } from '../data/perdidas'
import { valorPeriodo } from '../data/tarifa'
import { serieMensual, edadCartera } from '../data/analytics'
import Ico from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'
import { iso } from '../data/operacion'

type Reporte = { id: string; nombre: string; descripcion: string; columnas: string[]; filas: (string | number)[][] }
const D = { down: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }

function descargarCsv(nombre: string, columnas: string[], filas: (string | number)[][]) {
  const celda = (v: string | number) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = [columnas, ...filas].map((f) => f.map(celda).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `${nombre}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Sui() {
  const { usuarios, pagos, resumen } = useData()
  const { pqrs } = usePqr()
  const toast = useToast()
  const periodos = useMemo(() => periodosFacturados(usuarios, 12).reverse(), [usuarios])
  const [idx, setIdx] = useState(0)
  const [ver, setVer] = useState<string | null>(null)
  const p = periodos[idx]

  const reportes: Reporte[] = useMemo(() => {
    if (!p) return []
    const enPeriodo = (ts: number) => { const d = new Date(ts); return d.getMonth() + 1 === p.mes && d.getFullYear() === p.anio }
    const fact = usuarios.flatMap((u) => {
      const h = u.historial.find((x) => x.mes === p.mes && x.anio === p.anio)
      if (!h) return []
      const det = valorPeriodo(h.consumo, u.estrato, p.mes, p.anio)
      const v = (txt: string) => det.lineas.filter((l) => l.concepto.includes(txt)).reduce((s, l) => s + l.valor, 0)
      return [[u.id, facturaId(u.id, p.mes, p.anio), u.barrio, u.estrato, 'Residencial', h.estado === 'Suspendido' ? 'Suspendido' : 'Activo', h.consumo, h.estimado ? 'Promedio' : 'Real',
        det.cra ? v('Acueducto · cargo fijo') : 0, det.cra ? v('Acueducto · consumo') : det.subtotal, det.cra ? v('Alcantarillado · cargo fijo') : 0, det.cra ? v('Alcantarillado · consumo') : 0, -det.subsidio, h.estado === 'Suspendido' ? 0 : det.total, h.estado, h.fechaPago ? iso(new Date(h.fechaPago)) : '']]
    })
    const pq = pqrs.filter((x) => enPeriodo(x.radicadaEn)).map((x) => [x.radicado, iso(new Date(x.radicadaEn)), x.tipo, x.categoria, x.canal, x.suscriptorId ?? '', x.estado, x.respondidaEn ? iso(new Date(x.respondidaEn)) : '', x.respondidaEn ? diasHabilesEntre(x.radicadaEn, x.respondidaEn) : '', x.respondidaEn ? (diasHabilesEntre(x.radicadaEn, x.respondidaEn) <= 15 ? 'Sí' : 'No') : ''])
    const susp = usuarios.filter((u) => u.historial.some((x) => x.mes === p.mes && x.anio === p.anio && x.estado === 'Suspendido') || u.estado === 'Cortado').map((u) => { const r = resumen(u); return [u.id, u.barrio, u.estrato, u.medidor, u.estado === 'Cortado' ? 'Suspendido' : 'Reconectado', r.pagosDebe, Math.round(r.deuda)] })
    const b = balanceHidrico(usuarios, 12).find((x) => x.mes === p.mes && x.anio === p.anio)
    const s = serieMensual(usuarios, 12).find((x) => x.mes === p.mes && x.anio === p.anio)
    const pqP = pqrs.filter((x) => enPeriodo(x.radicadaEn))
    const ind: (string | number)[][] = [
      ['Suscriptores registrados', usuarios.length, 'und'],
      ['Suscriptores con servicio activo', usuarios.filter((u) => u.estado === 'Activo').length, 'und'],
      ['Suscriptores suspendidos', usuarios.filter((u) => u.estado === 'Cortado').length, 'und'],
      ['Agua producida (macromedición)', b?.producido ?? '', 'm³'],
      ['Agua facturada', b?.facturado ?? s?.consumo ?? '', 'm³'],
      ['Índice de agua no contabilizada (IANC)', b ? (b.ianc * 100).toFixed(1) : '', '%'],
      ['Pérdidas por usuario facturado (IPUF)', b ? b.ipuf.toFixed(2) : '', 'm³/suscriptor/mes'],
      ['Valor facturado', Math.round(s?.facturado ?? 0), 'COP'],
      ['Valor recaudado del periodo', Math.round(s?.recaudado ?? 0), 'COP'],
      ['Cartera total', edadCartera(usuarios).reduce((a, t) => a + t.monto, 0), 'COP'],
      ['PQR recibidas', pqP.length, 'und'],
      ['PQR respondidas en término (≤15 días hábiles)', pqP.filter((x) => x.respondidaEn && diasHabilesEntre(x.radicadaEn, x.respondidaEn) <= 15).length, 'und'],
      ['Pagos registrados', pagos.filter((x) => enPeriodo(x.timestamp)).length, 'und'],
    ]
    const cat = usuarios.map((u) => [u.id, u.barrio, u.estrato, 'Residencial', u.medidor, u.estado, u.historial[0] ? nombrePeriodo(u.historial[0].mes, u.historial[0].anio) : ''])
    return [
      { id: 'facturacion', nombre: 'Facturación por suscriptor', descripcion: 'Una fila por suscriptor: consumo, cargos, subsidio y estado de pago del periodo.', columnas: ['Código suscriptor', 'Factura', 'Sector', 'Estrato', 'Uso', 'Estado servicio', 'Consumo m³', 'Tipo lectura', 'CF acueducto', 'Consumo acueducto', 'CF alcantarillado', 'Vertimiento', 'Subsidio', 'Total facturado', 'Estado pago', 'Fecha pago'], filas: fact },
      { id: 'pqr', nombre: 'Peticiones, quejas y reclamos', descripcion: 'PQR radicadas en el periodo con tiempos de respuesta en días hábiles.', columnas: ['Radicado', 'Fecha radicación', 'Tipo', 'Causal', 'Canal', 'Código suscriptor', 'Estado', 'Fecha respuesta', 'Días hábiles', 'En término'], filas: pq },
      { id: 'suspensiones', nombre: 'Suscriptores suspendidos', descripcion: 'Suscriptores con el servicio suspendido en el periodo y su deuda actual.', columnas: ['Código suscriptor', 'Sector', 'Estrato', 'Medidor', 'Estado actual', 'Facturas pendientes', 'Deuda'], filas: susp },
      { id: 'indicadores', nombre: 'Indicadores operativos y comerciales', descripcion: 'Resumen del periodo: suscriptores, agua producida y facturada, IANC, recaudo, cartera y PQR.', columnas: ['Indicador', 'Valor', 'Unidad'], filas: ind },
      { id: 'catastro', nombre: 'Catastro de suscriptores', descripcion: 'Listado de suscriptores con sector, estrato, medidor y estado.', columnas: ['Código suscriptor', 'Sector', 'Estrato', 'Uso', 'Medidor', 'Estado', 'Primer periodo facturado'], filas: cat },
    ]
  }, [p, usuarios, pqrs, pagos, resumen])

  if (!p) return null
  const etiqueta = `${p.anio}-${String(p.mes).padStart(2, '0')}`
  const sel = reportes.find((r) => r.id === ver)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Superservicios</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Reportes SUI</h1>
          <p className="text-sm text-gray-500 mt-2">Archivos listos con la información comercial, técnica y de atención del periodo, para preparar el cargue al Sistema Único de Información.</p>
        </div>
        <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="field w-auto">{periodos.map((x, i) => <option key={i} value={i}>{nombrePeriodo(x.mes, x.anio)}</option>)}</select>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 mb-5 text-sm text-amber-900 flex gap-2">
        <Ico d={D.info} className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Estos archivos traen los datos organizados en CSV (separado por punto y coma). Antes de cargarlos, compara las columnas con el formato vigente que publica la Superservicios para cada reporte y ajusta los nombres o el orden si cambió.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportes.map((r) => (
          <section key={r.id} className="card p-5 flex flex-col">
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0"><Ico d={D.file} className="w-5 h-5" /></span>
              <div><h2 className="font-bold text-dark leading-tight">{r.nombre}</h2><p className="text-xs text-gray-500 mt-1">{r.descripcion}</p></div>
            </div>
            <p className="text-xs text-gray-400 mt-3">{r.filas.length} fila(s) · {r.columnas.length} columnas</p>
            <div className="flex gap-2 mt-auto pt-4">
              <button onClick={() => setVer(ver === r.id ? null : r.id)} className="btn-secondary flex-1 text-sm">{ver === r.id ? 'Ocultar' : 'Vista previa'}</button>
              <button disabled={!r.filas.length} onClick={() => { descargarCsv(`SUI_${r.id}_${etiqueta}`, r.columnas, r.filas); toast('Archivo descargado', `SUI_${r.id}_${etiqueta}.csv`) }} className="btn-primary flex-1 text-sm"><Ico d={D.down} /> CSV</button>
            </div>
          </section>
        ))}
      </div>

      {sel && (
        <section className="card mt-5 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 font-bold text-dark">{sel.nombre} · primeras 10 filas</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-soft/60"><tr>{sel.columnas.map((c) => <th key={c} className="th">{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">{sel.filas.slice(0, 10).map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j} className="px-5 py-2 whitespace-nowrap tabular-nums">{c}</td>)}</tr>)}</tbody>
            </table>
            {sel.filas.length === 0 && <p className="p-8 text-center text-sm text-gray-500">Sin registros en este periodo.</p>}
          </div>
        </section>
      )}
    </div>
  )
}
