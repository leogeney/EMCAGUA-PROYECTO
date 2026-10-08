import { ColumnChart } from './charts/charts'
import { CHART, MESES } from '../data/constants'
import type { Factura } from '../data/types'
import { cop, copCompacto } from '../utils/format'

/**
 * Gráfica para predios SIN medidor (o con el modo sin medidores activo): no hay m³ que mostrar,
 * así que se grafica lo que se le cobró cada mes y si ya lo pagó.
 */
export default function GraficaPagos({ facturas, meses = 6, alto = 170, etiquetaCorta = false }: { facturas: Factura[]; meses?: number; alto?: number; etiquetaCorta?: boolean }) {
  const ult = facturas.slice(-meses)
  if (ult.length === 0) return <p className="text-sm text-gray-500">Todavía no hay facturas. La primera sale en el cierre de este mes.</p>
  const pagadas = ult.filter((f) => f.estado === 'Pagada').length
  const total = ult.reduce((s, f) => s + f.monto, 0)
  const fijo = ult.every((f) => f.fija) && new Set(ult.map((f) => f.monto)).size === 1
  const color = (f: Factura) => (f.estado === 'Pagada' ? CHART.serie1 : f.vencida ? CHART.critico : CHART.serie2)
  return (
    <div>
      <ColumnChart
        data={ult.map((f) => ({
          label: etiquetaCorta ? MESES[f.mes - 1].slice(0, 1) : MESES[f.mes - 1].slice(0, 3),
          full: `${f.periodo} · ${f.estado === 'Pagada' ? 'pagada' : f.vencida ? 'vencida' : 'por pagar'}${f.fija ? ' · cobro fijo' : ` · ${f.consumo} m³`}`,
          values: [f.monto],
          colors: [color(f)],
        }))}
        series={[{ name: 'Valor', color: CHART.serie1 }]}
        format={cop}
        axisFormat={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))}
        height={alto}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CHART.serie1 }} />Pagada</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CHART.serie2 }} />Por pagar</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CHART.critico }} />Vencida</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {fijo ? `Valor fijo de ${cop(ult[0].monto)} al mes` : `${copCompacto(total)} en ${ult.length} meses`} · {pagadas} de {ult.length} pagada(s)
      </p>
    </div>
  )
}
