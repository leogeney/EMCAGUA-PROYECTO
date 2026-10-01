import { useEffect, type ReactNode } from 'react'

type Props = { open: boolean; onClose: () => void; children: ReactNode; width?: string }

/** Panel lateral deslizante (derecha). En móvil ocupa toda la pantalla. */
export default function Drawer({ open, onClose, children, width = 'sm:max-w-xl' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-dark/30 backdrop-blur-[2px] animate-[fade_.15s_ease-out]" onClick={onClose} />
      <aside className={`absolute inset-y-0 right-0 w-full ${width} bg-white shadow-2xl flex flex-col animate-[slide_.22s_cubic-bezier(.2,.8,.2,1)]`}>
        {children}
      </aside>
    </div>
  )
}
