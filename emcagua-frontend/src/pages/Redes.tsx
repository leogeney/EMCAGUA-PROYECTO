import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { calentarOllama, redactarJsonStream } from '../data/asistente'
import { useAsistente } from '../data/AsistenteContext'
import { borradorRapido, dibujar, ESTILOS, FORMATOS, parsearPieza, piezaParcial, SISTEMA_REDES, TIPOS, tipoPieza, type Detalle, type Estilo, type Icono, type Pieza } from '../data/redes'
import { fechaLarga } from '../data/documentos'
import { cfg } from '../data/config'
import { ILUSTRACIONES, ilustracion, svgUrl } from '../data/ilustraciones'
import Ico from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'

const D = {
  spark: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  down: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  plus: 'M12 4v16m8-8H4',
  x: 'M6 18L18 6M6 6l12 12',
  stop: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
  img: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
}

const ICONOS: [Icono, string][] = [['fecha', 'Fecha'], ['hora', 'Hora'], ['lugar', 'Lugar'], ['pago', 'Pago'], ['info', 'Info'], ['telefono', 'Teléfono']]

function cargarImagen(src: string) {
  return new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src })
}

export default function Redes() {
  const toast = useToast()
  const [tipoId, setTipoId] = useState(TIPOS[0].id)
  const [pieza, setPieza] = useState<Pieza>(() => TIPOS[0].base())
  const [formatoId, setFormatoId] = useState(FORMATOS[0].id)
  const [contacto, setContacto] = useState(() => { const c = cfg(); return c.whatsapp ? `WhatsApp ${c.whatsapp}` : c.telefono ? `Tel. ${c.telefono}` : '' })
  const [foto, setFoto] = useState<HTMLImageElement>()
  const [ilusId, setIlusId] = useState(TIPOS[0].ilustracion) // id, 'foto' o 'ninguna'
  const [ilusImg, setIlusImg] = useState<HTMLImageElement>()
  const [logo, setLogo] = useState<HTMLImageElement>()
  const [idea, setIdea] = useState('')
  const asis = useAsistente()
  const ia = asis.ia ? { ok: asis.ia.ok && !!asis.modelo, modelo: asis.modelo } : null
  const [pensando, setPensando] = useState(false)
  const [fuentes, setFuentes] = useState(false)
  const [estilo, setEstiloState] = useState<Estilo>(() => { try { return (localStorage.getItem('emc_redes_estilo') as Estilo) || 'elegante' } catch { return 'elegante' } })
  const setEstilo = (e: Estilo) => { setEstiloState(e); try { localStorage.setItem('emc_redes_estilo', e) } catch { /* */ } }
  const [segundos, setSegundos] = useState(0)
  const control = useRef<AbortController | null>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)

  const tipo = tipoPieza(tipoId)
  const formato = FORMATOS.find((f) => f.id === formatoId)!

  useEffect(() => {
    cargarImagen('/logo_circulo.png').then(setLogo).catch(() => {})
    Promise.all([...['500', '600', '700', '800', 'italic 400'].map((p) => document.fonts.load(`${p} 40px Inter`)), document.fonts.load('600 40px Fraunces')]).finally(() => setFuentes(true))
  }, [])

  useEffect(() => {
    const il = ilustracion(ilusId)
    if (il) cargarImagen(svgUrl(il.svg)).then(setIlusImg).catch(() => setIlusImg(undefined))
  }, [ilusId])
  const imagen = ilusId === 'foto' ? foto : ilusId === 'ninguna' ? undefined : ilusImg

  useEffect(() => {
    const c = lienzo.current
    if (!c || !fuentes) return
    c.width = formato.w
    c.height = formato.h
    const ctx = c.getContext('2d')
    if (ctx) dibujar(ctx, { formato, tipo, pieza, logo, imagen, esFoto: ilusId === 'foto', contacto, estilo })
  }, [formato, tipo, pieza, logo, imagen, ilusId, contacto, fuentes, estilo])

  // Deja el modelo cargado al entrar, para que la primera pieza no espere
  useEffect(() => { if (asis.ia?.ok && asis.modelo) calentarOllama(asis.url, asis.modelo) }, [asis.ia?.ok, asis.modelo, asis.url])

  const cambiarTipo = (id: string) => { setTipoId(id); setPieza(tipoPieza(id).base()); if (ilusId !== 'foto') setIlusId(tipoPieza(id).ilustracion) }
  // Enlace directo desde una recomendación: /redes?tipo=ahorro
  const [sp, setSp] = useSearchParams()
  useEffect(() => {
    const id = sp.get('tipo')
    if (!id) return
    const t = setTimeout(() => { if (TIPOS.some((x) => x.id === id)) { setTipoId(id); setPieza(tipoPieza(id).base()); setIlusId(tipoPieza(id).ilustracion) } setSp({}, { replace: true }) }, 0)
    return () => clearTimeout(t)
  }, [sp, setSp])
  const set = <K extends keyof Pieza>(k: K, v: Pieza[K]) => setPieza((p) => ({ ...p, [k]: v }))
  const setDet = (i: number, d: Partial<Detalle>) => set('detalles', pieza.detalles.map((x, j) => (j === i ? { ...x, ...d } : x)))

  const generar = async () => {
    if (!idea.trim() || pensando) return
    // 1. Al instante: tipo, fecha, hora y lugar salen del texto, sin esperar a la IA
    const rapido = borradorRapido(idea)
    const t = rapido.tipo && rapido.tipo !== tipoId ? tipoPieza(rapido.tipo) : tipo
    if (t.id !== tipoId) { setTipoId(t.id); if (ilusId !== 'foto') setIlusId(t.ilustracion) }
    const base = t.base()
    const inicial: Pieza = { ...base, detalles: rapido.detalles.length ? rapido.detalles : base.detalles }
    setPieza(inicial)
    if (!ia?.ok) { toast('Borrador listo', 'Saqué fecha, hora y lugar de tu texto. Ajusta lo demás a mano.'); return }
    // 2. La IA escribe y la pieza se va llenando en vivo
    setPensando(true); setSegundos(0)
    const t0 = Date.now()
    const reloj = setInterval(() => setSegundos(Math.round((Date.now() - t0) / 1000)), 500)
    control.current = new AbortController()
    try {
      const pedido = `Pieza: ${t.guia}.\nIdea: ${idea.trim()}${rapido.detalles.length ? `\nDatos ya confirmados: ${rapido.detalles.map((d) => `${d.icono}: ${d.texto}`).join('; ')}` : ''}`
      const r = await redactarJsonStream(asis.url, ia.modelo, `${SISTEMA_REDES}${fechaLarga(new Date())}.`, pedido, (parcial) => setPieza(piezaParcial(parcial, inicial)), control.current.signal)
      const final = parsearPieza(r, inicial)
      // Fecha, hora y lugar que vienen del texto del usuario son más confiables que los de la IA
      const iconosIA = new Set(final.detalles.map((d) => d.icono))
      const faltan = rapido.detalles.filter((d) => !iconosIA.has(d.icono))
      setPieza({ ...final, detalles: [...faltan, ...final.detalles].slice(0, 4) })
      toast(`Listo en ${Math.max(1, Math.round((Date.now() - t0) / 1000))} s`, 'Revisa los textos antes de publicar.')
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast('No se pudo generar', 'Revisa que Ollama esté abierto o intenta de nuevo.')
    } finally {
      clearInterval(reloj)
      setPensando(false)
      control.current = null
    }
  }

  const descargar = () => {
    lienzo.current?.toBlob((b) => {
      if (!b) return
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      a.href = url
      a.download = `EMCAGUA ${tipo.nombre} ${formato.nombre}.png`.replace(/\//g, '-')
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }
  const copiar = async () => {
    try { await navigator.clipboard.writeText(pieza.caption); toast('Texto copiado', 'Pégalo en tu publicación.') } catch { toast('No se pudo copiar', 'Selecciona el texto y cópialo a mano.') }
  }
  const onFoto = (f?: File) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => cargarImagen(r.result as string).then((i) => { setFoto(i); setIlusId('foto') })
    r.readAsDataURL(f)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Comunicaciones</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Piezas para redes sociales</h1>
        <p className="text-sm text-gray-500 mt-2">Avisos visuales para Facebook, Instagram y estados de WhatsApp, con la imagen de EMCAGUA. Cuéntale a la IA qué quieres comunicar.</p>
      </div>

      {/* Tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 mb-5">
        {TIPOS.map((t) => (
          <button key={t.id} onClick={() => cambiarTipo(t.id)} className={`rounded-2xl border p-3 text-left transition-all ${tipoId === t.id ? 'border-secondary bg-secondary/5 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
            <span className="h-9 w-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `linear-gradient(135deg, ${t.tema.fondo[0]}, ${t.tema.fondo[1]})`, color: t.tema.texto === '#FFFFFF' ? '#fff' : t.tema.acento }}>
              <Ico d={t.icono} className="w-5 h-5" />
            </span>
            <p className="text-sm font-semibold text-dark leading-tight">{t.nombre}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{t.descripcion}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5 items-start">
        <div className="space-y-4">
          {/* IA */}
          <div className="card p-5 space-y-3 bg-gradient-to-br from-secondary/5 to-primary/5">
            <p className="font-semibold text-dark flex items-center gap-1.5"><Ico d={D.spark} className="w-4 h-4 text-secondary" /> Crear con IA</p>
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} placeholder="Ej: el jueves no habrá agua en La Esperanza de 7 de la mañana a 3 de la tarde porque vamos a cambiar una válvula" className="field py-2.5 h-auto text-sm bg-white" />
            {pensando ? (
              <button onClick={() => control.current?.abort()} className="btn-secondary w-full"><Ico d={D.stop} /> Escribiendo… {segundos} s · Detener</button>
            ) : (
              <button disabled={!idea.trim()} onClick={generar} className="btn-primary w-full"><Ico d={D.spark} /> {ia?.ok ? 'Crear aviso' : 'Crear borrador'}</button>
            )}
            <p className="text-[11px] text-gray-500">
              {ia === null ? 'Buscando la IA local…' : ia.ok ? `IA local · ${ia.modelo}. Fecha, hora y lugar aparecen al instante; la IA completa los textos en vivo.` : <>La IA local no está activa. <Link to="/asistente" className="font-semibold text-secondary hover:underline">Configúrala en Asistente IA</Link>. Igual puedes llenar los textos a mano.</>}
            </p>
          </div>

          {/* Textos */}
          <div className="card p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Etiqueta</label><input value={pieza.etiqueta} onChange={(e) => set('etiqueta', e.target.value.toUpperCase())} className="field" /></div>
              <div><label className="field-label">Botón final</label><input value={pieza.cta} onChange={(e) => set('cta', e.target.value)} className="field" /></div>
            </div>
            <div><label className="field-label">Titular</label><input value={pieza.titular} onChange={(e) => set('titular', e.target.value)} className="field font-semibold" /></div>
            <div><label className="field-label">Subtítulo</label><input value={pieza.subtitulo} onChange={(e) => set('subtitulo', e.target.value)} className="field" /></div>
            <div>
              <label className="field-label">Detalles</label>
              <div className="space-y-2">
                {pieza.detalles.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={d.icono} onChange={(e) => setDet(i, { icono: e.target.value as Icono })} className="field w-28 shrink-0 px-2" aria-label="Ícono">
                      {ICONOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <input value={d.texto} onChange={(e) => setDet(i, { texto: e.target.value })} className="field" />
                    <button onClick={() => set('detalles', pieza.detalles.filter((_, j) => j !== i))} className="h-11 w-11 shrink-0 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center" aria-label="Quitar"><Ico d={D.x} /></button>
                  </div>
                ))}
                {pieza.detalles.length < 4 && <button onClick={() => set('detalles', [...pieza.detalles, { icono: 'info', texto: '' }])} className="btn-sm"><Ico d={D.plus} /> Agregar detalle</button>}
              </div>
            </div>
            <div><label className="field-label">Mensaje</label><textarea value={pieza.mensaje} onChange={(e) => set('mensaje', e.target.value)} rows={2} className="field py-2.5 h-auto" /></div>
            <div><label className="field-label">Contacto (opcional)</label><input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Ej: WhatsApp 300 000 0000" className="field" /></div>
          </div>

          {/* Imagen */}
          <div className="card p-5">
            <label className="field-label">Imagen</label>
            <p className="text-xs text-gray-500 mb-3">Ilustraciones con gente y casas como las de aquí, o una foto real del barrio, la obra o el equipo de trabajo.</p>
            <div className="grid grid-cols-4 gap-2">
              {ILUSTRACIONES.map((il) => (
                <button key={il.id} onClick={() => setIlusId(il.id)} title={il.nombre} className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${ilusId === il.id ? 'border-secondary ring-2 ring-secondary/20' : 'border-transparent hover:border-gray-200'}`} style={{ background: `linear-gradient(135deg, ${tipo.tema.fondo[0]}, ${tipo.tema.fondo[1]})` }}>
                  <img src={svgUrl(il.svg)} alt={il.nombre} className="w-full h-full" />
                </button>
              ))}
              <label title="Subir una foto" className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer text-[11px] font-semibold overflow-hidden ${ilusId === 'foto' ? 'border-secondary text-secondary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {foto ? <img src={foto.src} alt="" className="w-full h-full object-cover" /> : <><Ico d={D.img} className="w-5 h-5" />Tu foto</>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFoto(e.target.files?.[0])} />
              </label>
              {foto && ilusId !== 'foto' && <button onClick={() => setIlusId('foto')} className="aspect-square rounded-xl border-2 border-gray-200 text-[11px] font-semibold text-gray-500 hover:border-gray-300">Usar foto</button>}
              <button onClick={() => setIlusId('ninguna')} className={`aspect-square rounded-xl border-2 text-[11px] font-semibold ${ilusId === 'ninguna' ? 'border-secondary text-secondary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>Sin imagen</button>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="space-y-4 min-w-0 lg:sticky lg:top-4">
          <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm w-fit">
            {ESTILOS.map((e) => (
              <button key={e.id} onClick={() => setEstilo(e.id)} title={e.descripcion} className={`px-3 h-9 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${estilo === e.id ? 'bg-secondary text-white' : 'text-gray-500 hover:text-dark'}`}>{e.nombre}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
              {FORMATOS.map((f) => (
                <button key={f.id} onClick={() => setFormatoId(f.id)} title={f.uso} className={`px-3 h-9 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${formatoId === f.id ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>{f.nombre}</button>
              ))}
            </div>
            <button onClick={descargar} className="btn-primary"><Ico d={D.down} /> Descargar imagen</button>
          </div>
          <div className="card p-4 bg-gray-soft flex justify-center">
            <canvas ref={lienzo} className="rounded-xl shadow-lg max-w-full h-auto" style={{ maxHeight: formato.h > formato.w ? 640 : 520 }} />
          </div>
          <p className="text-xs text-gray-500 text-center">{formato.w} × {formato.h} px · {formato.uso}</p>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Texto para la publicación</label>
              <button onClick={copiar} className="btn-sm"><Ico d={D.copy} /> Copiar</button>
            </div>
            <textarea value={pieza.caption} onChange={(e) => set('caption', e.target.value)} rows={3} className="field py-2.5 h-auto text-sm" />
          </div>
        </div>
      </div>
    </div>
  )
}
