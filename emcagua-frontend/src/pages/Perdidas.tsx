import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { balanceHidrico, IANC_META, IPUF_REFERENCIA } from '../data/perdidas'
import { serieMensual } from '../data/analytics'
import { CHART } from '../data/constants'
import { AreaChart, BarList, ChartCard, ColumnChart, Legend } from '../components/charts/charts'
import StatTile from '../components/ui/StatTile'
import { cop, copCompacto, num, pct } from '../utils/format'

/** Agua no contabilizada: lo que sale de la planta frente a lo que se factura. */
export default function Perdidas() {
  const { usuarios, alarmas, medidores } = useData()
  const balance = useMemo(() => balanceHidrico(usuarios, 12), [usuarios])
  const serie = useMemo(() => serieMensual(usuarios, 12), [usuarios])
  const ult = balance[balance.length - 1]
  const ant = balance[balance.length - 2]

  // Valor del agua perdida: m³ perdidos × lo que en promedio se cobra por m³
  const valorM3 = (mes: number, anio: number) => { const s = serie.find((x) => x.mes === mes && x.anio === anio); return s && s.consumo ? s.facturado / s.consumo : 0 }
  const dejado = (b: { perdido: number; mes: number; anio: number }) => b.perdido * valorM3(b.mes, b.anio)

  // Fugas dentro de los predios, medidas por el caudal nocturno de los medidores inteligentes
  const fugasM3 = alarmas.filter((a) => a.tipo === 'fuga' && medidores[a.usuario.id]).reduce((s, a) => s + Math.round((Math.min(...medidores[a.usuario.id].perfil24h.slice(1, 6)) * 24 * 30) / 1000), 0)

  if (!ult) return <div className="p-8 text-sm text-gray-500">Aún no hay periodos facturados.</div>
  const sectores = [...ult.sectores].sort((a, b) => b.ianc - a.ianc)
  const red = Math.max(0, ult.perdido - fugasM3)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Balance hídrico · {ult.full}</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Agua no contabilizada</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-3xl">Agua que sale de la planta frente a la que se factura. La diferencia son fugas, conexiones ilegales y medidores que marcan de menos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile label="Agua no contabilizada" value={pct(ult.ianc, 1)} delta={ant ? { value: ult.ianc - ant.ianc, goodWhenUp: false, label: 'vs mes anterior', points: true } : undefined} sub={`meta ${pct(IANC_META)}`} />
        <StatTile label="Agua perdida en el mes" value={`${num(ult.perdido)} m³`} sub={`de ${num(ult.producido)} m³ producidos`} />
        <StatTile label="Pérdida por suscriptor" value={`${num(ult.ipuf, 1)} m³`} sub={`IPUF · referencia CRA ${IPUF_REFERENCIA} m³/mes`} />
        <StatTile label="Dejado de facturar" value={copCompacto(dejado(ult))} sub={`${copCompacto(balance.reduce((s, b) => s + dejado(b), 0))} en ${balance.length} meses`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 mb-5">
        <ChartCard
          title="Producido vs. facturado"
          subtitle="Cada barra es el agua que salió de la planta; la parte naranja no se facturó"
          legend={<Legend items={[{ label: 'Facturado', color: CHART.serie1 }, { label: 'No contabilizada', color: CHART.serie2 }]} />}
          table={{ columns: ['Periodo', 'Producido m³', 'Facturado m³', 'Perdido m³', 'IANC'], rows: balance.map((b) => [b.full, num(b.producido), num(b.facturado), num(b.perdido), pct(b.ianc, 1)]) }}
        >
          <ColumnChart
            data={balance.map((b) => ({ label: b.label, full: b.full, values: [b.facturado, b.perdido] }))}
            series={[{ name: 'Facturado', color: CHART.serie1 }, { name: 'No contabilizada', color: CHART.serie2 }]}
            format={(n) => `${num(n)} m³`}
            axisFormat={(n) => `${num(n)} m³`}
            height={240}
          />
        </ChartCard>

        <ChartCard
          title="Pérdida por sector"
          subtitle={`${ult.full} · agua de entrada de cada sector frente a lo facturado`}
          table={{ columns: ['Sector', 'Producido', 'Facturado', 'Perdido', 'IANC'], rows: sectores.map((s) => [s.barrio, num(s.producido), num(s.facturado), num(s.perdido), pct(s.ianc, 1)]) }}
        >
          <BarList data={sectores.map((s) => ({ label: s.barrio, value: s.ianc, hint: `${num(s.perdido)} m³ perdidos`, color: s.ianc > IANC_META ? CHART.serie2 : CHART.serie1 }))} format={(n) => pct(n, 1)} max={Math.max(0.6, sectores[0]?.ianc ?? 0)} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <ChartCard title="Evolución del agua no contabilizada" subtitle={`La línea punteada es la meta (${pct(IANC_META)})`}>
          <AreaChart data={balance.map((b) => ({ label: b.label, full: b.full, value: b.ianc }))} format={(n) => pct(n, 1)} height={220} color={CHART.serie2} name="IANC" refLine={{ value: IANC_META, label: 'Meta' }} />
        </ChartCard>

        <section className="card p-5">
          <h3 className="text-[15px] font-bold text-dark">¿Dónde se va el agua?</h3>
          <p className="text-xs text-gray-500 mt-1 mb-4">Estimado de {ult.full}</p>
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" style={{ background: CHART.critico }} />
              <div className="flex-1"><p className="font-semibold text-dark flex justify-between gap-2"><span>Fugas detectadas por los medidores</span><span className="tabular-nums whitespace-nowrap">{num(fugasM3)} m³</span></p><p className="text-xs text-gray-500 mt-0.5">Dentro de los predios. Avísales a los usuarios para que las reparen.</p></div>
            </li>
            <li className="flex gap-3">
              <span className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" style={{ background: CHART.serie2 }} />
              <div className="flex-1"><p className="font-semibold text-dark flex justify-between gap-2"><span>Pérdidas en la red y conexiones sin medir</span><span className="tabular-nums whitespace-nowrap">{num(red)} m³</span></p><p className="text-xs text-gray-500 mt-0.5">No se ven en los medidores de los usuarios. Hay que buscarlas en campo, empezando por {sectores[0]?.barrio}.</p></div>
            </li>
          </ul>
          <div className="rounded-xl bg-gray-soft px-3.5 py-3 mt-5 text-xs text-gray-600">
            Recuperar 10 puntos de pérdida equivale a unos <b className="text-dark">{cop(ult.producido * 0.1 * valorM3(ult.mes, ult.anio))}</b> más al mes.
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link to="/avisos?segmento=fugas&plantilla=fuga" className="btn-secondary h-9 text-sm">Avisar fugas</Link>
            <Link to="/lecturas" className="btn-secondary h-9 text-sm">Ver medidores</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
