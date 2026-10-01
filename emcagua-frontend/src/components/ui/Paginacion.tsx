export default function Paginacion({ pagina, total, items, porPagina, onChange }: { pagina: number; total: number; items: number; porPagina: number; onChange: (n: number) => void }) {
  if (items === 0) return null
  const desde = Math.max(1, Math.min(pagina - 2, total - 4))
  const nums = Array.from({ length: Math.min(5, total) }, (_, i) => desde + i)
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100">
      <span className="text-xs text-gray-500">Mostrando {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, items)} de {items}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(pagina - 1)} disabled={pagina === 1} className="btn-sm">Anterior</button>
        {nums.map((n) => (
          <button key={n} onClick={() => onChange(n)} className={`h-8 min-w-8 px-2 rounded-lg text-xs font-bold border ${pagina === n ? 'bg-dark text-white border-dark' : 'bg-white text-dark border-gray-200 hover:bg-gray-50'}`}>{n}</button>
        ))}
        <button onClick={() => onChange(pagina + 1)} disabled={pagina === total} className="btn-sm">Siguiente</button>
      </div>
    </div>
  )
}
