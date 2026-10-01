import { useEffect, type ReactNode } from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
  headerExtra?: ReactNode
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ open, onClose, title, subtitle, size = 'md', children, footer, headerExtra }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-dark/40 backdrop-blur-[2px] animate-[fade_.15s_ease-out]" onClick={onClose} />
      <div className={`relative bg-white w-full ${SIZES[size]} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-2xl animate-[pop_.18s_ease-out]`}>
        {title && (
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-dark truncate">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerExtra}
              <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-dark">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

type ConfirmProps = {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', tone = 'primary', onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="p-6">
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center mb-4 ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-secondary/10 text-secondary'}`}>
          {tone === 'danger' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
        </div>
        <h3 className="text-base font-bold text-dark">{title}</h3>
        <div className="text-sm text-gray-500 mt-1.5 leading-relaxed">{message}</div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={onConfirm} className={`flex-1 ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
