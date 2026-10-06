import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { useConfig } from '../data/config'
import { buscarDocumento, codigoDocumento, codigoFactura, codigoRecibo, normalizarCodigo, useRegistroDocs } from '../data/verificacion'
import { otrosPredios } from '../data/propietarios'
import Logo from '../components/Logo'
import Ico from '../components/ui/Icon'
import { cop, fecha, fechaCorta, hora } from '../utils/format'

const D = {
  ok: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  mal: 'M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  x: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  qr: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
}

type Resultado =
  | { estado: 'ok' | 'anulado' | 'alterado' | 'no-existe'; titulo: string; tipo: string; filas: [string, ReactNode][]; hoy?: { bien: boolean; texto: string }; anulado?: { ts: number; motivo: string } }

/** Muestra solo los últimos 3 dígitos de la cédula. */
const ocultarCedula = (c: string) => { const d = c.replace(/\D/g, ''); return d ? `•••••${d.slice(-3)}` : '—' }

/** Página pública: cualquiera escanea el QR de una factura, recibo o certificado y comprueba si es auténtico. */
export default function Verificar() {
  const [sp, setSp] = useSearchParams()
  const [doc, setDoc] = useState(sp.get('d') ?? '')
  const [cod, setCod] = useState(sp.get('c') ?? '')
  const consultado = sp.get('d') ? { d: sp.get('d')!.trim().toUpperCase(), c: normalizarCodigo(sp.get('c') ?? '') } : null
  const { pagos, facturas, usuarios, resumen } = useData()
  useRegistroDocs() // se actualiza si se anula un documento en otra pestaña
  const c = useConfig()

  const verificar = (): Resultado | null => {
    if (!consultado) return null
    const { d, c: codigo } = consultado
    const noExiste: Resultado = { estado: 'no-existe', titulo: 'No encontramos este documento', tipo: d, filas: [] }

    if (d.startsWith('PAG-')) {
      const p = pagos.find((x) => x.id === d)
      if (!p) return noExiste
      const real = codigoRecibo(p)
      return {
        estado: real === codigo ? 'ok' : 'alterado', tipo: 'Recibo de pago', titulo: p.id,
        filas: [['Pagado por', p.cliente], ['Suscriptor', p.clienteId], ['Valor', <b key="v">{cop(p.monto)}</b>], ['Fecha', `${fecha(p.timestamp)} · ${hora(p.timestamp)}`], ['Concepto', p.concepto], ['Medio de pago', p.metodo], ['Recibió', p.cajero ?? '—']],
      }
    }
    if (d.startsWith('FAC-')) {
      const f = facturas.find((x) => x.id === d)
      if (!f) return noExiste
      return {
        estado: codigoFactura(f) === codigo ? 'ok' : 'alterado', tipo: 'Factura de servicios', titulo: f.id,
        filas: [['Suscriptor', `${f.cliente} · ${f.clienteId}`], ['Periodo', f.periodo], ['Consumo', `${f.consumo} m³`], ['Valor', <b key="v">{cop(f.monto)}</b>], ['Vence', fechaCorta(f.vencimiento)]],
        hoy: f.estado === 'Pagada' ? { bien: true, texto: `Esta factura ya está PAGADA${f.fechaPago ? ` (${fecha(f.fechaPago)})` : ''}.` } : { bien: false, texto: f.vencida ? 'Esta factura está PENDIENTE y ya venció.' : `Esta factura está PENDIENTE de pago (vence el ${fechaCorta(f.vencimiento)}).` },
      }
    }
    const r = buscarDocumento(d)
    if (!r) return noExiste
    const real = r.codigo || codigoDocumento(r)
    const u = usuarios.find((x) => x.id === r.sujetoId)
    const filas: [string, ReactNode][] = [['Documento', r.nombre], ['A nombre de', r.dirigidoA], ...(u ? [['Cédula', ocultarCedula(u.cedula)] as [string, ReactNode], ['Suscriptor', `${u.id} · ${u.direccion}, ${u.barrio}`] as [string, ReactNode]] : []), ['Expedido', `${fecha(r.ts)} · ${hora(r.ts)}`], ['Expedido por', r.usuario]]
    // Paz y salvo y certificados: además se muestra cómo está HOY el suscriptor
    let hoy: Resultado['hoy']
    if (u && /paz-salvo|cert-suscriptor/.test(r.plantillaId)) {
      const predios = r.plantillaId === 'paz-salvo-propietario' ? [u, ...otrosPredios(usuarios, u)] : [u]
      const deuda = predios.reduce((s, x) => s + resumen(x).deuda, 0)
      hoy = deuda ? { bien: false, texto: `Hoy ${predios.length > 1 ? 'el propietario' : 'el suscriptor'} tiene un saldo pendiente de ${cop(deuda)}. El documento era válido en su fecha, pero la situación cambió.` } : { bien: true, texto: `Hoy ${predios.length > 1 ? `sus ${predios.length} predios siguen` : 'sigue'} a paz y salvo.` }
    }
    if (r.anulado) return { estado: 'anulado', tipo: r.nombre, titulo: r.consecutivo, filas, anulado: { ts: r.anulado.ts, motivo: r.anulado.motivo } }
    return { estado: real === codigo ? 'ok' : 'alterado', tipo: r.nombre, titulo: r.consecutivo, filas, hoy }
  }
  const res = verificar()

  const ESTILO = {
    ok: { caja: 'bg-gradient-to-br from-green-600 to-emerald-500', icono: D.ok, titulo: 'Documento auténtico', texto: 'Fue expedido por la empresa y los datos coinciden con nuestros registros.' },
    anulado: { caja: 'bg-gradient-to-br from-red-700 to-red-500', icono: D.x, titulo: 'Documento ANULADO', texto: 'Este documento fue expedido por la empresa, pero ya no es válido.' },
    alterado: { caja: 'bg-gradient-to-br from-red-700 to-orange-500', icono: D.mal, titulo: 'El código no coincide', texto: 'El documento pudo ser alterado o el código se escribió mal. No lo acepte sin confirmar con la empresa.' },
    'no-existe': { caja: 'bg-gradient-to-br from-amber-600 to-amber-500', icono: D.mal, titulo: 'No encontramos este documento', texto: 'Revise el número. Si lo escaneó de un papel y no aparece, puede ser falso.' },
  }

  return (
    <div className="min-h-screen bg-[#F4F5F3]">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><Logo /><span className="hidden sm:inline text-xs text-gray-400 border-l border-gray-200 pl-3">Verificación de documentos</span></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {res ? (
          <>
            <section className={`rounded-3xl p-6 text-white shadow-lg ${ESTILO[res.estado].caja}`}>
              <div className="flex items-start gap-4">
                <span className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><Ico d={ESTILO[res.estado].icono} className="w-8 h-8" strokeWidth={2} /></span>
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold leading-tight">{ESTILO[res.estado].titulo}</p>
                  <p className="text-sm text-white/85 mt-1">{ESTILO[res.estado].texto}</p>
                  <p className="text-xs text-white/70 mt-2 font-mono">{res.tipo} · {res.titulo}</p>
                </div>
              </div>
            </section>

            {res.anulado && <div className="card p-4 text-sm"><p className="font-semibold text-red-700">Anulado el {fecha(res.anulado.ts)}</p><p className="text-gray-600">Motivo: {res.anulado.motivo}</p></div>}

            {res.filas.length > 0 && res.estado !== 'alterado' && (
              <section className="card overflow-hidden">
                <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Datos registrados en el sistema</p>
                <dl className="divide-y divide-gray-100 text-sm">
                  {res.filas.map(([k, v]) => <div key={k} className="px-5 py-2.5 flex justify-between gap-4"><dt className="text-gray-500">{k}</dt><dd className="text-dark text-right">{v}</dd></div>)}
                </dl>
                <p className="px-5 py-3 text-[11px] text-gray-400 bg-gray-soft/60">Compare estos datos con el papel que tiene en la mano: deben ser iguales.</p>
              </section>
            )}

            {res.hoy && res.estado === 'ok' && (
              <div className={`rounded-2xl px-4 py-3 text-sm border ${res.hoy.bien ? 'bg-green-50 border-green-100 text-green-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                <p className="font-semibold">Situación al día de hoy</p>
                <p>{res.hoy.texto}</p>
              </div>
            )}

            <button onClick={() => { setSp({}); setDoc(''); setCod('') }} className="btn-secondary w-full h-11">Verificar otro documento</button>
          </>
        ) : (
          <section className="card p-6 sm:p-8">
            <span className="h-12 w-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-4"><Ico d={D.qr} className="w-6 h-6" /></span>
            <h1 className="text-2xl font-extrabold text-dark">¿Este documento es real?</h1>
            <p className="text-sm text-gray-500 mt-1 mb-5">Escanee el código QR del documento con la cámara del celular, o escriba el número y el código de seguridad que aparecen junto al QR.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (doc.trim()) setSp({ d: doc.trim().toUpperCase(), c: normalizarCodigo(cod) }) }} className="space-y-3">
              <div><label className="field-label">Número del documento</label><input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Ej: EMC-PS-2026-001, PAG-00045 o FAC-2026-09-10234" className="field h-12 font-mono" /></div>
              <div><label className="field-label">Código de seguridad</label><input value={cod} onChange={(e) => setCod(e.target.value)} placeholder="XXXX-XXXX" className="field h-12 font-mono tracking-widest uppercase" /></div>
              <button className="btn-primary w-full h-12">Verificar</button>
            </form>
          </section>
        )}

        <footer className="text-center text-xs text-gray-500 space-y-1 pt-2">
          <p className="font-semibold text-gray-600">{c.nombre} · {c.ciudad}</p>
          {(c.telefono || c.whatsapp) && <p>¿Dudas? {[c.telefono && `Tel. ${c.telefono}`, c.whatsapp && `WhatsApp ${c.whatsapp}`].filter(Boolean).join(' · ')}</p>}
        </footer>
      </main>
    </div>
  )
}
