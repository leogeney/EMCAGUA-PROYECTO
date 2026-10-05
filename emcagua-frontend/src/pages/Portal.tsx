import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { usePqr } from '../data/PqrContext'
import { facturasDe, nombrePeriodo } from '../data/billing'
import { CHART, MESES } from '../data/constants'
import { diasHabilesRestantes, sugerirCategoria } from '../data/pqr'
import { valorPeriodo } from '../data/tarifa'
import type { Factura, Pqr, TipoPqr, Usuario } from '../data/types'
import { ColumnChart } from '../components/charts/charts'
import Logo from '../components/Logo'
import Modal from '../components/ui/Modal'
import Ico from '../components/ui/Icon'
import { useConfig } from '../data/config'
import { cop, fecha, fechaCorta } from '../utils/format'

const D = {
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  check: 'M5 13l4 4L19 7',
  out: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chat: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  drop: 'M12 21a7 7 0 007-7c0-4-7-11-7-11S5 10 5 14a7 7 0 007 7z',
}

/** Portal público para los suscriptores: consultar, pagar y radicar PQR sin ir a la oficina. */
export default function Portal() {
  const { usuarios } = useData()
  const [id, setId] = useState('')
  const [tel, setTel] = useState('')
  const [error, setError] = useState('')
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const u = usuarios.find((x) => x.id === usuarioId)

  const entrar = () => {
    const x = usuarios.find((y) => y.id === id.trim())
    if (!x || x.telefono.replace(/\D/g, '').slice(-4) !== tel.trim()) { setError('El código o los últimos 4 dígitos del celular no coinciden.'); return }
    setError(''); setUsuarioId(x.id)
  }

  return (
    <div className="min-h-screen bg-[#F4F5F3]">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><Logo /><span className="hidden sm:inline text-xs text-gray-400 border-l border-gray-200 pl-3">Oficina virtual</span></div>
          {u ? <button onClick={() => { setUsuarioId(null); setId(''); setTel('') }} className="btn-sm"><Ico d={D.out} /> Salir</button> : <Link to="/login" className="text-xs text-gray-400 hover:text-dark">Acceso funcionarios</Link>}
        </div>
      </header>

      {!u ? (
        <main className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-3">Oficina virtual EMCAGUA</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-dark leading-tight">Tu agua, desde el celular</h1>
            <p className="text-gray-600 mt-3">Consulta tu factura, págala en línea, revisa tu consumo y radica peticiones o reclamos sin hacer fila.</p>
            <ul className="mt-6 space-y-2 text-sm text-gray-700">
              {['Paga con PSE, Nequi o Daviplata', 'Mira cuánta agua gastas cada mes', 'Radica una PQR y sigue su respuesta'].map((t) => <li key={t} className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/15 text-primary-700 flex items-center justify-center"><Ico d={D.check} className="w-3.5 h-3.5" /></span>{t}</li>)}
            </ul>
          </div>
          <div className="card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-dark mb-1">Ingresa</h2>
            <p className="text-sm text-gray-500 mb-5">Con el código de suscriptor que aparece en tu factura.</p>
            <div className="space-y-3">
              <div><label className="field-label">Código de suscriptor</label><input value={id} onChange={(e) => setId(e.target.value)} placeholder="Ej: 10237" className="field h-12 text-lg tabular-nums" inputMode="numeric" /></div>
              <div><label className="field-label">Últimos 4 dígitos de tu celular</label><input value={tel} onChange={(e) => setTel(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(e) => e.key === 'Enter' && entrar()} placeholder="••••" className="field h-12 text-lg tracking-[0.4em] tabular-nums" inputMode="numeric" /></div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button onClick={entrar} className="btn-primary w-full h-12">Consultar</button>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5"><Ico d={D.lock} className="w-3.5 h-3.5" /> Solo tú ves la información de tu cuenta.</p>
            </div>
          </div>
        </main>
      ) : (
        <Cuenta u={u} />
      )}
      <Pie />
    </div>
  )
}

function Cuenta({ u }: { u: Usuario }) {
  const { resumen, pagarFactura } = useData()
  const { pqrs, radicar } = usePqr()
  const r = resumen(u)
  const pendientes = facturasDe(u).filter((f) => f.estado === 'Pendiente')
  const hist = u.historial.slice(-6)
  const misPqr = pqrs.filter((p) => p.suscriptorId === u.id)
  const [pagar, setPagar] = useState<Factura[] | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pqrAbierta, setPqrAbierta] = useState(false)
  const ultima = facturasDe(u).slice(-1)[0]

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      <div>
        <p className="text-sm text-gray-500">Hola,</p>
        <h1 className="text-2xl font-extrabold text-dark">{u.nombre}</h1>
        <p className="text-xs text-gray-400">Suscriptor {u.id} · Medidor {u.medidor} · {u.barrio}</p>
      </div>

      {ok && <div className="rounded-2xl bg-green-50 border border-green-100 text-green-900 px-4 py-3 text-sm flex items-center gap-2"><Ico d={D.check} className="w-4 h-4" /> {ok}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
        <section className={`rounded-3xl p-6 text-white shadow-lg ${r.deuda > 0 ? (r.vencido ? 'bg-gradient-to-br from-[#7A1F12] to-[#C2410C]' : 'bg-gradient-to-br from-secondary-700 to-secondary') : 'bg-gradient-to-br from-primary-700 to-primary'}`}>
          <p className="text-sm text-white/80">{r.deuda > 0 ? (r.vencido ? 'Tienes saldo vencido' : 'Valor a pagar') : 'Estás al día'}</p>
          <p className="text-4xl font-extrabold tabular-nums mt-1">{cop(r.deuda)}</p>
          {pendientes[0] && <p className="text-sm text-white/80 mt-1">{pendientes.length} factura(s) · {r.vencido ? 'venció' : 'vence'} el {fechaCorta(pendientes[0].vencimiento)}</p>}
          {u.estado === 'Cortado' && <p className="mt-3 text-sm bg-white/15 rounded-xl px-3 py-2">Tu servicio está suspendido. Al pagar, la empresa programa la reconexión.</p>}
          {r.deuda > 0 ? <button onClick={() => setPagar(pendientes)} className="mt-5 h-12 w-full rounded-xl bg-white text-dark font-bold hover:bg-white/90">Pagar en línea</button> : <p className="mt-5 text-sm">¡Gracias por pagar a tiempo! 💧</p>}
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-dark mb-1">Tu consumo</h2>
          <p className="text-xs text-gray-500 mb-3">Últimos {hist.length} meses · promedio {Math.round(r.consumoPromedio)} m³</p>
          <ColumnChart data={hist.map((h, i) => ({ label: MESES[h.mes - 1].slice(0, 3), full: nombrePeriodo(h.mes, h.anio), values: [h.consumo], colors: [i === hist.length - 1 ? CHART.serie1 : '#b9d9d4'] }))} series={[{ name: 'Consumo', color: CHART.serie1 }]} format={(n) => `${n} m³`} height={170} />
          {r.consumoActual > r.consumoPromedio * 1.5 && r.consumoPromedio > 0 && <p className="text-xs mt-2 rounded-xl bg-amber-50 text-amber-900 px-3 py-2">Tu último consumo fue más alto de lo normal. Revisa si hay fugas: cierra todas las llaves y mira si el medidor sigue girando.</p>}
        </section>
      </div>

      {ultima && (
        <section className="card p-5">
          <h2 className="font-bold text-dark mb-3">Detalle de tu última factura · {ultima.periodo}</h2>
          <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
            {valorPeriodo(ultima.consumo, ultima.estrato, ultima.mes, ultima.anio).lineas.map((l) => (
              <div key={l.concepto} className={`flex justify-between px-4 py-2 ${l.tipo === 'total' ? 'font-bold text-dark bg-gray-soft' : ''}`}><span className={l.tipo === 'subsidio' ? 'text-green-700' : l.tipo === 'total' ? '' : 'text-gray-500'}>{l.concepto}</span><span className="tabular-nums">{cop(l.valor)}</span></div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Estado: <b>{ultima.estado}</b>{ultima.fechaPago ? ` el ${fecha(ultima.fechaPago)}` : ''}</p>
        </section>
      )}

      <section className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="font-bold text-dark">Peticiones, quejas y reclamos</h2>
          <button onClick={() => setPqrAbierta(true)} className="btn-primary h-10 text-sm whitespace-nowrap"><Ico d={D.chat} /> Radicar PQR</button>
        </div>
        {misPqr.length === 0 ? <p className="text-sm text-gray-500">No tienes PQR radicadas.</p> : (
          <ul className="divide-y divide-gray-100">
            {misPqr.map((p) => <li key={p.radicado} className="py-3 text-sm flex flex-col sm:flex-row sm:justify-between gap-1.5 sm:gap-3"><div className="min-w-0"><p className="font-semibold text-dark">{p.radicado} · {p.categoria}</p><p className="text-gray-500 line-clamp-2 sm:truncate">{p.descripcion}</p>{p.respuesta && <p className="text-xs text-green-800 mt-1">Respuesta: {p.respuesta}</p>}</div><div className="sm:text-right shrink-0 flex sm:block items-center gap-2"><span className={p.estado === 'Respondida' || p.estado === 'Cerrada' ? 'badge-ok' : 'badge-warn'}>{p.estado}</span>{p.estado !== 'Respondida' && p.estado !== 'Cerrada' && <p className="text-[11px] text-gray-400 sm:mt-1">Respuesta en máx. {Math.max(0, diasHabilesRestantes(p.vence))} días hábiles</p>}</div></li>)}
          </ul>
        )}
      </section>

      {pagar && <PagoEnLinea facturas={pagar} onClose={() => setPagar(null)} onPagado={(ref) => { pagar.forEach((f) => pagarFactura(f.id, { metodo: 'En línea', comprobante: ref })); setPagar(null); setOk(`Pago aprobado. Comprobante ${ref}. ¡Gracias!`) }} />}
      {pqrAbierta && <NuevaPqr u={u} onClose={() => setPqrAbierta(false)} onRadicar={(p) => { const x = radicar(p); setPqrAbierta(false); setOk(`Radicamos tu ${x.tipo.toLowerCase()} con el número ${x.radicado}. Te responderemos en máximo 15 días hábiles.`) }} />}
    </main>
  )
}

function PagoEnLinea({ facturas, onClose, onPagado }: { facturas: Factura[]; onClose: () => void; onPagado: (ref: string) => void }) {
  const total = facturas.reduce((s, f) => s + f.monto, 0)
  const [medio, setMedio] = useState<'PSE' | 'Nequi' | 'Daviplata'>('PSE')
  const [banco, setBanco] = useState('Bancolombia')
  const [paso, setPaso] = useState<'elegir' | 'procesando'>('elegir')
  const pagar = () => { setPaso('procesando'); setTimeout(() => onPagado(`${medio.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-8)}`), 1400) }
  return (
    <Modal open onClose={onClose} size="sm" title="Pagar en línea" subtitle={`${facturas.length} factura(s) · ${cop(total)}`}>
      {paso === 'procesando' ? (
        <div className="p-10 text-center"><div className="mx-auto h-10 w-10 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" /><p className="mt-4 text-sm text-gray-600">Procesando el pago…</p></div>
      ) : (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">{(['PSE', 'Nequi', 'Daviplata'] as const).map((m) => <button key={m} onClick={() => setMedio(m)} className={`h-12 rounded-xl border-2 font-bold text-sm ${medio === m ? 'border-secondary text-secondary bg-secondary/5' : 'border-gray-200 text-gray-600'}`}>{m}</button>)}</div>
          {medio === 'PSE' && <div><label className="field-label">Banco</label><select value={banco} onChange={(e) => setBanco(e.target.value)} className="field">{['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA', 'Banco Agrario', 'Banco Caja Social'].map((b) => <option key={b}>{b}</option>)}</select></div>}
          <ul className="text-sm rounded-xl bg-gray-soft divide-y divide-gray-200">{facturas.map((f) => <li key={f.id} className="flex justify-between px-3 py-2"><span>{f.periodo}</span><b className="tabular-nums">{cop(f.monto)}</b></li>)}</ul>
          <button onClick={pagar} className="btn-primary w-full h-12">Pagar {cop(total)}</button>
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Modo demostración: no se cobra dinero real. En producción este paso redirige a la pasarela de pagos contratada por la empresa.</p>
        </div>
      )}
    </Modal>
  )
}

function NuevaPqr({ u, onClose, onRadicar }: { u: Usuario; onClose: () => void; onRadicar: (p: Omit<Pqr, 'radicado' | 'estado' | 'radicadaEn' | 'vence' | 'historial'>) => void }) {
  const [tipo, setTipo] = useState<TipoPqr>('Reclamo')
  const [texto, setTexto] = useState('')
  return (
    <Modal open onClose={onClose} title="Radicar PQR" subtitle="Cuéntanos qué pasa. Te respondemos en máximo 15 días hábiles."
      footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancelar</button><button disabled={texto.trim().length < 15} onClick={() => onRadicar({ tipo, categoria: sugerirCategoria(texto), canal: 'Portal web', suscriptorId: u.id, nombre: u.nombre, telefono: u.telefono, barrio: u.barrio, descripcion: texto.trim() })} className="btn-primary">Radicar</button></div>}>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2">{(['Petición', 'Queja', 'Reclamo', 'Sugerencia'] as TipoPqr[]).map((t) => <button key={t} onClick={() => setTipo(t)} className={tipo === t ? 'chip-on' : 'chip'}>{t}</button>)}</div>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} placeholder="Ej: la factura de este mes llegó muy alta y en la casa no ha cambiado nada" className="field py-2.5 h-auto" />
        <p className="text-xs text-gray-400">Mínimo 15 caracteres.</p>
      </div>
    </Modal>
  )
}

/** Pie con los datos de contacto de Configuración. */
function Pie() {
  const c = useConfig()
  const wa = c.whatsapp.replace(/\D/g, '')
  return (
    <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-500 space-y-1.5">
      {wa && <a href={`https://wa.me/57${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#25D366] text-white text-sm font-semibold mb-2">Escríbenos por WhatsApp</a>}
      <p className="font-semibold text-gray-600">{c.nombre} · {c.ciudad}</p>
      {(c.direccion || c.telefono) && <p>{[c.direccion, c.telefono && `Tel. ${c.telefono}`].filter(Boolean).join(' · ')}</p>}
      {c.horario && <p>Atención: {c.horario}</p>}
    </footer>
  )
}
