import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAsistente } from '../../data/AsistenteContext'
import Ico from '../ui/Icon'

const D = {
  send: 'M5 12h14M12 5l7 7-7 7',
  stop: 'M6 6h12v12H6z',
  spark: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
}

/** Cara de Gotita, la mascota de EMCAGUA, para el asistente. */
export function Gotita({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 130" className={className} aria-hidden="true">
      <path d="M60 4 C76 30 104 52 104 82 A44 44 0 1 1 16 82 C16 52 44 30 60 4Z" fill="#38BDF8" />
      <path d="M36 70 C36 52 44 40 52 30" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" opacity=".55" />
      <ellipse cx="46" cy="80" rx="6" ry="8" fill="#1F2937" /><ellipse cx="74" cy="80" rx="6" ry="8" fill="#1F2937" />
      <circle cx="48" cy="77" r="2.2" fill="#fff" /><circle cx="76" cy="77" r="2.2" fill="#fff" />
      <path d="M48 98 Q60 108 72 98" stroke="#1F2937" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="94" r="6" fill="#FB7185" opacity=".45" /><circle cx="86" cy="94" r="6" fill="#FB7185" opacity=".45" />
    </svg>
  )
}

/** Formato mínimo: **negrita**, _cursiva_ y viñetas "- ". */
export function Texto({ t }: { t: string }) {
  const inline = (s: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? <b key={i} className="font-semibold">{p.slice(2, -2)}</b> : p.startsWith('_') && p.endsWith('_') && p.length > 2 ? <i key={i} className="opacity-80">{p.slice(1, -1)}</i> : p,
    )
  return (
    <div className="space-y-1.5 leading-relaxed">
      {t.split('\n').map((l, i) => {
        const v = l.match(/^\s*[-•*]\s+(.*)/)
        if (v) return <p key={i} className="pl-4 relative"><span className="absolute left-1 top-[0.6em] h-1 w-1 rounded-full bg-current opacity-60" />{inline(v[1])}</p>
        const h = l.match(/^#+\s*(.*)/)
        if (h) return <p key={i} className="font-semibold">{inline(h[1])}</p>
        return l.trim() ? <p key={i}>{inline(l)}</p> : null
      })}
    </div>
  )
}

/** Lista de mensajes + caja para escribir. La usan la página Asistente y el botón flotante. */
export default function Conversacion({ sugerencias, compacto = false, vacio }: { sugerencias: string[]; compacto?: boolean; vacio?: ReactNode }) {
  const { mensajes, pensando, enviar, detener, ia, modelo } = useAsistente()
  const [texto, setTexto] = useState('')
  const fin = useRef<HTMLDivElement>(null)
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [mensajes, pensando])
  const mandar = (t: string) => { enviar(t); setTexto('') }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className={`flex-1 overflow-y-auto ${compacto ? 'p-4 space-y-3' : 'p-5 space-y-4'}`}>
        {mensajes.length === 0 && (vacio ?? null)}
        {mensajes.length === 0 && (
          <div className={`flex flex-wrap gap-2 ${compacto ? '' : 'justify-center'}`}>
            {sugerencias.map((s) => <button key={s} onClick={() => mandar(s)} className="chip h-auto min-h-8 py-1.5 px-3 text-left text-[13px]">{s}</button>)}
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start gap-2'}`}>
            {m.rol === 'asistente' && compacto && <Gotita className="w-7 h-7 shrink-0 mt-1" />}
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.rol === 'usuario' ? 'bg-secondary text-white rounded-br-md' : 'bg-gray-soft text-dark rounded-bl-md'}`}>
              {m.texto ? <Texto t={m.texto} /> : <span className="flex gap-1 py-1">{[0, 1, 2].map((k) => <span key={k} className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${k * 0.15}s` }} />)}</span>}
              {m.escribiendo && m.texto && <span className="inline-block w-1.5 h-4 bg-secondary/60 animate-pulse align-middle ml-0.5" />}
              {!m.escribiendo && m.fuente && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] opacity-50">{m.fuente === 'ollama' ? `IA local · ${modelo}` : 'Al instante, con datos del sistema'}</span>
                  {m.pregunta && <button onClick={() => enviar(m.pregunta!, true)} disabled={pensando} className="text-[11px] font-semibold text-secondary hover:underline flex items-center gap-1 whitespace-nowrap"><Ico d={D.spark} className="w-3 h-3" /> Analizar con IA</button>}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={fin} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); mandar(texto) }} className="border-t border-gray-100 p-3 flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={ia?.ok ? 'Pregunta o di "llévame a pagos"…' : 'Pregunta sobre recaudo, mora, fugas, PQR…'} className="field h-11" />
        {pensando
          ? <button type="button" onClick={detener} className="btn-secondary h-11 px-3 shrink-0" title="Detener"><Ico d={D.stop} /></button>
          : <button disabled={!texto.trim()} className="btn-primary h-11 px-3.5 shrink-0" aria-label="Enviar"><Ico d={D.send} /></button>}
      </form>
    </div>
  )
}
