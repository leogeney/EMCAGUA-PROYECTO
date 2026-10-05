import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { nombrePeriodo, resumenUsuario } from '../data/billing'
import { TARIFA } from '../data/constants'
import { detalleTarifa, listaVigencias, TARIFA_EJEMPLO, tarifaVigente, TOPE_SUBSIDIO, valorPeriodo, type TarifaCRA } from '../data/tarifa'
import { ConfirmDialog } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { cop, pct } from '../utils/format'

type Borrador = Omit<TarifaCRA, 'desde' | 'creada'>

export default function Tarifas() {
  const { usuarios, periodoLectura, aplicarTarifa, quitarTarifa } = useData()
  const toast = useToast()
  const vigente = tarifaVigente(periodoLectura.mes, periodoLectura.anio)
  const [t, setT] = useState<Borrador>(() => (vigente ? { acueducto: vigente.acueducto, alcantarillado: vigente.alcantarillado, consumoBasico: vigente.consumoBasico, subsidio: vigente.subsidio } : TARIFA_EJEMPLO))
  const opcionesDesde = [0, 1, 2].map((i) => { const d = new Date(periodoLectura.anio, periodoLectura.mes - 1 + i, 1); return { mes: d.getMonth() + 1, anio: d.getFullYear() } })
  const [desde, setDesde] = useState(0)
  const [consumo, setConsumo] = useState(18)
  const [estrato, setEstrato] = useState<1 | 2 | 3>(2)
  const [confirmar, setConfirmar] = useState(false)

  const nueva: TarifaCRA = { ...t, desde: opcionesDesde[desde], creada: 0 }
  const det = detalleTarifa(nueva, consumo, estrato)
  const actual = valorPeriodo(consumo, estrato, periodoLectura.mes, periodoLectura.anio)
  const errores = ([1, 2, 3] as const).filter((e) => t.subsidio[e] > TOPE_SUBSIDIO[e] + 1e-9)

  // Impacto mensual estimado con el consumo promedio de cada usuario activo
  const impacto = useMemo(() => {
    let antes = 0, despues = 0, subsidios = 0
    const porEstrato = { 1: { n: 0, antes: 0, despues: 0 }, 2: { n: 0, antes: 0, despues: 0 }, 3: { n: 0, antes: 0, despues: 0 } }
    for (const u of usuarios.filter((x) => x.estado === 'Activo')) {
      const c = Math.round(resumenUsuario(u).consumoPromedio)
      const a = valorPeriodo(c, u.estrato, periodoLectura.mes, periodoLectura.anio).total
      const d = detalleTarifa(nueva, c, u.estrato)
      antes += a; despues += d.total; subsidios += d.subsidio
      porEstrato[u.estrato].n++; porEstrato[u.estrato].antes += a; porEstrato[u.estrato].despues += d.total
    }
    return { antes, despues, subsidios, porEstrato }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarios, JSON.stringify(t), periodoLectura])

  const setServ = (s: 'acueducto' | 'alcantarillado', k: 'cf' | 'cc', v: string) => setT((x) => ({ ...x, [s]: { ...x[s], [k]: Number(v) || 0 } }))
  const aplicar = () => {
    aplicarTarifa({ ...nueva, creada: Date.now() })
    setConfirmar(false)
    toast('Tarifa aplicada', `Rige desde ${nombrePeriodo(nueva.desde.mes, nueva.desde.anio)}. Las facturas anteriores no cambian.`)
  }

  const campo = (label: string, valor: number, on: (v: string) => void, sufijo: string) => (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative"><input type="number" min={0} value={valor} onChange={(e) => on(e.target.value)} className="field pr-14 tabular-nums" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{sufijo}</span></div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Administración</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Tarifas</h1>
        <p className="text-sm text-gray-500 mt-2">Estructura de la CRA: cargo fijo + cargo por consumo, con subsidios para estratos 1, 2 y 3. Un cambio rige desde el periodo que elijas y nunca modifica facturas ya emitidas.</p>
      </div>

      <div className={`rounded-2xl border px-4 py-3 mb-5 text-sm ${vigente ? 'bg-green-50 border-green-100 text-green-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
        {vigente
          ? <>Para <b>{nombrePeriodo(periodoLectura.mes, periodoLectura.anio)}</b> rige la tarifa CRA aplicada desde {nombrePeriodo(vigente.desde.mes, vigente.desde.anio)}.</>
          : <>Hoy se factura con la <b>tarifa simple</b> por m³ ({([1, 2, 3] as const).map((e) => `E${e}: ${cop(TARIFA[e])}`).join(' · ')}), sin cargo fijo ni subsidios. Configura la tarifa CRA y aplícala desde el próximo periodo.</>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5 items-start">
        {/* Editor */}
        <section className="card p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex items-center justify-between"><h2 className="font-bold text-dark">Acueducto</h2></div>
            {campo('Cargo fijo', t.acueducto.cf, (v) => setServ('acueducto', 'cf', v), '$/mes')}
            {campo('Cargo por consumo', t.acueducto.cc, (v) => setServ('acueducto', 'cc', v), '$/m³')}
            <h2 className="col-span-2 font-bold text-dark pt-2">Alcantarillado</h2>
            {campo('Cargo fijo', t.alcantarillado.cf, (v) => setServ('alcantarillado', 'cf', v), '$/mes')}
            {campo('Cargo por vertimiento', t.alcantarillado.cc, (v) => setServ('alcantarillado', 'cc', v), '$/m³')}
          </div>
          <div>
            <label className="field-label">Consumo básico (subsidiable)</label>
            <select value={t.consumoBasico} onChange={(e) => setT((x) => ({ ...x, consumoBasico: Number(e.target.value) }))} className="field">
              <option value={11}>11 m³ · municipios a más de 2.000 m s. n. m.</option>
              <option value={13}>13 m³ · entre 1.000 y 2.000 m s. n. m.</option>
              <option value={16}>16 m³ · a menos de 1.000 m s. n. m.</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-1">Depende de la altura del municipio. Lo que pase de aquí es consumo complementario y no tiene subsidio.</p>
          </div>
          <div>
            <label className="field-label">Subsidios (acuerdo del Concejo municipal)</label>
            <div className="grid grid-cols-3 gap-3">
              {([1, 2, 3] as const).map((e) => (
                <div key={e}>
                  <div className="relative"><input type="number" min={0} max={TOPE_SUBSIDIO[e] * 100} value={Math.round(t.subsidio[e] * 100)} onChange={(x) => setT((y) => ({ ...y, subsidio: { ...y.subsidio, [e]: (Number(x.target.value) || 0) / 100 } }))} className={`field pr-8 tabular-nums ${t.subsidio[e] > TOPE_SUBSIDIO[e] ? 'border-red-300' : ''}`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span></div>
                  <p className="text-[11px] text-gray-500 mt-1">Estrato {e} · máx. {pct(TOPE_SUBSIDIO[e])}</p>
                </div>
              ))}
            </div>
            {errores.length > 0 && <p className="text-xs text-red-600 mt-2">El subsidio del estrato {errores.join(' y ')} supera el tope legal.</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end pt-2 border-t border-gray-100">
            <div className="flex-1">
              <label className="field-label">Rige desde</label>
              <select value={desde} onChange={(e) => setDesde(Number(e.target.value))} className="field">
                {opcionesDesde.map((o, i) => <option key={i} value={i}>{nombrePeriodo(o.mes, o.anio)}{i === 0 ? ' (periodo abierto)' : ''}</option>)}
              </select>
            </div>
            <button disabled={errores.length > 0} onClick={() => setConfirmar(true)} className="btn-primary">Aplicar tarifa</button>
          </div>
          <p className="text-[11px] text-gray-400">Los valores que trae por defecto son de ejemplo. Usa los del estudio de costos y tarifas aprobado por la junta de la empresa.</p>
        </section>

        <div className="space-y-5">
          {/* Simulador */}
          <section className="card p-5">
            <h2 className="font-bold text-dark mb-3">Simulador de factura</h2>
            <div className="grid grid-cols-[1fr_auto] gap-4 items-end mb-4">
              <div>
                <label className="field-label">Consumo: <b className="text-dark">{consumo} m³</b></label>
                <input type="range" min={0} max={45} value={consumo} onChange={(e) => setConsumo(Number(e.target.value))} className="w-full accent-[#156D6D]" />
              </div>
              <div className="flex p-1 bg-gray-soft rounded-xl">
                {([1, 2, 3] as const).map((e) => <button key={e} onClick={() => setEstrato(e)} className={`px-3 h-8 rounded-lg text-sm font-semibold ${estrato === e ? 'bg-white shadow-sm text-dark' : 'text-gray-500'}`}>E{e}</button>)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
              {det.lineas.map((l) => (
                <div key={l.concepto} className={`flex justify-between px-4 py-2 ${l.tipo === 'total' ? 'bg-dark text-white rounded-b-xl py-3' : ''}`}>
                  <span className={l.tipo === 'subsidio' ? 'text-green-700' : l.tipo === 'total' ? 'font-semibold' : 'text-gray-500'}>{l.concepto}{l.cantidad && <span className="text-gray-400"> · {l.cantidad}</span>}</span>
                  <span className={`tabular-nums ${l.tipo === 'total' ? 'text-lg font-extrabold' : l.tipo === 'subsidio' ? 'text-green-700 font-semibold' : 'text-gray-700'}`}>{cop(l.valor)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Con la tarifa de hoy pagaría <b className="text-dark">{cop(actual.total)}</b> ({det.total >= actual.total ? '+' : ''}{cop(det.total - actual.total)}).</p>
          </section>

          {/* Impacto */}
          <section className="card p-5">
            <h2 className="font-bold text-dark mb-1">Impacto en un mes típico</h2>
            <p className="text-xs text-gray-500 mb-3">Con el consumo promedio de cada usuario activo.</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Kpi k="Facturación hoy" v={cop(impacto.antes)} />
              <Kpi k="Con la nueva tarifa" v={cop(impacto.despues)} sub={`${impacto.despues >= impacto.antes ? '+' : ''}${pct(impacto.antes ? impacto.despues / impacto.antes - 1 : 0, 1)}`} />
              <Kpi k="Subsidios del mes" v={cop(impacto.subsidios)} sub="los cubre el fondo de solidaridad del municipio" />
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100"><th className="text-left py-2">Estrato</th><th className="text-right">Usuarios</th><th className="text-right">Factura prom. hoy</th><th className="text-right">Nueva</th></tr></thead>
              <tbody>{([1, 2, 3] as const).map((e) => { const x = impacto.porEstrato[e]; return <tr key={e} className="border-b border-gray-50"><td className="py-2">Estrato {e}</td><td className="text-right">{x.n}</td><td className="text-right tabular-nums">{cop(x.n ? x.antes / x.n : 0)}</td><td className="text-right tabular-nums font-semibold">{cop(x.n ? x.despues / x.n : 0)}</td></tr> })}</tbody>
            </table>
          </section>

          {listaVigencias().length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold text-dark mb-3">Tarifas aplicadas</h2>
              {listaVigencias().map((v) => {
                const futura = v.desde.anio * 12 + v.desde.mes >= periodoLectura.anio * 12 + periodoLectura.mes
                return (
                  <div key={v.creada} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                    <span>Desde <b>{nombrePeriodo(v.desde.mes, v.desde.anio)}</b> · CF acueducto {cop(v.acueducto.cf)} · {cop(v.acueducto.cc)}/m³</span>
                    {futura && <button onClick={() => quitarTarifa(v)} className="btn-sm">Quitar</button>}
                  </div>
                )
              })}
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmar}
        title={`¿Aplicar la tarifa desde ${nombrePeriodo(nueva.desde.mes, nueva.desde.anio)}?`}
        message={<p>Las facturas de ese periodo en adelante se calcularán con cargo fijo, consumo y subsidios. Las facturas anteriores no cambian. Antes de aplicarla, la tarifa debe estar aprobada y publicada a los usuarios.</p>}
        confirmLabel="Aplicar"
        onCancel={() => setConfirmar(false)}
        onConfirm={aplicar}
      />
    </div>
  )
}

function Kpi({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-gray-soft p-3">
      <p className="text-[11px] text-gray-500">{k}</p>
      <p className="text-base font-extrabold text-dark tabular-nums mt-0.5">{v}</p>
      {sub && <p className="text-[10.5px] text-gray-500 leading-snug">{sub}</p>}
    </div>
  )
}
