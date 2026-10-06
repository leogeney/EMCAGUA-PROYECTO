import { useState } from 'react'
import { useAsistente } from '../data/AsistenteContext'
import Conversacion, { Gotita } from '../components/asistente/Conversacion'
import Ico from '../components/ui/Icon'
import HistorialChats from '../components/asistente/HistorialChats'

const D = {
  cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  plus: 'M12 4v16m8-8H4',
  lista: 'M4 6h16M4 12h16M4 18h10',
}

const SUGERENCIAS = ['¿Qué es lo más urgente hoy?', 'Dame un resumen para la gerencia', '¿Quiénes deben en Guamalito?', '¿Hay posibles fugas?', '¿Qué barrio pierde más agua?', '¿Qué materiales hay que comprar?', 'Llévame a PQR']

export default function Asistente() {
  const { ia, url, modelo, setUrl, setModelo, probar, mensajes, nuevoChat, chats, activaId } = useAsistente()
  const [config, setConfig] = useState(false)
  const [verChats, setVerChats] = useState(false)
  const actual = chats.find((c) => c.id === activaId)
  const usarIA = !!(ia?.ok && modelo)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Inteligencia artificial</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Gotita, tu asistente</h1>
          <p className="text-sm text-gray-500 mt-2">También está en todas las pantallas: botón de abajo a la derecha o <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs font-mono">Ctrl + K</kbd>.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-semibold ${usarIA ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${usarIA ? 'bg-green-500' : 'bg-amber-500'}`} />
            {usarIA ? `IA local · ${modelo}` : 'Solo respuestas rápidas'}
          </span>
          <button onClick={() => setConfig((c) => !c)} className="btn-sm h-9"><Ico d={D.cog} /> Configurar</button>
          <button onClick={() => setVerChats((v) => !v)} className="btn-sm h-9 lg:hidden"><Ico d={D.lista} /> Chats ({chats.length})</button>
          {mensajes.length > 0 && <button onClick={nuevoChat} className="btn-sm h-9"><Ico d={D.plus} /> Nuevo chat</button>}
        </div>
      </div>

      {config && (
        <section className="card p-5 mb-5 grid grid-cols-1 lg:grid-cols-2 gap-5 animate-[pop_.15s_ease-out]">
          <div className="space-y-3">
            <div>
              <label className="field-label">Dirección de Ollama</label>
              <div className="flex gap-2">
                <input value={url} onChange={(e) => setUrl(e.target.value)} className="field font-mono text-sm" />
                <button onClick={() => probar(url)} className="btn-secondary shrink-0">Probar</button>
              </div>
            </div>
            <div>
              <label className="field-label">Modelo</label>
              <select value={modelo} onChange={(e) => setModelo(e.target.value)} disabled={!ia?.ok} className="field">
                {!ia?.ok && <option value="">Ollama no está disponible</option>}
                {ia?.modelos.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <p className={`text-xs ${ia?.ok ? 'text-green-700' : 'text-amber-700'}`}>{ia === null ? 'Probando conexión…' : ia.ok ? `Conectado · ${ia.modelos.length} modelo(s) instalados` : 'No se encontró Ollama en esa dirección. Gotita responde solo con las respuestas rápidas.'}</p>
            <p className="text-xs flex items-start gap-1.5 text-gray-500"><Ico d={D.lock} className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Los datos no salen del computador: el modelo corre localmente.</p>
          </div>
          <div className="rounded-2xl bg-gray-soft p-4 text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-dark flex items-center gap-1.5"><Ico d={D.bolt} className="w-4 h-4 text-amber-500" /> Para que responda más rápido</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Usa un modelo pequeño: <span className="font-mono bg-white px-1.5 py-0.5 rounded">ollama pull qwen2.5:3b</span>. Es 2 a 3 veces más rápido que el de 7b en un PC sin tarjeta gráfica.</li>
              <li>Deja Ollama abierto: Gotita mantiene el modelo cargado 30 minutos, así no lo vuelve a cargar en cada pregunta.</li>
              <li>Las preguntas frecuentes (urgencias, mora, recaudo, fugas, PQR, pérdidas, inventario) se contestan al instante sin IA.</li>
              <li>Si el PC tiene tarjeta gráfica NVIDIA, Ollama la usa sola y responde mucho más rápido.</li>
            </ul>
          </div>
        </section>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-5 min-h-[480px]">
      <aside className={`card overflow-hidden lg:flex flex-col max-h-[calc(100vh-220px)] ${verChats ? 'flex' : 'hidden'}`}>
        <p className="px-4 pt-4 text-sm font-bold text-dark">Conversaciones</p>
        <HistorialChats onElegir={() => setVerChats(false)} />
      </aside>
      <section className="card flex flex-col min-h-[480px] overflow-hidden">
        {actual && <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-dark truncate">{actual.titulo}</div>}
        <Conversacion
          sugerencias={SUGERENCIAS}
          vacio={
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Gotita className="w-16 h-16" />
              <p className="mt-3 text-lg font-bold text-dark">¿En qué te ayudo hoy?</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">Respondo con los datos actuales del sistema y puedo llevarte a cualquier módulo.</p>
            </div>
          }
        />
      </section>
      </div>
    </div>
  )
}
