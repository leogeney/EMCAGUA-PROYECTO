import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useData } from '../data/DataContext'
import { usePqr } from '../data/PqrContext'
import { estadoOllama, preguntarOllama, responderSinIA, resumenParaModelo, type Mensaje } from '../data/asistente'
import Ico from '../components/ui/Icon'

const D = {
  send: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
  spark: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
}

const SUGERENCIAS = [
  '¿Cuánto se recaudó el último mes?',
  '¿Quiénes deben en Guamalito?',
  '¿Hay posibles fugas?',
  '¿Qué medidores tienen alarma?',
  '¿Cómo van las PQR?',
  '¿Qué barrio consume más agua?',
  'Dame un resumen para la gerencia',
]

const leer = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

/** Formato mínimo: **negrita**, _cursiva_ y viñetas "- ". */
function Texto({ t }: { t: string }) {
  const inline = (s: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((p, i) =>
      p.startsWith('**') ? <b key={i} className="font-semibold">{p.slice(2, -2)}</b> : p.startsWith('_') && p.endsWith('_') ? <i key={i} className="opacity-80">{p.slice(1, -1)}</i> : p,
    )
  const lineas = t.split('\n')
  return (
    <div className="space-y-1.5 leading-relaxed">
      {lineas.map((l, i) => {
        const v = l.match(/^\s*[-•*]\s+(.*)/)
        if (v) return <p key={i} className="pl-4 relative"><span className="absolute left-1 top-[0.6em] h-1 w-1 rounded-full bg-current opacity-60" />{inline(v[1])}</p>
        return l.trim() ? <p key={i}>{inline(l)}</p> : null
      })}
    </div>
  )
}

export default function Asistente() {
  const { usuarios, pagos, lecturas, alarmas } = useData()
  const { pqrs } = usePqr()
  const [url, setUrl] = useState(() => leer('emc_ollama_url', 'http://localhost:11434'))
  const [modelo, setModelo] = useState(() => leer('emc_ollama_modelo', ''))
  const [estado, setEstado] = useState<{ ok: boolean; modelos: string[] } | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [config, setConfig] = useState(false)
  const fin = useRef<HTMLDivElement>(null)

  const probar = async (u = url) => {
    const e = await estadoOllama(u)
    setEstado(e)
    if (e.ok && e.modelos.length && !e.modelos.includes(modelo)) { setModelo(e.modelos[0]); guardar('emc_ollama_modelo', e.modelos[0]) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { probar() }, [])
  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [mensajes, pensando])

  const usarIA = !!(estado?.ok && modelo)

  const enviar = async (pregunta: string) => {
    const p = pregunta.trim()
    if (!p || pensando) return
    const historial: Mensaje[] = [...mensajes, { rol: 'usuario', texto: p }]
    setMensajes(historial)
    setTexto('')
    setPensando(true)
    const ctx = { usuarios, pagos, pqrs, lecturas, alarmas }
    try {
      if (usarIA) {
        const r = await preguntarOllama(url, modelo, historial, resumenParaModelo(ctx))
        setMensajes([...historial, { rol: 'asistente', texto: r, fuente: 'ollama' }])
      } else {
        await new Promise((r) => setTimeout(r, 350))
        setMensajes([...historial, { rol: 'asistente', texto: responderSinIA(p, ctx), fuente: 'reglas' }])
      }
    } catch {
      setMensajes([...historial, { rol: 'asistente', texto: `No pude conectar con Ollama. Te respondo con los datos del sistema:\n\n${responderSinIA(p, ctx)}`, fuente: 'reglas' }])
    } finally {
      setPensando(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Inteligencia artificial</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Asistente</h1>
          <p className="text-sm text-gray-500 mt-2">Pregunta en lenguaje natural sobre recaudo, cartera, consumo, fugas, PQR y medidores.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-semibold ${usarIA ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${usarIA ? 'bg-green-500' : 'bg-amber-500'}`} />
            {usarIA ? `IA local · ${modelo}` : 'Modo básico (sin IA)'}
          </span>
          <button onClick={() => setConfig((c) => !c)} className="btn-sm h-9"><Ico d={D.cog} /> Configurar</button>
          {mensajes.length > 0 && <button onClick={() => setMensajes([])} className="h-9 w-9 rounded-xl text-gray-400 hover:text-dark hover:bg-gray-100 flex items-center justify-center" title="Nueva conversación"><Ico d={D.trash} /></button>}
        </div>
      </div>

      {config && (
        <section className="card p-5 mb-5 grid grid-cols-1 lg:grid-cols-2 gap-5 animate-[pop_.15s_ease-out]">
          <div className="space-y-3">
            <div>
              <label className="field-label">Dirección de Ollama</label>
              <div className="flex gap-2">
                <input value={url} onChange={(e) => setUrl(e.target.value)} className="field font-mono text-sm" />
                <button onClick={() => { guardar('emc_ollama_url', url); probar(url) }} className="btn-secondary shrink-0">Probar</button>
              </div>
            </div>
            <div>
              <label className="field-label">Modelo</label>
              <select value={modelo} onChange={(e) => { setModelo(e.target.value); guardar('emc_ollama_modelo', e.target.value) }} disabled={!estado?.ok} className="field">
                {!estado?.ok && <option value="">Ollama no está disponible</option>}
                {estado?.modelos.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <p className={`text-xs ${estado?.ok ? 'text-green-700' : 'text-amber-700'}`}>{estado === null ? 'Probando conexión…' : estado.ok ? `Conectado · ${estado.modelos.length} modelo(s) instalados` : 'No se encontró Ollama en esa dirección. El asistente funciona en modo básico.'}</p>
          </div>
          <div className="rounded-2xl bg-gray-soft p-4 text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-dark">Cómo activar la IA local</p>
            <ol className="list-decimal pl-5 space-y-1 text-xs">
              <li>Instala Ollama desde <span className="font-mono">ollama.com</span> en el computador de la empresa.</li>
              <li>En una terminal: <span className="font-mono bg-white px-1.5 py-0.5 rounded">ollama pull llama3.2</span> (o <span className="font-mono">qwen2.5:7b</span>, que responde mejor en español).</li>
              <li>Deja Ollama abierto y pulsa <b>Probar</b>.</li>
            </ol>
            <p className="text-xs flex items-start gap-1.5 pt-1"><Ico d={D.lock} className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Los datos no salen del computador: el modelo corre localmente.</p>
          </div>
        </section>
      )}

      <section className="card flex-1 flex flex-col min-h-[480px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {mensajes.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <span className="h-14 w-14 rounded-2xl bg-gradient-to-br from-secondary to-secondary-700 text-white flex items-center justify-center shadow-lg"><Ico d={D.spark} className="w-7 h-7" /></span>
              <p className="mt-4 text-lg font-bold text-dark">¿En qué te ayudo hoy?</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">Respondo con los datos actuales del sistema. Prueba con una de estas preguntas:</p>
              <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-2xl">
                {SUGERENCIAS.map((s) => <button key={s} onClick={() => enviar(s)} className="chip h-9 px-3.5 text-sm">{s}</button>)}
              </div>
            </div>
          )}
          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.rol === 'usuario' ? 'bg-secondary text-white rounded-br-md' : 'bg-gray-soft text-dark rounded-bl-md'}`}>
                <Texto t={m.texto} />
                {m.fuente && <p className="text-[10px] mt-2 opacity-50">{m.fuente === 'ollama' ? `IA local · ${modelo}` : 'Respuesta automática con datos del sistema'}</p>}
              </div>
            </div>
          ))}
          {pensando && (
            <div className="flex"><div className="rounded-2xl rounded-bl-md bg-gray-soft px-4 py-3 flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div>
          )}
          <div ref={fin} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); enviar(texto) }} className="border-t border-gray-100 p-3 flex gap-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu pregunta…" className="field h-11" />
          <button disabled={!texto.trim() || pensando} className="btn-primary h-11 px-4 shrink-0"><Ico d={D.send} /> Enviar</button>
        </form>
      </section>
    </div>
  )
}
