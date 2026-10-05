import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { BARRIOS, COSTO_RECONEXION } from '../data/constants'
import type { Usuario } from '../data/types'
import type { Resumen } from '../data/billing'
import WhatsAppIcon from '../components/WhatsAppIcon'
import Ico from '../components/ui/Icon'
import { cop, fechaCorta } from '../utils/format'

type Segmento = { id: string; nombre: string; filtro: (u: Usuario, r: Resumen, fugas: Set<string>) => boolean }
type Plantilla = { id: string; nombre: string; texto: string }

const D = { check: 'M5 13l4 4L19 7', search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }

const PLANTILLAS: Plantilla[] = [
  { id: 'recordatorio', nombre: 'Recordatorio de pago', texto: 'Hola {nombre}, te escribe EMCAGUA APC 💧\nTu factura por {deuda} vence el {vence}. Puedes pagar en la oficina o en línea: {portal}\n¡Gracias por estar al día!' },
  { id: 'mora', nombre: 'Aviso de mora', texto: 'Hola {nombre}, te escribe EMCAGUA APC.\nTienes {facturas} factura(s) vencida(s) por {deuda}. Para evitar la suspensión del servicio, ponte al día lo antes posible. Paga en línea: {portal}\nSi ya pagaste, ignora este mensaje.' },
  { id: 'corte', nombre: 'Suspensión programada', texto: 'Hola {nombre}, EMCAGUA APC informa: el {fecha} se suspenderá el servicio de agua en el barrio {barrio} de {horario} por trabajos en la red. Te recomendamos guardar agua. Gracias por tu comprensión.' },
  { id: 'fuga', nombre: 'Fuga detectada', texto: 'Hola {nombre}, EMCAGUA APC te informa: tu medidor ({medidor}) registra paso de agua todo el tiempo, incluso en la madrugada. Puede haber una fuga en tu casa (tanque, sanitario o tubería). Revísala para no pagar agua que no usas. Si necesitas ayuda, responde este mensaje.' },
  { id: 'reconexion', nombre: 'Servicio suspendido', texto: 'Hola {nombre}, tu servicio está suspendido por {facturas} factura(s) pendiente(s) por {deuda}. Para reconectarlo paga la deuda más la reconexión ({reconexion}). Paga en línea: {portal}' },
  { id: 'libre', nombre: 'Mensaje libre', texto: 'Hola {nombre}, EMCAGUA APC te informa: ' },
]

export default function Avisos() {
  const { usuarios, resumen, alarmas } = useData()
  const fugas = useMemo(() => new Set(alarmas.filter((a) => a.tipo === 'fuga').map((a) => a.usuario.id)), [alarmas])
  const segmentos: Segmento[] = [
    { id: 'por-vencer', nombre: 'Factura por vencer', filtro: (u, r) => u.estado === 'Activo' && r.deuda > 0 && !r.vencido },
    { id: 'morosos', nombre: 'En mora', filtro: (u, r) => u.estado === 'Activo' && r.vencido },
    { id: 'cortados', nombre: 'Servicio suspendido', filtro: (u) => u.estado === 'Cortado' },
    { id: 'fugas', nombre: 'Con fuga detectada', filtro: (u) => fugas.has(u.id) },
    ...BARRIOS.map((b) => ({ id: `b-${b}`, nombre: `Barrio ${b}`, filtro: (u: Usuario) => u.barrio === b && u.estado === 'Activo' })),
    { id: 'todos', nombre: 'Todos los activos', filtro: (u) => u.estado === 'Activo' },
  ]
  const [segId, setSegId] = useState('morosos')
  const [plantId, setPlantId] = useState('mora')
  const [texto, setTexto] = useState(PLANTILLAS[1].texto)
  const [vars, setVars] = useState({ fecha: '', horario: '8:00 a. m. a 2:00 p. m.' })
  const [enviados, setEnviados] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')

  const seg = segmentos.find((s) => s.id === segId)!
  const lista = usuarios.filter((u) => seg.filtro(u, resumen(u), fugas)).filter((u) => !q || u.nombre.toLowerCase().includes(q.toLowerCase()))
  const portal = `${window.location.origin}/portal`

  const mensaje = (u: Usuario) => {
    const r = resumen(u)
    return texto
      .replace(/\{nombre\}/g, u.nombre.split(' ')[0])
      .replace(/\{deuda\}/g, cop(r.deuda))
      .replace(/\{facturas\}/g, String(r.pagosDebe))
      .replace(/\{vence\}/g, r.pendientes[0] ? fechaCorta(r.pendientes[0].vencimiento) : '—')
      .replace(/\{barrio\}/g, u.barrio)
      .replace(/\{medidor\}/g, u.medidor)
      .replace(/\{reconexion\}/g, cop(COSTO_RECONEXION))
      .replace(/\{portal\}/g, portal)
      .replace(/\{fecha\}/g, vars.fecha || '[fecha]')
      .replace(/\{horario\}/g, vars.horario || '[horario]')
  }
  const enlace = (u: Usuario) => {
    const t = u.telefono.replace(/\D/g, '')
    return `https://wa.me/${t.startsWith('57') ? t : `57${t}`}?text=${encodeURIComponent(mensaje(u))}`
  }
  const elegirPlantilla = (id: string) => { setPlantId(id); setTexto(PLANTILLAS.find((p) => p.id === id)!.texto) }
  const hechos = lista.filter((u) => enviados.has(`${plantId}-${u.id}`)).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Comunicaciones</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Avisos por WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-2">Elige a quién, escoge el mensaje y envíalo personalizado a cada usuario, con su nombre, su deuda y el enlace para pagar en línea.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-5 items-start">
        <div className="space-y-4">
          <section className="card p-5">
            <label className="field-label">¿A quién?</label>
            <div className="flex flex-wrap gap-2">
              {segmentos.map((s) => { const n = usuarios.filter((u) => s.filtro(u, resumen(u), fugas)).length; return <button key={s.id} onClick={() => setSegId(s.id)} className={segId === s.id ? 'chip-on' : 'chip'}>{s.nombre} · {n}</button> })}
            </div>
          </section>
          <section className="card p-5 space-y-3">
            <label className="field-label">Mensaje</label>
            <select value={plantId} onChange={(e) => elegirPlantilla(e.target.value)} className="field">{PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={7} className="field py-2.5 h-auto text-sm" />
            {/\{fecha\}|\{horario\}/.test(texto) && (
              <div className="grid grid-cols-2 gap-2">
                <input value={vars.fecha} onChange={(e) => setVars({ ...vars, fecha: e.target.value })} placeholder="Fecha (ej: jueves 8 de octubre)" className="field text-sm" />
                <input value={vars.horario} onChange={(e) => setVars({ ...vars, horario: e.target.value })} placeholder="Horario" className="field text-sm" />
              </div>
            )}
            <p className="text-[11px] text-gray-500">Datos que se llenan solos: {'{nombre} {deuda} {facturas} {vence} {barrio} {medidor} {portal}'}</p>
          </section>
          <p className="text-xs text-gray-500 flex gap-2 px-1"><Ico d={D.info} className="w-4 h-4 shrink-0" />Cada envío abre WhatsApp con el mensaje listo y se manda con un toque. El envío 100 % automático necesita la API de WhatsApp Business, que se conecta cuando exista el backend.</p>
        </div>

        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <p className="font-bold text-dark">{lista.length} destinatario(s)</p>
              <div className="flex items-center gap-2 mt-1"><div className="h-1.5 w-40 rounded-full bg-gray-soft overflow-hidden"><div className="h-full bg-[#25D366]" style={{ width: `${lista.length ? (hechos / lista.length) * 100 : 0}%` }} /></div><span className="text-xs text-gray-500">{hechos} enviados</span></div>
            </div>
            <div className="relative"><Ico d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="field h-10 pl-9 w-48" /></div>
          </div>
          {lista[0] && (
            <div className="px-5 py-4 bg-[#ECE5DD] border-b border-gray-100">
              <p className="text-[11px] text-gray-600 mb-1.5">Vista previa para {lista[0].nombre}:</p>
              <div className="max-w-md rounded-xl rounded-tl-sm bg-white px-3 py-2 text-sm text-gray-800 whitespace-pre-line shadow-sm">{mensaje(lista[0])}</div>
            </div>
          )}
          <ul className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
            {lista.map((u) => {
              const r = resumen(u)
              const k = `${plantId}-${u.id}`
              const hecho = enviados.has(k)
              return (
                <li key={u.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-dark truncate">{u.nombre}</p>
                    <p className="text-xs text-gray-400">{u.telefono} · {u.barrio}{r.deuda > 0 ? ` · debe ${cop(r.deuda)}` : ''}</p>
                  </div>
                  {hecho && <span className="badge-ok"><Ico d={D.check} className="w-3 h-3" /> Enviado</span>}
                  <a href={enlace(u)} target="_blank" rel="noreferrer" onClick={() => setEnviados((s) => new Set(s).add(k))} className={`h-9 px-3 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${hecho ? 'bg-gray-300 text-white hover:bg-gray-400' : 'bg-[#25D366] text-white hover:bg-[#1ebe5a]'}`}><WhatsAppIcon className="w-4 h-4" /> {hecho ? 'Reenviar' : 'Enviar'}</a>
                </li>
              )
            })}
            {lista.length === 0 && <li className="p-10 text-center text-sm text-gray-500">Nadie en este grupo.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
