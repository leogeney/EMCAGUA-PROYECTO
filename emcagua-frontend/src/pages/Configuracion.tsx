import { useState } from 'react'
import { CONFIG_INICIAL, guardarConfig, lineaContacto, useConfig, type Config } from '../data/config'
import { useToast } from '../components/ui/Toast'
import SectoresBarrios from '../components/SectoresBarrios'
import { Interruptor } from '../components/ModoSinMedidores'
import Respaldos from '../components/Respaldos'
import { isAdmin } from '../utils/session'
import { MODO_API } from '../data/api'
import { cop, pct } from '../utils/format'

type CampoTexto = { k: keyof Config; label: string; placeholder?: string; ancho?: boolean }

const EMPRESA: CampoTexto[] = [
  { k: 'nombre', label: 'Nombre corto' },
  { k: 'nit', label: 'NIT', placeholder: 'Ej: 807.000.000-1' },
  { k: 'razon', label: 'Razón social / descripción', ancho: true },
  { k: 'direccion', label: 'Dirección de la oficina', placeholder: 'Ej: Calle 5 # 4-20, Centro' },
  { k: 'ciudad', label: 'Municipio y departamento' },
  { k: 'telefono', label: 'Teléfono', placeholder: 'Ej: 607 000 0000' },
  { k: 'whatsapp', label: 'WhatsApp de atención', placeholder: 'Ej: 300 000 0000' },
  { k: 'correo', label: 'Correo', placeholder: 'Ej: atencion@emcagua.gov.co' },
  { k: 'gerente', label: 'Gerente / representante legal', placeholder: 'Nombre completo' },
  { k: 'horario', label: 'Horario de atención', ancho: true },
  { k: 'urlPublica', label: 'Dirección del sistema en internet (para los QR de verificación)', placeholder: 'Ej: https://emcagua.gov.co · vacío = la dirección actual', ancho: true },
]

export default function Configuracion() {
  const actual = useConfig()
  const toast = useToast()
  const [c, setC] = useState<Config>(actual)
  const cambios = JSON.stringify(c) !== JSON.stringify(actual)
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setC((x) => ({ ...x, [k]: v }))
  const num = (k: 'reconexion' | 'umbralAlto' | 'baseCaja' | 'cobroFijoEstrato1' | 'cobroFijoEstrato2' | 'cobroFijoEstrato3', label: string, sufijo: string, ayuda: string) => (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative"><input type="number" min={0} value={c[k]} onChange={(e) => set(k, Number(e.target.value) || 0)} className="field pr-14 tabular-nums" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{sufijo}</span></div>
      <p className="text-[11px] text-gray-500 mt-1">{ayuda}</p>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Administración</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Configuración</h1>
          <p className="text-sm text-gray-500 mt-2">Datos de la empresa que salen en documentos, piezas de redes y el portal, y los parámetros con los que trabaja el sistema.</p>
        </div>
        <div className="flex gap-2">
          <button disabled={!cambios} onClick={() => setC(actual)} className="btn-secondary">Descartar</button>
          <button disabled={!cambios} onClick={async () => { try { await guardarConfig(c); toast('Configuración guardada', 'Los documentos y avisos nuevos ya usan estos datos.') } catch (e) { toast('No se guardó la configuración', e instanceof Error ? e.message : String(e), 'warning') } }} className="btn-primary">Guardar cambios</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold text-dark mb-4">Datos de la empresa</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EMPRESA.map((f) => (
                <div key={f.k} className={f.ancho ? 'sm:col-span-2' : ''}>
                  <label className="field-label">{f.label}</label>
                  <input value={String(c[f.k])} onChange={(e) => set(f.k, e.target.value as never)} placeholder={f.placeholder} className="field" />
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-dark mb-4">Parámetros de operación</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {num('reconexion', 'Valor de la reconexión', '$', 'Se cobra al reactivar un servicio suspendido y aparece en avisos y cartas de cobro.')}
              {num('umbralAlto', 'Consumo alto a partir de', 'm³/mes', 'Por encima de este consumo el sistema marca al usuario como consumo alto.')}
              {num('baseCaja', 'Base inicial de caja', '$', 'Efectivo con el que abre la caja cada día (para el arqueo).')}
              <div>
                <label className="field-label">Meta de agua no contabilizada</label>
                <div className="relative"><input type="number" min={0} max={100} value={Math.round(c.metaIanc * 100)} onChange={(e) => set('metaIanc', (Number(e.target.value) || 0) / 100)} className="field pr-10 tabular-nums" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span></div>
                <p className="text-[11px] text-gray-500 mt-1">Por encima de esta meta el sistema avisa en Mi día y en Pérdidas de agua.</p>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-dark mb-1">Cobro sin medidor</h2>
            <p className="text-xs text-gray-500 mb-4">Los predios sin medidor pagan este valor fijo cada mes según su estrato. Cuando se instale el medidor, se marca en el predio y desde la siguiente factura se cobra por consumo.</p>
            <div className={`rounded-2xl border p-4 mb-4 flex items-start gap-4 ${c.modoSinMedidores ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
              <div className="flex-1">
                <p className="font-semibold text-dark text-sm">Modo sin medidores {c.modoSinMedidores ? '· activo' : '· apagado'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.modoSinMedidores ? 'Todos los predios pagan el valor fijo de su estrato, tengan o no medidor. Úsalo mientras la empresa no tenga medidores instalados.' : 'Los predios con medidor instalado se cobran por consumo (m³); los que no tienen, el valor fijo.'}</p>
              </div>
              <Interruptor activo={c.modoSinMedidores} onChange={(v) => set('modoSinMedidores', v)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {num('cobroFijoEstrato1', 'Estrato 1', '$/mes', 'Valor fijo mensual.')}
              {num('cobroFijoEstrato2', 'Estrato 2', '$/mes', 'Valor fijo mensual.')}
              {num('cobroFijoEstrato3', 'Estrato 3', '$/mes', 'También para estratos 4 a 6.')}
            </div>
          </section>

          <SectoresBarrios />

          {MODO_API && isAdmin() && <Respaldos carpetaExtra={c.carpetaRespaldoExtra} onCarpetaExtra={(v) => set('carpetaRespaldoExtra', v)} />}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4">
          <section className="card p-5">
            <p className="field-label">Así sale el membrete</p>
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-secondary">
                <img src="/logo_circulo.png" alt="" className="h-11 w-11 object-contain" />
                <div className="min-w-0">
                  <p className="font-extrabold text-secondary leading-none">{c.nombre || '—'}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug">{c.razon}</p>
                  <p className="text-[10px] text-gray-500">{c.ciudad}</p>
                  {lineaContacto(c) && <p className="text-[10px] text-gray-500">{lineaContacto(c)}</p>}
                </div>
              </div>
              {!c.nit && <p className="text-[11px] text-amber-700 mt-2">Falta el NIT: los documentos oficiales normalmente lo llevan.</p>}
            </div>
          </section>
          <section className="card p-5 text-sm text-gray-600 space-y-1.5">
            <p className="field-label">Valores actuales</p>
            <p>Reconexión: <b className="text-dark">{cop(actual.reconexion)}</b></p>
            <p>Consumo alto: <b className="text-dark">más de {actual.umbralAlto} m³</b></p>
            <p>Meta de pérdidas: <b className="text-dark">{pct(actual.metaIanc)}</b></p>
            <button onClick={() => setC(CONFIG_INICIAL)} className="text-xs text-gray-400 hover:text-dark pt-2">Volver a los valores de fábrica</button>
          </section>
          <p className="text-[11px] text-gray-400 px-1">Con el servidor encendido, la configuración se guarda en la base de datos y es la misma para todos los computadores.</p>
        </aside>
      </div>
    </div>
  )
}
