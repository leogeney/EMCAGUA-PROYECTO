import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { serieMensual } from '../data/analytics'
import { CHART } from '../data/constants'
import { balanceHidrico, IANC_META, IPUF_REFERENCIA, macroRegistrado, registrarMacro } from '../data/perdidas'
import { AreaChart, BarList, ChartCard, ColumnChart, Legend } from '../components/charts/charts'
import StatTile from '../components/ui/StatTile'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { cop, copCompacto, num, pct } from '../utils/format'

export default function Perdidas() {
  const { usuarios, alarmas, medidores } = useData()
  const toast = useToast()
  const [version, setVersion] = useState(0)
  const [registrar, setRegistrar] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const balance = useMemo(() => balanceHidrico(usuarios, 12), [usuarios, version])
  const serie = useMemo(() => serieMensual(usuarios, 12), [usuarios])
  const ult = balance[balance.length - 1]
  const ant = balance[balance.length - 2]
  const s = serie[serie.length - 1]
  const precioM3 = s && s.consumo ? s.facturado / s.consumo : 2600
  const perdidoAnio = balance.reduce((a, b) => a + b.perdido, 0)

  // ¿Dónde se va el agua? (estimado del último mes)
  const fugasDetectadas = alarmas.filter((a) => a.tipo === 'fuga').reduce((sum, a) => sum + Math.round((Math.min(...medidores[a.usuario.id].perfil24h.slice(1, 6)) * 24 * 30) / 1000), 0)
  const estimados = usuarios.filter((u) => u.historial.some((h) => h.mes === ult?.mes && h.anio === ult?.anio && h.estimado)).length
  const sectores = [...(ult?.sectores ?? [])].sort((a, b) => b.ianc - a.ianc)
  const peor = sectores[0]

  if (!ult) return null
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Balance hídrico · {ult.full}</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Agua no contabilizada</h1>
          <p className="text-sm text-gray-500 mt-2">Agua que sale de la planta frente a la que se factura. La diferencia son fugas, conexiones ilegales y medidores que marcan de menos.</p>
        </div>
        <button onClick={() => setRegistrar(true)} className="btn-primary shrink-0 whitespace-nowrap">Registrar macromedidores</button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile label="Agua no contabilizada" value={pct(ult.ianc, 1)} tone={ult.ianc > IANC_META ? 'danger' : 'secondary'} delta={ant ? { value: ult.ianc - ant.ianc, goodWhenUp: false, label: 'vs mes anterior', points: true } : undefined} sub={`meta ${pct(IANC_META)}`} />
        <StatTile label="Agua perdida en el mes" value={`${num(ult.perdido)} m³`} sub={`de ${num(ult.producido)} m³ producidos`} />
        <StatTile label="Pérdida por suscriptor" value={`${num(ult.ipuf, 1)} m³`} tone={ult.ipuf > IPUF_REFERENCIA ? 'warning' : 'secondary'} sub={`IPUF · referencia CRA ${IPUF_REFERENCIA} m³/mes`} />
        <StatTile label="Dejado de facturar" value={copCompacto(ult.perdido * precioM3)} tone="warning" sub={`${copCompacto(perdidoAnio * precioM3)} en 12 meses`} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <ChartCard
          className="xl:col-span-2"
          title="Producido vs. facturado"
          subtitle="Cada barra es el agua que salió de la planta; la parte naranja no se facturó"
          legend={<Legend items={[{ label: 'Facturado', color: CHART.serie1 }, { label: 'No contabilizada', color: CHART.serie2 }]} />}
          table={{ columns: ['Periodo', 'Producido m³', 'Facturado m³', 'Perdido m³', 'IANC'], rows: balance.map((b) => [b.full, num(b.producido), num(b.facturado), num(b.perdido), pct(b.ianc, 1)]) }}
        >
          <ColumnChart data={balance.map((b) => ({ label: b.label, full: b.full, values: [b.facturado, b.perdido] }))} series={[{ name: 'Facturado', color: CHART.serie1 }, { name: 'No contabilizada', color: CHART.serie2 }]} format={(n) => `${num(n)} m³`} axisFormat={(n) => `${num(n / 1000, 1)} mil`} />
        </ChartCard>
        <ChartCard title="Pérdida por sector" subtitle={`${ult.full} · según macromedidor de cada sector`} table={{ columns: ['Sector', 'Producido', 'Facturado', 'IANC'], rows: sectores.map((x) => [x.barrio, num(x.producido), num(x.facturado), pct(x.ianc, 1)]) }}>
          <BarList data={sectores.map((x) => ({ label: x.barrio, value: x.ianc, hint: `${num(x.perdido)} m³ perdidos`, color: x.ianc > IANC_META ? CHART.serie2 : CHART.serie1 }))} format={(n) => pct(n, 1)} max={0.6} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard className="xl:col-span-2" title="Evolución del agua no contabilizada" subtitle={`La línea punteada es la meta (${pct(IANC_META)})`}>
          <AreaChart data={balance.map((b) => ({ label: b.label, full: b.full, value: b.ianc * 100 }))} format={(n) => `${num(n, 1)}%`} color={CHART.serie2} name="IANC" refLine={{ value: IANC_META * 100, label: 'Meta' }} />
        </ChartCard>
        <section className="card p-5">
          <h3 className="text-[15px] font-bold text-dark">¿Dónde se va el agua?</h3>
          <p className="text-xs text-gray-500 mb-4">Estimado de {ult.full}</p>
          <ul className="space-y-3 text-sm">
            <Fila color={CHART.critico} k="Fugas detectadas por los medidores" v={`${num(fugasDetectadas)} m³`} hint="Dentro de los predios. Avísale a cada usuario desde Avisos WhatsApp." />
            <Fila color={CHART.serie2} k="Pérdidas en la red y conexiones sin medir" v={`${num(Math.max(0, ult.perdido - fugasDetectadas))} m³`} hint="No se ven en los medidores de los usuarios. Hay que buscarlas en campo, empezando por el sector con más pérdida." />
            {estimados > 0 && <Fila color={CHART.eje} k="Usuarios facturados por promedio" v={`${estimados}`} hint="Su consumo real es desconocido: revisa esos medidores." />}
          </ul>
          {peor && (
            <div className="mt-5 rounded-xl bg-amber-50 text-amber-900 text-xs px-3 py-2.5 leading-relaxed">
              <b>Prioridad:</b> {peor.barrio} pierde el {pct(peor.ianc, 0)} del agua que recibe ({num(peor.perdido)} m³ al mes, unos {cop(peor.perdido * precioM3)}). Conviene hacer allí la próxima búsqueda de fugas y un censo de conexiones.
            </div>
          )}
        </section>
      </div>

      <RegistroMacro
        open={registrar}
        balance={balance}
        onClose={() => setRegistrar(false)}
        onGuardar={(mes, anio, porBarrio, nota) => {
          registrarMacro(mes, anio, { total: Object.values(porBarrio).reduce((a, b) => a + b, 0), porBarrio, manual: true, nota })
          setVersion((v) => v + 1)
          setRegistrar(false)
          toast('Macromedición registrada', 'El balance se recalculó con las lecturas reales.')
        }}
      />
    </div>
  )
}

function Fila({ color, k, v, hint }: { color: string; k: string; v: string; hint: string }) {
  return (
    <li className="flex gap-3">
      <span className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
      <div className="flex-1">
        <div className="flex justify-between gap-2"><span className="font-semibold text-dark">{k}</span><span className="font-bold tabular-nums whitespace-nowrap">{v}</span></div>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
    </li>
  )
}

function RegistroMacro({ open, balance, onClose, onGuardar }: { open: boolean; balance: ReturnType<typeof balanceHidrico>; onClose: () => void; onGuardar: (mes: number, anio: number, porBarrio: Record<string, number>, nota: string) => void }) {
  const [idx, setIdx] = useState(balance.length - 1)
  const b = balance[idx]
  const [valores, setValores] = useState<Record<string, string>>({})
  const [nota, setNota] = useState('')
  const val = (barrio: string) => valores[`${idx}-${barrio}`] ?? String(b?.sectores.find((s) => s.barrio === barrio)?.producido ?? '')
  if (!b) return null
  return (
    <Modal open={open} onClose={onClose} title="Registrar macromedidores" subtitle="Volumen que entregó la planta a cada sector en el periodo (m³)"
      footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancelar</button><button onClick={() => onGuardar(b.mes, b.anio, Object.fromEntries(b.sectores.map((s) => [s.barrio, Number(val(s.barrio)) || 0])), nota)} className="btn-primary">Guardar</button></div>}>
      <div className="p-6 space-y-4">
        <div>
          <label className="field-label">Periodo</label>
          <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="field">
            {balance.map((x, i) => <option key={x.full} value={i}>{x.full}{macroRegistrado(x.mes, x.anio) ? ' · registrado' : ''}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {b.sectores.map((s) => (
            <div key={s.barrio}>
              <label className="field-label">{s.barrio}</label>
              <div className="relative"><input type="number" value={val(s.barrio)} onChange={(e) => setValores((v) => ({ ...v, [`${idx}-${s.barrio}`]: e.target.value }))} className="field pr-10 tabular-nums" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">m³</span></div>
              <p className="text-[11px] text-gray-500 mt-1">Facturado: {num(s.facturado)} m³</p>
            </div>
          ))}
        </div>
        <div><label className="field-label">Nota</label><input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: macromedidor de Guamalito calibrado el 3 de octubre" className="field" /></div>
      </div>
    </Modal>
  )
}
