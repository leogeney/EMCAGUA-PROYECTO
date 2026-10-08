import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Qr from './Qr'
import { useConfig, lineaContacto } from '../data/config'
import { detalleFactura } from '../data/tarifa'
import { generacionPeriodo } from '../data/billing'
import { MESES } from '../data/constants'
import { codigoFactura, codigoRecibo, urlVerificacion } from '../data/verificacion'
import type { Factura, Pago, Usuario } from '../data/types'
import { cop, fecha, fechaCorta, hora } from '../utils/format'

/**
 * Factura para imprimir en MEDIA HOJA carta (21,6 × 14 cm): ocupa la mitad de arriba
 * y deja una línea de corte para reutilizar la otra mitad.
 */
export function FacturaMediaHoja({ f, u }: { f: Factura; u?: Usuario }) {
  const c = useConfig()
  const det = detalleFactura(f)
  const lineas = det.lineas.filter((l) => l.tipo !== 'total')
  const clave = f.anio * 12 + f.mes
  const hist = (u?.historial ?? []).filter((h) => h.anio * 12 + h.mes <= clave && h.estado !== 'Suspendido').slice(-6)
  const medido = !f.fija && hist.some((h) => !h.fija)
  const max = Math.max(1, ...hist.map((h) => h.consumo))
  const codigo = codigoFactura(f)
  const estado = f.estado === 'Pagada' ? 'PAGADA' : f.vencida ? 'VENCIDA' : 'POR PAGAR'

  return (
    <div className="fmh">
      <div className="fmh-hoja">
        {/* Encabezado */}
        <div className="fmh-head">
          <div className="fmh-marca">
            <img src="/logo_circulo.png" alt="" />
            <div>
              <b>{c.nombre}</b>
              <span className="fmh-sub">{c.razon}</span>
              <span>{[c.ciudad, lineaContacto(c)].filter(Boolean).join(' · ')}</span>
            </div>
          </div>
          <div className="fmh-num">
            <span className="fmh-tit">Factura de servicios públicos</span>
            <b>{f.id}</b>
            <span className={`fmh-estado ${f.estado === 'Pagada' ? 'ok' : f.vencida ? 'mal' : 'pend'}`}>{estado}{f.fechaPago ? ` · ${fecha(f.fechaPago)}` : ''}</span>
          </div>
        </div>

        {/* Datos */}
        <div className="fmh-datos">
          <div><span>Suscriptor</span><b>{f.cliente}</b><small>Código {f.clienteId} · Estrato {f.estrato}</small></div>
          <div><span>Ubicación</span><b>{u?.direccion || '—'}</b><small>{f.barrio}</small></div>
          <div><span>Periodo</span><b>{f.periodo}</b><small>Emitida {fechaCorta(generacionPeriodo(f.mes, f.anio))}</small></div>
          <div className="fmh-vence"><span>Pague antes de</span><b>{fechaCorta(f.vencimiento)}</b><small>{f.fija ? 'Sin medidor · cobro fijo' : u?.medidor ? `Medidor ${u.medidor}` : ''}</small></div>
        </div>

        {/* Cuerpo: detalle + consumo */}
        <div className="fmh-cuerpo">
          <table className="fmh-tabla">
            <tbody>
              <tr><td>Consumo del periodo</td><td>{f.fija ? 'Cobro fijo mensual' : `${f.consumo} m³`}</td></tr>
              {lineas.map((l) => (
                <tr key={l.concepto} className={l.tipo === 'subsidio' ? 'sub' : ''}><td>{l.concepto}{l.cantidad ? ` · ${l.cantidad}` : ''}</td><td>{cop(l.valor)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td>TOTAL A PAGAR</td><td>{cop(f.monto)}</td></tr></tfoot>
          </table>

          <div className="fmh-lado">
            {medido ? (
              <div className="fmh-graf">
                <span className="fmh-lbl">Consumo últimos meses (m³)</span>
                <div className="fmh-barras">
                  {hist.map((h) => (
                    <div key={`${h.anio}-${h.mes}`} className={h.anio * 12 + h.mes === clave ? 'act' : ''}>
                      <em>{h.consumo}</em>
                      <i style={{ height: `${Math.max(4, (h.consumo / max) * 100)}%` }} />
                      <span>{MESES[h.mes - 1].slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="fmh-nota"><b>Predio sin medidor</b>Se cobra el valor fijo mensual de su estrato. Cuando se instale el medidor, se cobrará por consumo.</div>
            )}
            <div className="fmh-qr">
              <Qr value={urlVerificacion(f.id, codigo)} size={70} />
              <div><b>{codigo}</b>Escanee para verificar la factura y su pago.</div>
            </div>
          </div>
        </div>

        <div className="fmh-pie">
          Pague en la oficina de {c.nombre}{c.horario ? ` (${c.horario})` : ''} o en línea en la oficina virtual. Si la factura vence, se suspende el servicio; reconexión {cop(c.reconexion)}.
        </div>
      </div>
      <div className="fmh-corte">✂ - - - - - - - - - - - - - - - - - - - - recorte aquí - - - - - - - - - - - - - - - - - - - - ✂</div>
    </div>
  )
}

/**
 * Imprime cualquier contenido en media hoja carta. Se monta solo mientras se imprime: el resto
 * de la página se oculta, así no salen hojas en blanco ni el modal recortado.
 */
export function ImprimirMediaHoja({ children, onListo }: { children: ReactNode; onListo: () => void }) {
  useEffect(() => {
    document.body.classList.add('imprimiendo-factura')
    const fin = () => { document.body.classList.remove('imprimiendo-factura'); onListo() }
    window.addEventListener('afterprint', fin, { once: true })
    // Un momento para que carguen el logo y el QR antes de abrir el diálogo
    const t = setTimeout(() => window.print(), 250)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', fin); document.body.classList.remove('imprimiendo-factura') }
  }, [onListo])
  return createPortal(<div id="zona-impresion">{children}</div>, document.body)
}

export function ImprimirFactura({ f, u, onListo }: { f: Factura; u?: Usuario; onListo: () => void }) {
  return <ImprimirMediaHoja onListo={onListo}><FacturaMediaHoja f={f} u={u} /></ImprimirMediaHoja>
}

/** Recibo de caja en media hoja carta, con línea de corte. */
export function ReciboMediaHoja({ p }: { p: Pago }) {
  const c = useConfig()
  const codigo = codigoRecibo(p)
  return (
    <div className="fmh">
      <div className="fmh-hoja">
        <div className="fmh-head">
          <div className="fmh-marca">
            <img src="/logo_circulo.png" alt="" />
            <div>
              <b>{c.nombre}</b>
              <span className="fmh-sub">{c.razon}</span>
              <span>{[c.ciudad, lineaContacto(c)].filter(Boolean).join(' · ')}</span>
            </div>
          </div>
          <div className="fmh-num">
            <span className="fmh-tit">Recibo de caja</span>
            <b>{p.id}</b>
            <span className="fmh-estado ok">PAGADO</span>
          </div>
        </div>

        <div className="fmh-datos">
          <div><span>Suscriptor</span><b>{p.cliente}</b><small>Código {p.clienteId}</small></div>
          <div><span>Fecha y hora</span><b>{fecha(p.timestamp)}</b><small>{hora(p.timestamp)}</small></div>
          <div><span>Medio de pago</span><b>{p.metodo}</b><small>Atendió: {p.cajero ?? '—'}</small></div>
          <div className="fmh-vence"><span>Total pagado</span><b>{cop(p.monto)}</b><small>{p.facturaIds.length} factura(s)</small></div>
        </div>

        <div className="fmh-cuerpo">
          <table className="fmh-tabla">
            <tbody>
              <tr><td colSpan={2} style={{ textAlign: 'left', fontWeight: 400 }}><b>{p.concepto}</b></td></tr>
              {p.facturaIds.map((id) => <tr key={id}><td>Factura</td><td style={{ fontFamily: 'ui-monospace, monospace' }}>{id}</td></tr>)}
              {p.recibido !== undefined && <tr><td>Recibido en efectivo</td><td>{cop(p.recibido)}</td></tr>}
              {p.recibido !== undefined && <tr><td>Vueltos</td><td>{cop(p.vueltos ?? 0)}</td></tr>}
            </tbody>
            <tfoot><tr><td>TOTAL PAGADO</td><td>{cop(p.monto)}</td></tr></tfoot>
          </table>

          <div className="fmh-lado">
            <div className="fmh-qr">
              <Qr value={urlVerificacion(p.id, codigo)} size={70} />
              <div><b>{codigo}</b>Escanee para verificar que el pago es real.</div>
            </div>
            {p.comprobante?.startsWith('data:image') && (
              <div><span className="fmh-lbl">Comprobante</span><img src={p.comprobante} alt="" style={{ maxHeight: '22mm', maxWidth: '100%', objectFit: 'contain', borderRadius: '1.5mm', border: '.2mm solid #E4E8E2' }} /></div>
            )}
            <div className="fmh-firma"><span />Firma y sello de caja</div>
          </div>
        </div>

        <div className="fmh-pie">Conserve este recibo como soporte de su pago. {c.nombre}{c.telefono ? ` · Tel. ${c.telefono}` : ''}{c.horario ? ` · ${c.horario.replace(/\.\s*$/, '')}` : ''}.</div>
      </div>
      <div className="fmh-corte">✂ - - - - - - - - - - - - - - - - - - - - recorte aquí - - - - - - - - - - - - - - - - - - - - ✂</div>
    </div>
  )
}
