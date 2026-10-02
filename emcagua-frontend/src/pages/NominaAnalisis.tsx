import { useMemo, useState } from 'react'
import { useNomina } from '../data/NominaContext'
import { liquidar, type Liquidacion } from '../data/nomina'
import { CHART, MESES } from '../data/constants'
import { AreaChart, BarList, ChartCard, ColumnChart, Legend } from '../components/charts/charts'
import StatTile from '../components/ui/StatTile'
import { cop, copCompacto, num, pct } from '../utils/format'

const ejeM = (n: number) => (n >= 1_000_000 ? `${num(n / 1_000_000, 1)}M` : `${num(n / 1000)}k`)

type Mes = {
  clave: string
  label: string
  full: string
  estado: string
  liqs: Liquidacion[]
  devengado: number
  neto: number
  deducciones: number
  aportes: number
  provisiones: number
  costo: number
  basico: number
  extras: number
  horasExtra: number
  empleados: number
}

export default function NominaAnalisis() {
  const { periodos, empleados, parametros } = useNomina()
  const [area, setArea] = useState<'Todas' | 'Administrativa' | 'Operativa'>('Todas')

  const meses: Mes[] = useMemo(() => {
    return Object.values(periodos)
      .sort((a, b) => a.clave.localeCompare(b.clave))
      .map((p) => {
        const liqs = empleados
          .filter((e) => p.novedades[e.id] && (area === 'Todas' || e.area === area))
          .map((e) => liquidar(e, p.novedades[e.id], parametros))
        const s = (f: (l: Liquidacion) => number) => liqs.reduce((t, l) => t + f(l), 0)
        return {
          clave: p.clave,
          label: MESES[p.mes - 1].slice(0, 3),
          full: `${MESES[p.mes - 1]} ${p.anio}${p.estado !== 'Pagada' ? ` · ${p.estado.toLowerCase()}` : ''}`,
          estado: p.estado,
          liqs,
          devengado: s((l) => l.devengado),
          neto: s((l) => l.neto),
          deducciones: s((l) => l.deducciones),
          aportes: s((l) => l.empleador.total),
          provisiones: s((l) => l.provisiones.total),
          costo: s((l) => l.costoTotal),
          basico: s((l) => l.basico),
          extras: s((l) => l.totalExtras),
          horasExtra: s((l) => l.extras.reduce((t, x) => t + x.horas, 0)),
          empleados: liqs.length,
        }
      })
  }, [periodos, empleados, parametros, area])

  if (meses.length === 0) return <p className="text-sm text-gray-400">Aún no hay nóminas para analizar.</p>

  const ult = meses[meses.length - 1]
  const ant = meses[meses.length - 2]
  const delta = (a: number, b?: number) => (b ? a / b - 1 : 0)
  const totalAnio = meses.filter((m) => m.clave.startsWith(String(new Date().getFullYear()))).reduce((s, m) => s + m.costo, 0)

  // Composición del devengado (mes actual)
  const comp = [
    { label: 'Salario básico', value: ult.liqs.reduce((s, l) => s + l.basico, 0) },
    { label: 'Auxilio de transporte', value: ult.liqs.reduce((s, l) => s + l.auxilio, 0) },
    { label: 'Horas extra y recargos', value: ult.extras },
    { label: 'Comisiones', value: ult.liqs.reduce((s, l) => s + l.comisiones, 0) },
    { label: 'Bonificaciones no salariales', value: ult.liqs.reduce((s, l) => s + l.bonificacion, 0) },
  ].filter((x) => x.value > 0)

  // Deducciones (mes actual)
  const ded = [
    { label: 'Salud trabajador 4%', value: ult.liqs.reduce((s, l) => s + l.salud, 0) },
    { label: 'Pensión trabajador 4%', value: ult.liqs.reduce((s, l) => s + l.pension, 0) },
    { label: 'Fondo de solidaridad', value: ult.liqs.reduce((s, l) => s + l.fsp, 0) },
    { label: 'Préstamos y libranzas', value: ult.liqs.reduce((s, l) => s + l.novedad.prestamo + l.novedad.libranza, 0) },
    { label: 'Retención y otros', value: ult.liqs.reduce((s, l) => s + l.novedad.retencion + l.novedad.otrosDescuentos, 0) },
  ].filter((x) => x.value > 0)

  // Horas extra acumuladas por empleado
  const porEmpleado = new Map<string, { nombre: string; cargo: string; horas: number; valor: number }>()
  for (const m of meses) for (const l of m.liqs) {
    const x = porEmpleado.get(l.empleado.id) ?? { nombre: l.empleado.nombre, cargo: l.empleado.cargo, horas: 0, valor: 0 }
    x.horas += l.extras.reduce((t, e) => t + e.horas, 0)
    x.valor += l.totalExtras
    porEmpleado.set(l.empleado.id, x)
  }
  const topExtras = [...porEmpleado.values()].filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 6)

  // Costo por cargo (mes actual)
  const porCargo = new Map<string, { costo: number; n: number }>()
  for (const l of ult.liqs) {
    const c = porCargo.get(l.empleado.cargo) ?? { costo: 0, n: 0 }
    c.costo += l.costoTotal
    c.n++
    porCargo.set(l.empleado.cargo, c)
  }
  const cargos = [...porCargo.entries()].map(([cargo, v]) => ({ cargo, ...v })).sort((a, b) => b.costo - a.costo)

  const pctExtras = ult.basico ? ult.extras / ult.basico : 0
  const mayorExtra = topExtras[0]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-gray-500">{meses.length} nóminas · {meses[0].full.split(' ·')[0]} a {ult.full.split(' ·')[0]}</p>
        <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
          {(['Todas', 'Administrativa', 'Operativa'] as const).map((a) => (
            <button key={a} onClick={() => setArea(a)} className={`px-3 h-8 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${area === a ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>
              {a === 'Todas' ? 'Todas las áreas' : a}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile label="Costo nómina del mes" value={copCompacto(ult.costo)} delta={ant ? { value: delta(ult.costo, ant.costo), goodWhenUp: false, label: `vs ${ant.full.split(' ·')[0]}` } : undefined} sub={`${ult.empleados} empleados · ${ult.full.split(' ·')[0]}`} />
        <StatTile label="Neto pagado" value={copCompacto(ult.neto)} delta={ant ? { value: delta(ult.neto, ant.neto), goodWhenUp: false, label: 'vs mes anterior' } : undefined} sub={`Promedio ${cop(ult.neto / Math.max(1, ult.empleados))} por empleado`} />
        <StatTile label="Horas extra y recargos" value={copCompacto(ult.extras)} delta={ant ? { value: delta(ult.extras, ant.extras), goodWhenUp: false, label: 'vs mes anterior' } : undefined} sub={`${num(ult.horasExtra)} h · ${pct(pctExtras, 1)} del salario básico`} tone="warning" />
        <StatTile label="Costo acumulado del año" value={copCompacto(totalAnio)} sub={`${meses.filter((m) => m.clave.startsWith(String(new Date().getFullYear()))).length} nóminas registradas · salarios + aportes + provisiones`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard
          className="lg:col-span-2"
          title="Costo de la nómina por mes"
          subtitle="Lo que se paga a los empleados y lo que se paga en aportes y provisiones"
          legend={<Legend items={[{ label: 'Devengado (pago a empleados)', color: CHART.serie1 }, { label: 'Aportes y provisiones', color: CHART.serie2 }]} />}
          table={{ columns: ['Mes', 'Devengado', 'Aportes', 'Provisiones', 'Costo total'], rows: meses.map((m) => [m.full, cop(m.devengado), cop(m.aportes), cop(m.provisiones), cop(m.costo)]) }}
        >
          <ColumnChart
            data={meses.map((m) => ({ label: m.label, full: m.full, values: [m.devengado, m.aportes + m.provisiones] }))}
            series={[{ name: 'Devengado', color: CHART.serie1 }, { name: 'Aportes y provisiones', color: CHART.serie2 }]}
            format={copCompacto}
            axisFormat={ejeM}
            height={260}
          />
        </ChartCard>

        <ChartCard
          title="¿En qué se va el pago del mes?"
          subtitle={`Composición del devengado · ${ult.full.split(' ·')[0]}`}
          table={{ columns: ['Concepto', 'Valor', '%'], rows: comp.map((c) => [c.label, cop(c.value), pct(c.value / Math.max(1, ult.devengado), 1)]) }}
        >
          <BarList data={comp.map((c) => ({ label: c.label, value: c.value, hint: pct(c.value / Math.max(1, ult.devengado), 1) }))} format={copCompacto} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard
          className="lg:col-span-2"
          title="Horas extra y recargos por mes"
          subtitle="Valor pagado en horas extra, nocturnas y dominicales"
          table={{ columns: ['Mes', 'Horas', 'Valor', '% del básico'], rows: meses.map((m) => [m.full, num(m.horasExtra), cop(m.extras), pct(m.basico ? m.extras / m.basico : 0, 1)]) }}
        >
          <AreaChart data={meses.map((m) => ({ label: m.label, full: `${m.full} · ${num(m.horasExtra)} h`, value: m.extras }))} format={cop} axisFormat={ejeM} name="Extras y recargos" color={CHART.serie2} height={240} />
        </ChartCard>

        <ChartCard
          title="Quiénes hacen más horas extra"
          subtitle={`Acumulado de ${meses.length} meses`}
          table={{ columns: ['Empleado', 'Horas', 'Valor'], rows: topExtras.map((x) => [x.nombre, num(x.horas), cop(x.valor)]) }}
        >
          {topExtras.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">Sin horas extra en este filtro.</p> : (
            <BarList data={topExtras.map((x) => ({ label: x.nombre, value: x.valor, hint: `${num(x.horas)} h` }))} format={copCompacto} color={CHART.serie2} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard
          title="Costo total por cargo"
          subtitle={`Salario + aportes + provisiones · ${ult.full.split(' ·')[0]}`}
          table={{ columns: ['Cargo', 'Personas', 'Costo'], rows: cargos.map((c) => [c.cargo, c.n, cop(c.costo)]) }}
        >
          <BarList data={cargos.map((c) => ({ label: c.cargo, value: c.costo, hint: c.n > 1 ? `${c.n} personas` : undefined }))} format={copCompacto} />
        </ChartCard>

        <ChartCard
          title="Deducciones del mes"
          subtitle="Lo que se descuenta a los empleados"
          table={{ columns: ['Concepto', 'Valor'], rows: ded.map((d) => [d.label, cop(d.value)]) }}
        >
          <BarList data={ded.map((d) => ({ label: d.label, value: d.value }))} format={copCompacto} color="#6b8a86" />
          <div className="mt-4 rounded-xl bg-gray-soft px-3 py-2.5 flex justify-between text-xs">
            <span className="text-gray-500">Total deducciones</span>
            <span className="font-bold text-dark tabular-nums">{cop(ult.deducciones)}</span>
          </div>
        </ChartCard>
      </div>

      <div className="rounded-2xl border border-secondary/15 bg-gradient-to-br from-secondary/5 to-white p-5 flex gap-4">
        <span className="h-10 w-10 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        </span>
        <div>
          <p className="text-sm font-bold text-dark">Lectura rápida</p>
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
            El costo real de la nómina de {ult.full.split(' ·')[0]} es {cop(ult.costo)}: por cada $100 que recibe un empleado, la empresa paga {cop(((ult.aportes + ult.provisiones) / Math.max(1, ult.devengado)) * 100)} adicionales en aportes y provisiones.
            {' '}Las horas extra y recargos equivalen al {pct(pctExtras, 1)} del salario básico
            {mayorExtra ? `; ${mayorExtra.nombre} (${mayorExtra.cargo.toLowerCase()}) es quien más acumula (${num(mayorExtra.horas)} h).` : '.'}
            {pctExtras > 0.1 && ' Si las extras se mantienen altas, puede valer la pena revisar turnos o contratar apoyo.'}
          </p>
        </div>
      </div>
    </>
  )
}
