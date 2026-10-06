import { useState } from 'react'
import { useAsistente, type Chat } from '../../data/AsistenteContext'
import Ico from '../ui/Icon'

const D = {
  plus: 'M12 4v16m8-8H4',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
}

/** Agrupa como los chats de siempre: Hoy, Ayer, Últimos 7 días, Anteriores. */
function grupo(ts: number) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = (hoy.getTime() - new Date(ts).setHours(0, 0, 0, 0)) / 86_400_000
  return d <= 0 ? 'Hoy' : d === 1 ? 'Ayer' : d < 7 ? 'Últimos 7 días' : d < 30 ? 'Este mes' : 'Anteriores'
}

/** Lista de conversaciones guardadas: abrir, renombrar, borrar y crear una nueva. */
export default function HistorialChats({ onElegir, compacto }: { onElegir?: () => void; compacto?: boolean }) {
  const { chats, activaId, abrirChat, nuevoChat, borrarChat, renombrarChat } = useAsistente()
  const [q, setQ] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [borrando, setBorrando] = useState<string | null>(null)

  const lista = chats.filter((c) => !q || `${c.titulo} ${c.mensajes.map((m) => m.texto).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
  const grupos = lista.reduce<Record<string, Chat[]>>((acc, c) => { (acc[grupo(c.actualizada)] ??= []).push(c); return acc }, {})

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={`${compacto ? 'p-3' : 'p-3'} space-y-2 shrink-0`}>
        <button onClick={() => { nuevoChat(); onElegir?.() }} className="btn-primary w-full h-10 text-sm"><Ico d={D.plus} /> Nuevo chat</button>
        {chats.length > 4 && (
          <div className="relative"><Ico d={D.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en los chats" className="field h-9 pl-9 text-sm" /></div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 && <p className="text-xs text-gray-400 text-center px-4 py-8">Aquí quedarán guardadas tus conversaciones con Gotita.</p>}
        {chats.length > 0 && lista.length === 0 && <p className="text-xs text-gray-400 text-center px-4 py-6">Ningún chat coincide.</p>}
        {Object.entries(grupos).map(([g, cs]) => (
          <div key={g} className="mb-2">
            <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{g}</p>
            <ul className="space-y-0.5">
              {cs.map((c) => (
                <li key={c.id} className={`group rounded-xl ${c.id === activaId ? 'bg-secondary/10' : 'hover:bg-gray-soft'}`}>
                  {editando === c.id ? (
                    <form onSubmit={(e) => { e.preventDefault(); renombrarChat(c.id, texto); setEditando(null) }} className="p-1.5">
                      <input value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={() => { renombrarChat(c.id, texto); setEditando(null) }} onKeyDown={(e) => e.key === 'Escape' && setEditando(null)} autoFocus className="field h-8 text-sm" />
                    </form>
                  ) : borrando === c.id ? (
                    <div className="flex items-center gap-2 px-2.5 py-2 text-xs">
                      <span className="flex-1 text-red-700 font-medium">¿Borrar este chat?</span>
                      <button onClick={() => { borrarChat(c.id); setBorrando(null) }} className="font-semibold text-red-600 hover:underline">Borrar</button>
                      <button onClick={() => setBorrando(null)} className="text-gray-500 hover:text-dark">No</button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button onClick={() => { abrirChat(c.id); onElegir?.() }} className="flex-1 min-w-0 text-left px-2.5 py-2 flex items-center gap-2">
                        <Ico d={D.chat} className={`w-4 h-4 shrink-0 ${c.id === activaId ? 'text-secondary' : 'text-gray-400'}`} />
                        <span className={`text-sm truncate ${c.id === activaId ? 'font-semibold text-dark' : 'text-gray-700'}`}>{c.titulo}</span>
                      </button>
                      <span className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 pr-1">
                        <button onClick={() => { setEditando(c.id); setTexto(c.titulo) }} className="h-7 w-7 rounded-lg text-gray-400 hover:text-dark hover:bg-white flex items-center justify-center" title="Cambiar nombre"><Ico d={D.edit} className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setBorrando(c.id)} className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white flex items-center justify-center" title="Borrar"><Ico d={D.trash} className="w-3.5 h-3.5" /></button>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
