import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { useNomina } from '../data/NominaContext'
import { usePqr } from '../data/PqrContext'
import { useDocumentos, type Emitido } from '../data/DocumentosContext'
import { nombrePeriodo } from '../data/billing'
import { liquidar, NOVEDAD_VACIA } from '../data/nomina'
import { redactarOllamaStream } from '../data/asistente'
import { useAsistente } from '../data/AsistenteContext'
import { descargarWord, EMPRESA, fechaLarga, GRUPOS, PLANTILLAS, plantilla, sugerirFecha, type Borrador, type Datos, type Formato, type Grupo, type Plantilla } from '../data/documentos'
import Ico from '../components/ui/Icon'
import Modal from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { cop, fecha } from '../utils/format'
import { getUsername, puede } from '../utils/session'
import { otrosPredios } from '../data/propietarios'
import { anularDocumento, codigoDocumento, urlVerificacion, useRegistroDocs } from '../data/verificacion'
import Qr from '../components/Qr'

const D = {
  back: 'M10 19l-7-7m0 0l7-7m-7 7h18',
  print: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
  word: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  spark: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  warn: 'M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
}

const ICONO_GRUPO: Record<Grupo, string> = {
  'Suscriptores': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  'Cartera y cobro': 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  'Nómina y personal': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  'Oficios y comunicaciones': 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
}

const SISTEMA_IA = `Eres el secretario(a) de la gerencia de ${EMPRESA.nombre}, empresa de acueducto y alcantarillado de El Carmen y Guamalito (Norte de Santander, Colombia).
Redactas documentos oficiales en español formal colombiano, claro, respetuoso y sin rodeos.
Reglas:
- Devuelve SOLO el cuerpo del documento: sin membrete, fecha, destinatario, asunto, saludo, despedida ni firma.
- Párrafos separados por una línea en blanco. No uses markdown, asteriscos ni viñetas con símbolos.
- No inventes cifras, nombres, fechas, normas ni hechos. Si falta un dato, escríbelo entre corchetes [así].
- Conserva exactamente los valores en pesos, números de suscriptor, radicados, cédulas y referencias legales del borrador.`

type Vista = 'galeria' | 'editor' | 'emitidos'

export default function Documentos() {
  const { emitidos } = useDocumentos()
  const [vista, setVista] = useState<Vista>('galeria')
  const [id, setId] = useState('')
  const admin = puede('nomina')
  const abrir = (pid: string) => { setId(pid); setVista('editor') }
  // Enlace directo desde una recomendación: /documentos?plantilla=aviso-cobro
  const [sp, setSp] = useSearchParams()
  useEffect(() => {
    const pid = sp.get('plantilla')
    if (!pid) return
    const t = setTimeout(() => { if (PLANTILLAS.some((p) => p.id === pid && (!p.soloAdmin || admin))) abrir(pid); setSp({}, { replace: true }) }, 0)
    return () => clearTimeout(t)
  }, [sp, setSp, admin])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Gestión documental</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Documentos</h1>
          <p className="text-sm text-gray-500 mt-2">Certificados, cartas, oficios, memorandos y actas con los datos del sistema. La IA local te ayuda a redactar.</p>
        </div>
        <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
          {([['galeria', 'Nuevo documento'], ['emitidos', `Emitidos (${emitidos.length})`]] as [Vista, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setVista(k)} className={`px-3 h-9 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${(vista === k || (k === 'galeria' && vista === 'editor')) ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>{l}</button>
          ))}
        </div>
      </div>

      {vista === 'galeria' && (
        <div className="space-y-6">
          {GRUPOS.map((g) => {
            const lista = PLANTILLAS.filter((p) => p.grupo === g && (!p.soloAdmin || admin))
            if (!lista.length) return null
            return (
              <section key={g}>
                <h2 className="text-sm font-bold text-dark mb-3 flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center"><Ico d={ICONO_GRUPO[g]} className="w-4 h-4" /></span>{g}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {lista.map((p) => (
                    <button key={p.id} onClick={() => abrir(p.id)} className="card p-4 text-left hover:border-secondary/40 hover:shadow-md transition-all group">
                      <p className="font-semibold text-dark group-hover:text-secondary">{p.nombre}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.descripcion}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-3">EMC-{p.prefijo}-…</p>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {vista === 'editor' && id && <Editor key={id} p={plantilla(id)} onVolver={() => setVista('galeria')} />}
      {vista === 'emitidos' && <Emitidos onNuevo={() => setVista('galeria')} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Editor({ p, onVolver }: { p: Plantilla; onVolver: () => void }) {
  const { usuarios, resumen } = useData()
  const { empleados, parametros, periodos, obtenerPeriodo } = useNomina()
  const { pqrs } = usePqr()
  const { siguiente, emitir } = useDocumentos()
  const toast = useToast()
  const [hoy] = useState(() => new Date())

  const suscriptores = useMemo(() => [...usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre)), [usuarios])
  const activos = empleados.filter((e) => e.activo)
  const mesesNomina = useMemo(() => Object.values(periodos).sort((a, b) => b.clave.localeCompare(a.clave)), [periodos])
  const opcionesDe = (k: string): string[] | undefined => {
    if (p.id === 'desprendible' && k === 'periodo') return mesesNomina.map((x) => nombrePeriodo(x.mes, x.anio))
    if (k === 'tecnico') return activos.filter((e) => e.area === 'Operativa').map((e) => e.nombre)
    return p.campos.find((c) => c.k === k)?.opciones
  }

  const [sujeto, setSujeto] = useState(() => (p.sujeto === 'suscriptor' ? (p.grupo === 'Cartera y cobro' ? suscriptores.find((u) => resumen(u).deuda > 0)?.id : suscriptores[0]?.id) ?? '' : p.sujeto === 'empleado' ? (p.id === 'memorando' ? activos.find((x) => x.cargo !== 'Gerente') : activos[0])?.id ?? '' : p.sujeto === 'pqr' ? pqrs[0]?.radicado ?? '' : ''))
  const [filtro, setFiltro] = useState('')
  const [v, setV] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    p.campos.forEach((c) => { o[c.k] = c.def ?? (c.tipo === 'date' ? sugerirFecha(hoy, 5) : opcionesDe(c.k)?.[0] ?? '') })
    return o
  })
  const [cuerpo, setCuerpo] = useState<string | null>(null)
  const [instr, setInstr] = useState('')
  const asis = useAsistente()
  const ia = asis.ia ? { ok: asis.ia.ok && !!asis.modelo, modelo: asis.modelo } : null
  const control = useRef<AbortController | null>(null)
  const [pensando, setPensando] = useState(false)
  const [emitido, setEmitido] = useState<Emitido | null>(null)


  const u = p.sujeto === 'suscriptor' ? usuarios.find((x) => x.id === sujeto) : undefined
  const e = p.sujeto === 'empleado' ? empleados.find((x) => x.id === sujeto) : undefined
  const pqr = p.sujeto === 'pqr' ? pqrs.find((x) => x.radicado === sujeto) : undefined
  const gerente = empleados.find((x) => x.cargo === 'Gerente') ?? empleados[0]

  let liq
  if (p.id === 'desprendible' && e) {
    const per = mesesNomina.find((x) => nombrePeriodo(x.mes, x.anio) === v.periodo) ?? mesesNomina[0]
    const n = per ? obtenerPeriodo(per.anio, per.mes).novedades[e.id] ?? NOVEDAD_VACIA : NOVEDAD_VACIA
    liq = liquidar(e, n, parametros)
  }
  const datos: Datos = { v, hoy, gerente, u, r: u ? resumen(u) : undefined, predios: u ? [u, ...otrosPredios(usuarios, u)].map((x) => ({ u: x, r: resumen(x) })) : undefined, e, liq, pqr, empleados }
  const listo = (p.sujeto === 'ninguno' || u || e || pqr) && (p.id !== 'desprendible' || liq)
  const bloqueo = listo ? p.bloqueo?.(datos) ?? null : null
  const generado = listo ? p.generar(datos) : null
  const b: Borrador | null = generado ? { ...generado, cuerpo: cuerpo ?? generado.cuerpo } : null
  const consecutivo = emitido?.consecutivo ?? siguiente(p.prefijo)

  const cambiarSujeto = (s: string) => { setSujeto(s); setCuerpo(null); setEmitido(null) }
  const cambiarCampo = (k: string, val: string) => { setV((o) => ({ ...o, [k]: val })); setCuerpo(null); setEmitido(null) }

  const dirigidoA = u?.nombre ?? e?.nombre ?? pqr?.nombre ?? v.entidad ?? v.nombre ?? v.barrios ?? 'Comunidad'
  const asegurarEmitido = () => {
    if (emitido) return emitido
    const doc = emitir({ plantillaId: p.id, nombre: p.nombre, dirigidoA: dirigidoA || '—', formato: p.formato, borrador: b!, sujetoId: u?.id ?? e?.id ?? pqr?.radicado }, p.prefijo)
    setEmitido(doc)
    toast('Documento emitido', `${doc.consecutivo} · ${p.nombre}`)
    return doc
  }
  const imprimir = () => { asegurarEmitido(); setTimeout(() => window.print(), 60) }
  const word = () => { const d = asegurarEmitido(); descargarWord(`${d.consecutivo} ${p.nombre}`, b!, d.consecutivo, new Date(d.ts), p.formato, verifDe(d)) }
  // El QR de la vista previa: el mismo que tendrá el documento al emitirse hoy
  const codigoPrevio = emitido?.codigo ?? codigoDocumento({ consecutivo, plantillaId: p.id, dirigidoA: dirigidoA || '—', ts: hoy.getTime() })

  const pedirIA = async (modo: 'redactar' | 'mejorar') => {
    if (!b || !ia?.ok) return
    setPensando(true)
    control.current = new AbortController()
    try {
      const pedido = [
        `Documento: ${p.guiaIA}.`,
        `Asunto: ${b.asunto}.`,
        b.destinatario ? `Dirigido a: ${b.destinatario.join(', ').replace(/\n/g, ' ')}.` : '',
        b.tabla ? `El documento incluye aparte una tabla con: ${b.tabla.columnas.join(', ')}${b.tabla.total ? ` (${b.tabla.total.filter(Boolean).join(' ')})` : ''}. No la repitas.` : '',
        `Borrador actual:\n"""\n${b.cuerpo}\n"""`,
        modo === 'mejorar' ? 'Tarea: mejora la redacción del borrador (más claro y formal) sin cambiar hechos, datos ni estructura.' : 'Tarea: redacta el cuerpo completo del documento a partir del borrador y las instrucciones.',
        instr ? `Instrucciones del usuario: ${instr}` : '',
      ].filter(Boolean).join('\n\n')
      const limpiar = (t: string) => t.replace(/\*\*/g, '').replace(/^#+\s*/gm, '')
      // Largo máximo según el borrador (≈ 4 caracteres por token, con margen); textos cortos terminan antes
      const largo = Math.min(900, Math.max(300, Math.round((b.cuerpo.length / 4) * (modo === 'mejorar' ? 1.5 : 2))))
      setEmitido(null)
      const r = await redactarOllamaStream(asis.url, ia.modelo, SISTEMA_IA, pedido, (parcial) => setCuerpo(limpiar(parcial)), largo, control.current.signal)
      setCuerpo(limpiar(r).trim())
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) toast('No pude conectar con Ollama', 'Revisa que esté abierto y prueba en Asistente IA → Configurar.')
    } finally {
      setPensando(false)
      control.current = null
    }
  }

  const lista = p.sujeto === 'suscriptor' ? suscriptores.filter((x) => !filtro || `${x.nombre} ${x.id} ${x.medidor} ${x.cedula} ${x.direccion}`.toLowerCase().includes(filtro.toLowerCase())) : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">
      {/* Formulario */}
      <div className="no-print space-y-4">
        <div className="card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <button onClick={onVolver} className="h-9 w-9 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center shrink-0" title="Volver"><Ico d={D.back} /></button>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{p.grupo}</p>
              <h2 className="text-lg font-bold text-dark leading-tight">{p.nombre}</h2>
            </div>
          </div>

          {p.sujeto === 'suscriptor' && (
            <div>
              <label className="field-label">Suscriptor</label>
              <div className="relative mb-2">
                <Ico d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={filtro} onChange={(x) => setFiltro(x.target.value)} placeholder="Buscar nombre, cédula, código o dirección" className="field h-10 pl-9 text-sm" />
              </div>
              <select value={sujeto} onChange={(x) => cambiarSujeto(x.target.value)} className="field h-auto py-1.5 text-sm" size={Math.min(6, Math.max(2, lista.length))}>
                {lista.map((x) => { const r = resumen(x); return <option key={x.id} value={x.id}>{x.nombre} · {x.id} · {x.direccion}{r.deuda > 0 ? ` · debe ${cop(r.deuda)}` : ''}</option> })}
              </select>
            </div>
          )}
          {p.sujeto === 'empleado' && (
            <div>
              <label className="field-label">Empleado</label>
              <select value={sujeto} onChange={(x) => cambiarSujeto(x.target.value)} className="field">
                {activos.map((x) => <option key={x.id} value={x.id}>{x.nombre} · {x.cargo}</option>)}
              </select>
            </div>
          )}
          {p.sujeto === 'pqr' && (
            <div>
              <label className="field-label">PQR</label>
              <select value={sujeto} onChange={(x) => cambiarSujeto(x.target.value)} className="field">
                {pqrs.map((x) => <option key={x.radicado} value={x.radicado}>{x.radicado} · {x.nombre} · {x.estado}</option>)}
              </select>
            </div>
          )}

          {p.campos.map((c) => {
            const ops = opcionesDe(c.k)
            return (
              <div key={c.k}>
                <label className="field-label">{c.label}</label>
                {c.tipo === 'textarea' ? (
                  <textarea value={v[c.k] ?? ''} onChange={(x) => cambiarCampo(c.k, x.target.value)} placeholder={c.placeholder} rows={3} className="field py-2.5 h-auto text-sm" />
                ) : c.tipo === 'select' ? (
                  <select value={v[c.k] ?? ''} onChange={(x) => cambiarCampo(c.k, x.target.value)} className="field">{(ops ?? []).map((o) => <option key={o}>{o}</option>)}</select>
                ) : (
                  <input type={c.tipo === 'number' ? 'number' : c.tipo === 'date' ? 'date' : 'text'} value={v[c.k] ?? ''} onChange={(x) => cambiarCampo(c.k, x.target.value)} placeholder={c.placeholder} className="field" />
                )}
              </div>
            )
          })}
        </div>

        {/* Texto + IA */}
        {b && !bloqueo && p.id !== 'desprendible' && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="field-label mb-0">Texto del documento</label>
              {cuerpo !== null && <button onClick={() => { setCuerpo(null); setEmitido(null) }} className="text-xs font-semibold text-secondary hover:underline">Restablecer</button>}
            </div>
            <textarea value={b.cuerpo} readOnly={pensando} onChange={(x) => { setCuerpo(x.target.value); setEmitido(null) }} rows={9} className={`field py-2.5 h-auto text-sm leading-relaxed ${pensando ? 'bg-secondary/5' : ''}`} />
            <div className="rounded-2xl bg-gradient-to-br from-secondary/5 to-primary/5 border border-secondary/15 p-3.5 space-y-2.5">
              <p className="text-sm font-semibold text-dark flex items-center gap-1.5"><Ico d={D.spark} className="w-4 h-4 text-secondary" /> Redactar con IA</p>
              <input value={instr} onChange={(x) => setInstr(x.target.value)} placeholder="Opcional: ej. más corto, tono más amable, mencionar la reunión del viernes" className="field h-10 text-sm bg-white" />
              <div className="flex gap-2">
                {pensando ? (
                  <button onClick={() => control.current?.abort()} className="btn-secondary h-9 px-3 text-sm flex-1">Detener · {b.cuerpo.split(/\s+/).filter(Boolean).length} palabras</button>
                ) : (<>
                  <button disabled={!ia?.ok} onClick={() => pedirIA('redactar')} className="btn-primary h-9 px-3 text-sm flex-1">Redactar</button>
                  <button disabled={!ia?.ok} onClick={() => pedirIA('mejorar')} className="btn-secondary h-9 px-3 text-sm flex-1">Mejorar texto</button>
                </>)}
              </div>
              <p className="text-[11px] text-gray-500">
                {ia === null ? 'Buscando la IA local…' : ia.ok ? `IA local · ${ia.modelo}. Revisa siempre el texto antes de emitir.` : <>La IA local no está activa. <Link to="/asistente" className="font-semibold text-secondary hover:underline">Configúrala en Asistente IA</Link>. Sin ella puedes editar el texto a mano.</>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Vista previa */}
      <div className="space-y-3 min-w-0">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">{emitido ? <>Emitido como <b className="font-mono text-dark">{emitido.consecutivo}</b></> : <>Vista previa · se emitirá como <span className="font-mono">{consecutivo}</span></>}</p>
          <div className="flex gap-2">
            <button disabled={!b || !!bloqueo} onClick={word} className="btn-secondary h-10"><Ico d={D.word} /> Word</button>
            <button disabled={!b || !!bloqueo} onClick={imprimir} className="btn bg-dark text-white hover:bg-black disabled:opacity-40 h-10"><Ico d={D.print} /> Imprimir / PDF</button>
          </div>
        </div>
        {bloqueo && (
          <div className="no-print rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2"><Ico d={D.warn} className="w-4 h-4 shrink-0 mt-0.5" />{bloqueo}</div>
        )}
        {b && <Hoja b={b} consecutivo={consecutivo} fecha={hoy} formato={p.formato} atenuado={!!bloqueo} verif={{ url: urlVerificacion(consecutivo, codigoPrevio), codigo: codigoPrevio }} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** Código y enlace de verificación de un documento emitido (los antiguos sin código se firman igual). */
const verifDe = (d: Emitido) => { const codigo = d.codigo ?? codigoDocumento(d); return { url: urlVerificacion(d.consecutivo, codigo), codigo } }

function Hoja({ b, consecutivo, fecha: f, formato, atenuado, verif, anulado }: { b: Borrador; consecutivo: string; fecha: Date; formato: Formato; atenuado?: boolean; verif?: { url: string; codigo: string }; anulado?: boolean }) {
  return (
    <article className={`print-area relative bg-white rounded-2xl border border-gray-100 shadow-sm px-8 sm:px-14 py-10 text-[13.5px] text-gray-800 leading-relaxed ${atenuado ? 'opacity-40' : ''}`}>
      {anulado && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="-rotate-[24deg] border-[6px] border-red-600/70 text-red-600/70 text-6xl font-black tracking-[0.2em] px-6 py-2 rounded-xl">ANULADO</span></div>}
      <header className="flex items-center gap-3 pb-3 border-b-2 border-secondary">
        <img src="/logo_circulo.png" alt="" className="h-12 w-12 object-contain" />
        <div>
          <p className="text-lg font-extrabold text-secondary leading-none">{EMPRESA.nombre}</p>
          <p className="text-[10.5px] text-gray-500 mt-1">{EMPRESA.razon}</p>
          <p className="text-[10.5px] text-gray-500">{EMPRESA.ciudad}</p>
          {EMPRESA.contacto && <p className="text-[10.5px] text-gray-500">{EMPRESA.contacto}</p>}
        </div>
      </header>
      <p className="text-right text-[11px] text-gray-500 font-mono mt-3">{consecutivo}</p>

      {formato === 'carta' && (
        <div className="space-y-4 mt-4">
          <p>{EMPRESA.ciudad.split(',')[0]}, {fechaLarga(f)}</p>
          <p className="whitespace-pre-line">{(b.destinatario ?? []).join('\n')}</p>
          <p><b>Asunto:</b> {b.asunto}</p>
          {b.saludo && <p>{b.saludo}</p>}
        </div>
      )}
      {b.titulo && <h2 className="text-center font-bold tracking-[0.12em] text-[15px] text-dark my-7">{b.titulo}</h2>}
      {b.memo && (
        <div className="mb-5 pb-3 border-b border-gray-200 grid grid-cols-[80px_1fr] gap-y-1 text-[13px]">
          <b>PARA:</b><span>{b.memo.para}</span><b>DE:</b><span>{b.memo.de}</span><b>FECHA:</b><span>{fechaLarga(f)}</span><b>ASUNTO:</b><span>{b.asunto}</span>
        </div>
      )}

      <div className={`space-y-3 text-justify ${formato === 'carta' ? 'mt-4' : ''}`}>
        {b.cuerpo.split(/\n{2,}/).map((par, i) => <p key={i} className={`whitespace-pre-line ${/^[A-ZÁÉÍÓÚÑ ,:]+:?$/.test(par.trim()) ? 'font-bold text-center my-4' : ''}`}>{par}</p>)}
      </div>

      {b.tabla && (
        <table className="w-full mt-4 mb-2 text-[12.5px]">
          <thead><tr className="bg-secondary text-white">{b.tabla.columnas.map((c, i) => <th key={i} className={`py-1.5 px-2 font-semibold ${i ? 'text-right' : 'text-left'}`}>{c}</th>)}</tr></thead>
          <tbody>
            {b.tabla.filas.map((r, i) => <tr key={i} className="border-b border-gray-100">{r.map((c, j) => <td key={j} className={`py-1.5 px-2 tabular-nums ${j ? 'text-right' : ''}`}>{c}</td>)}</tr>)}
            {b.tabla.total && <tr className="border-t-2 border-secondary font-bold">{b.tabla.total.map((c, j) => <td key={j} className={`py-1.5 px-2 tabular-nums ${j ? 'text-right' : ''}`}>{c}</td>)}</tr>}
          </tbody>
        </table>
      )}
      {b.pie && <p className="mt-3 text-right text-base font-extrabold text-dark">{b.pie}</p>}
      {b.despedida && <p className="mt-5">{b.despedida}</p>}

      <div className={`grid gap-10 mt-16 ${b.firmas.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
        {b.firmas.map((x, i) => (
          <div key={i} className="border-t border-gray-500 pt-1.5">
            <p className="font-bold text-dark">{x.nombre}</p>
            <p className="text-[12px] text-gray-500">{x.cargo}</p>
          </div>
        ))}
      </div>
      {verif && (
        <div className="mt-10 pt-4 border-t border-dashed border-gray-200 flex items-center gap-4">
          <Qr value={verif.url} size={92} />
          <div className="text-[11px] text-gray-500 leading-relaxed">
            <p className="font-bold text-secondary text-[12px]">Documento verificable</p>
            <p>Escanee el código con la cámara del celular para comprobar que este documento es auténtico y no ha sido modificado.</p>
            <p>Código de seguridad: <b className="font-mono text-dark tracking-wider">{verif.codigo}</b></p>
          </div>
        </div>
      )}
    </article>
  )
}

/* ------------------------------------------------------------------ */

function Emitidos({ onNuevo }: { onNuevo: () => void }) {
  const { emitidos } = useDocumentos()
  const registro = useRegistroDocs()
  const toast = useToast()
  const [ver, setVer] = useState<Emitido | null>(null)
  const [anulando, setAnulando] = useState<Emitido | null>(null)
  const [motivo, setMotivo] = useState('')
  const [q, setQ] = useState('')
  const lista = emitidos.filter((d) => !q || `${d.consecutivo} ${d.nombre} ${d.dirigidoA} ${d.borrador.asunto}`.toLowerCase().includes(q.toLowerCase()))

  if (!emitidos.length) {
    return (
      <div className="card py-16 text-center">
        <p className="font-semibold text-dark">Aún no se ha emitido ningún documento</p>
        <p className="text-sm text-gray-500 mt-1">Cada documento que imprimas o descargues queda aquí con su consecutivo.</p>
        <button onClick={onNuevo} className="btn-primary mt-4">Crear documento</button>
      </div>
    )
  }
  return (
    <>
      <div className="relative mb-3 max-w-md">
        <Ico d={D.search} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={q} onChange={(x) => setQ(x.target.value)} placeholder="Buscar por consecutivo, tipo o destinatario" className="field h-11 pl-10" />
      </div>
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-soft/60 border-b border-gray-100"><tr><th className="th">Consecutivo</th><th className="th">Documento</th><th className="th">Dirigido a</th><th className="th">Fecha</th><th className="th">Emitido por</th><th className="th">Estado</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((d) => (
                <tr key={d.consecutivo} className="hover:bg-gray-soft/50">
                  <td className="td font-mono text-xs font-semibold">{d.consecutivo}</td>
                  <td className="td"><p className="font-semibold text-dark">{d.nombre}</p><p className="text-xs text-gray-400 truncate max-w-xs">{d.borrador.asunto}</p></td>
                  <td className="td text-gray-600">{d.dirigidoA}</td>
                  <td className="td text-gray-600 whitespace-nowrap">{fecha(d.ts)}</td>
                  <td className="td text-gray-600">{d.usuario}</td>
                  <td className="td">{registro[d.consecutivo]?.anulado ? <span className="badge-bad" title={registro[d.consecutivo]!.anulado!.motivo}>Anulado</span> : <span className="badge-ok">Vigente</span>}</td>
                  <td className="td text-right whitespace-nowrap">
                    {!registro[d.consecutivo]?.anulado && <button onClick={() => { setAnulando(d); setMotivo('') }} className="btn-sm mr-1.5 text-red-600">Anular</button>}
                    <button onClick={() => setVer(d)} className="btn-sm">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Modal
        open={!!ver}
        onClose={() => setVer(null)}
        size="xl"
        title={ver?.consecutivo}
        subtitle={ver ? `${ver.nombre} · ${ver.dirigidoA}` : undefined}
        footer={ver && (
          <div className="flex justify-end gap-2">
            <button onClick={() => descargarWord(`${ver.consecutivo} ${ver.nombre}`, ver.borrador, ver.consecutivo, new Date(ver.ts), ver.formato, verifDe(ver))} className="btn-secondary"><Ico d={D.word} /> Word</button>
            <button onClick={() => window.print()} className="btn bg-dark text-white hover:bg-black"><Ico d={D.print} /> Imprimir / PDF</button>
          </div>
        )}
      >
        {ver && <div className="bg-gray-soft p-4"><Hoja b={ver.borrador} consecutivo={ver.consecutivo} fecha={new Date(ver.ts)} formato={ver.formato} verif={verifDe(ver)} anulado={!!registro[ver.consecutivo]?.anulado} /></div>}
      </Modal>
      <Modal open={!!anulando} onClose={() => setAnulando(null)} size="sm" title={`Anular ${anulando?.consecutivo ?? ''}`} subtitle="Quien escanee su QR verá que ya no es válido."
        footer={<div className="flex justify-end gap-2"><button onClick={() => setAnulando(null)} className="btn-secondary">Cancelar</button><button disabled={motivo.trim().length < 5} onClick={() => { anularDocumento(anulando!.consecutivo, getUsername(), motivo.trim()); toast('Documento anulado', anulando!.consecutivo); setAnulando(null) }} className="btn bg-red-600 text-white hover:bg-red-700">Anular documento</button></div>}>
        <div className="p-6 space-y-2">
          <label className="field-label">Motivo</label>
          <input value={motivo} onChange={(x) => setMotivo(x.target.value)} placeholder="Ej: se expidió con un error en el nombre" className="field" autoFocus />
          <p className="text-xs text-gray-500">El documento sigue en el historial, pero la verificación dirá «ANULADO» con la fecha y el motivo.</p>
        </div>
      </Modal>
    </>
  )
}

