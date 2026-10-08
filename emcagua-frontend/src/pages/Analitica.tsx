import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { CHART, cobroFijo, UMBRAL_ALTO } from '../data/constants'
import { useConfig } from '../data/config'
import { ubicacion, useZonas } from '../data/zonas'
import { consumosAtipicos, distribucionConsumo, edadCartera, porSector, porEstrato, serieMensual } from '../data/analytics'
import { AreaChart, BarList, ChartCard, ColumnChart, Legend } from '../components/charts/charts'
import StatTile from '../components/ui/StatTile'
import { cop, copCompacto, num, pct } from '../utils/format'

const m3 = (n: number) => `${num(n)} m³`

export default function Analitica() {
  const { usuarios, resumen } = useData()
  const zonas = useZonas()
  const [barrio, setBarrio] = useState<string>('Todos')
  const [rango, setRango] = useState<6 | 12>(12)

  const base = useMemo(() => (barrio === 'Todos' ? usuarios : usuarios.filter((u) => u.sector === barrio)), [usuarios, barrio])
  const serie = useMemo(() => serieMensual(base, rango), [base, rango])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const barrios = useMemo(() => porSector(usuarios).sort((a, b) => b.consumoPromedio - a.consumoPromedio), [usuarios, zonas])
  const estratos = useMemo(() => porEstrato(base), [base])
  const dist = useMemo(() => distribucionConsumo(base), [base])
  const atipicos = useMemo(() => consumosAtipicos(base), [base])
  const cartera = useMemo(() => edadCartera(base), [base])

  const ult = serie[serie.length - 1]
  const ant = serie[serie.length - 2]
  // El último periodo aún está en recaudo: la tasa se mide sobre el periodo anterior (ya vencido).
  const tasaRecaudo = ant && ant.facturado ? ant.recaudado / ant.facturado : 0
  const tasaRecaudoPrev = serie[serie.length - 3]?.facturado ? serie[serie.length - 3].recaudado / serie[serie.length - 3].facturado : tasaRecaudo
  const carteraTotal = cartera.reduce((s, t) => s + t.monto, 0)
  const morosos = base.filter((u) => resumen(u).vencido).length
  const altos = base.filter((u) => resumen(u).consumoActual > UMBRAL_ALTO).length
  // Modo sin medidores: no hay m³; las gráficas de consumo pasan a mostrar el cobro fijo
  const conf = useConfig()
  const sinMed = conf.modoSinMedidores
  const activos = base.filter((u) => u.estado !== 'Cortado')
  const fijoMes = activos.reduce((s, u) => s + cobroFijo(u.estrato), 0)
  const fijoSector = zonas.map((z) => { const us = usuarios.filter((u) => u.sector === z.nombre && u.estado !== 'Cortado'); return { sector: z.nombre, usuarios: us.length, valor: us.reduce((s, u) => s + cobroFijo(u.estrato), 0) } }).sort((a, b) => b.valor - a.valor)
  const fijoEstrato = [1, 2, 3].map((e) => { const n = activos.filter((u) => Math.min(3, u.estrato) === e).length; return { estrato: e, usuarios: n, tarifa: cobroFijo(e), valor: n * cobroFijo(e) } })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Analítica descriptiva</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Indicadores de gestión</h1>
          <p className="text-sm text-gray-500 mt-2">Consumo, facturación y cartera · {base.length} suscriptores {barrio !== 'Todos' && `del sector ${barrio}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm max-w-full overflow-x-auto">
            {['Todos', ...zonas.map((z) => z.nombre)].map((b) => (
              <button key={b} onClick={() => setBarrio(b)} className={`px-3 h-8 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${barrio === b ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>
                {b}
              </button>
            ))}
          </div>
          <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
            {([6, 12] as const).map((r) => (
              <button key={r} onClick={() => setRango(r)} className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${rango === r ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>
                {r} meses
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {sinMed ? (
          <StatTile label="Cobro fijo esperado" value={copCompacto(fijoMes)} sub={`Se facturará en el próximo cierre · ${activos.length} predio(s) activo(s)`} />
        ) : <StatTile
          label="Consumo del periodo"
          value={m3(ult.consumo)}
          delta={ant ? { value: ant.consumo ? ult.consumo / ant.consumo - 1 : 0, goodWhenUp: false, label: `vs ${ant.full}` } : undefined}
          sub={`${ult.full} · ${num(ult.consumo / Math.max(1, ult.usuariosConsumo), 1)} m³ por usuario`}
        />}
        <StatTile
          label="Facturado"
          value={copCompacto(ult.facturado)}
          delta={ant ? { value: ant.facturado ? ult.facturado / ant.facturado - 1 : 0, goodWhenUp: true, label: `vs ${ant.full}` } : undefined}
          sub={`${ult.facturas} facturas · ${ult.pagadas} ya pagadas`}
        />
        <StatTile
          label="Tasa de recaudo"
          value={pct(tasaRecaudo, 1)}
          delta={{ value: tasaRecaudo - tasaRecaudoPrev, goodWhenUp: true, label: 'vs periodo previo', points: true }}
          sub={ant ? `Periodo ${ant.full} (ya vencido)` : undefined}
        />
        <StatTile label="Cartera pendiente" value={copCompacto(carteraTotal)} sub={`${morosos} usuarios en mora · ${altos} con consumo alto`} tone="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {sinMed ? (
          <ChartCard
            className="lg:col-span-2"
            title="Facturado por mes"
            subtitle="Sin medidores no se mide el consumo: se muestra el valor cobrado cada mes"
            table={{ columns: ['Periodo', 'Facturado', 'Facturas'], rows: serie.map((p) => [p.full, cop(p.facturado), p.facturas]) }}
          >
            <AreaChart data={serie.map((p) => ({ label: p.label, full: p.full, value: p.facturado }))} format={copCompacto} axisFormat={(n) => (n >= 1_000_000 ? `${num(n / 1_000_000, 1)}M` : `${num(n / 1000)}k`)} name="Facturado" height={260} />
          </ChartCard>
        ) : <ChartCard
          className="lg:col-span-2"
          title="Consumo total de agua por mes"
          subtitle="Metros cúbicos facturados a suscriptores activos"
          table={{ columns: ['Periodo', 'Consumo (m³)', 'Usuarios', 'Promedio (m³)'], rows: serie.map((p) => [p.full, num(p.consumo), p.usuariosConsumo, num(p.consumo / Math.max(1, p.usuariosConsumo), 1)]) }}
        >
          <AreaChart data={serie.map((p) => ({ label: p.label, full: p.full, value: p.consumo }))} format={m3} axisFormat={(n) => num(n)} name="Consumo" height={260} />
        </ChartCard>}

        {sinMed ? (
          <ChartCard
            title="Cobro fijo por sector"
            subtitle="Lo que se factura cada mes en cada sector"
            table={{ columns: ['Sector', 'Predios', 'Valor mensual'], rows: fijoSector.map((b) => [b.sector, b.usuarios, cop(b.valor)]) }}
          >
            <BarList data={fijoSector.map((b) => ({ label: b.sector, value: b.valor, hint: `${b.usuarios} predios`, color: barrio === 'Todos' || barrio === b.sector ? CHART.serie1 : '#c9cec8' }))} format={copCompacto} />
          </ChartCard>
        ) : <ChartCard
          title="Consumo promedio por sector"
          subtitle={`Último periodo · tope normal ${UMBRAL_ALTO} m³`}
          table={{ columns: ['Sector', 'Prom. (m³)', 'Usuarios', 'En mora'], rows: barrios.map((b) => [b.sector, num(b.consumoPromedio, 1), b.usuarios, b.morosos]) }}
        >
          <BarList
            data={barrios.map((b) => ({ label: b.sector, value: b.consumoPromedio, hint: `${b.usuarios} usuarios`, color: barrio === 'Todos' || barrio === b.sector ? CHART.serie1 : '#c9cec8' }))}
            format={(n) => `${num(n, 1)} m³`}
            max={Math.max(UMBRAL_ALTO, ...barrios.map((b) => b.consumoPromedio))}
          />
          <p className="text-[11px] text-gray-400 mt-4">El filtro de sector resalta la barra; el ranking siempre compara todos los sectores.</p>
        </ChartCard>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard
          className="lg:col-span-2"
          title="Facturado vs. recaudado"
          subtitle="Valor de las facturas de cada mes según su estado actual (por mes de la factura, no por día de pago)"
          legend={<Legend items={[{ label: 'Recaudado', color: CHART.serie1 }, { label: 'Pendiente de pago', color: CHART.serie2 }]} />}
          table={{ columns: ['Periodo', 'Facturado', 'Recaudado', 'Pendiente', '% recaudo'], rows: serie.map((p) => [p.full, cop(p.facturado), cop(p.recaudado), cop(p.pendiente), pct(p.facturado ? p.recaudado / p.facturado : 0)]) }}
        >
          <ColumnChart
            data={serie.map((p) => ({ label: p.label, full: p.full, values: [p.recaudado, p.pendiente] }))}
            series={[{ name: 'Recaudado', color: CHART.serie1 }, { name: 'Pendiente', color: CHART.serie2 }]}
            format={copCompacto}
            axisFormat={(n) => (n >= 1_000_000 ? `${num(n / 1_000_000, 1)}M` : `${num(n / 1000)}k`)}
            height={260}
          />
        </ChartCard>

        <ChartCard
          title="Edad de la cartera"
          subtitle="Facturas pendientes según días de vencidas"
          table={{ columns: ['Tramo', 'Facturas', 'Valor'], rows: cartera.map((t) => [t.label, t.facturas, cop(t.monto)]) }}
        >
          <BarList
            data={cartera.map((t, i) => ({ label: t.label, value: t.monto, hint: `${t.facturas} fact.`, color: i === 0 ? '#9ec5bf' : i < 2 ? CHART.serie2 : CHART.critico }))}
            format={copCompacto}
          />
          <div className="mt-4 rounded-xl bg-gray-soft px-3 py-2.5 flex justify-between text-xs">
            <span className="text-gray-500">Total cartera</span>
            <span className="font-bold text-dark tabular-nums">{cop(carteraTotal)}</span>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {sinMed ? (
          <ChartCard
            title="Predios por estrato"
            subtitle="Cuántos pagan cada valor fijo"
            table={{ columns: ['Estrato', 'Predios', 'Valor fijo', 'Total mensual'], rows: fijoEstrato.map((e) => [`Estrato ${e.estrato}${e.estrato === 3 ? ' o más' : ''}`, e.usuarios, cop(e.tarifa), cop(e.valor)]) }}
          >
            <ColumnChart
              data={fijoEstrato.map((e) => ({ label: `E${e.estrato}`, full: `Estrato ${e.estrato} · ${cop(e.tarifa)}/mes · ${cop(e.valor)} en total`, values: [e.usuarios], colors: [CHART.serie1] }))}
              series={[{ name: 'Predios', color: CHART.serie1 }]}
              format={(n) => num(n)}
              showTotals
              height={220}
            />
          </ChartCard>
        ) : <ChartCard
          title="Distribución del consumo"
          subtitle="Usuarios por rango de m³ en el último periodo"
          legend={<Legend items={[{ label: 'Normal', color: CHART.serie1 }, { label: `Alto (> ${UMBRAL_ALTO} m³)`, color: CHART.critico }]} />}
          table={{ columns: ['Rango (m³)', 'Usuarios'], rows: dist.map((d) => [d.label, d.usuarios]) }}
        >
          <ColumnChart
            data={dist.map((d) => ({ label: d.label, full: `${d.label} m³`, values: [d.usuarios], colors: [d.alto ? CHART.critico : CHART.serie1] }))}
            series={[{ name: 'Usuarios', color: CHART.serie1 }]}
            format={(n) => num(n)}
            showTotals
            height={220}
          />
        </ChartCard>}

        <ChartCard
          title="Morosidad por estrato"
          subtitle="% de usuarios con facturas vencidas"
          table={{ columns: ['Estrato', 'Usuarios', 'Morosidad', 'Cartera'], rows: estratos.map((e) => [`Estrato ${e.estrato}`, e.usuarios, pct(e.morosidad, 1), cop(e.cartera)]) }}
        >
          <BarList data={estratos.map((e) => ({ label: `Estrato ${e.estrato}`, value: e.morosidad, hint: `${e.usuarios} usuarios` }))} format={(n) => pct(n, 1)} max={Math.max(0.25, ...estratos.map((e) => e.morosidad))} />
          <p className="text-[11px] text-gray-400 mt-4">Sirve para focalizar campañas de cobro y acuerdos de pago.</p>
        </ChartCard>

        <section className="card p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-dark leading-tight">Consumos atípicos</h3>
              <p className="text-xs text-gray-500 mt-1">Último consumo ≥ 40% sobre su propio promedio</p>
            </div>
            <span className="badge-bad">{atipicos.length}</span>
          </div>
          {atipicos.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Sin consumos atípicos en este filtro.</p>
          ) : (
            <ul className="divide-y divide-gray-100 -mx-1">
              {atipicos.slice(0, 6).map((a) => (
                <li key={a.usuario.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark truncate">{a.usuario.nombre}</p>
                    <p className="text-[11px] text-gray-400">{ubicacion(a.usuario)} · prom. {num(a.promedio, 1)} m³</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-dark tabular-nums">{a.actual} m³</p>
                    <span className="badge-bad">▲ {pct(a.variacion)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/usuarios" className="mt-auto pt-4 text-xs font-semibold text-secondary hover:underline no-underline">Revisar en Usuarios →</Link>
        </section>
      </div>

      <div className="rounded-2xl border border-secondary/15 bg-gradient-to-br from-secondary/5 to-white p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="h-10 w-10 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-dark">Lectura rápida</p>
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
            {barrios[0] ? `${barrios[0].sector} es el sector con mayor consumo promedio (${num(barrios[0].consumoPromedio, 1)} m³).` : ''} La cartera vencida suma {cop(cartera.slice(1).reduce((s, t) => s + t.monto, 0))}
            {cartera[4].facturas > 0 && `, de la cual ${cop(cartera[4].monto)} supera los 90 días`}. {atipicos.length > 0 ? `${atipicos.length} usuario(s) muestran un salto de consumo que puede indicar fugas.` : 'No hay saltos de consumo relevantes.'}
          </p>
        </div>
      </div>
    </div>
  )
}
