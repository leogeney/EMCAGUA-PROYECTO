/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tone = 'success' | 'info' | 'warning'
type Toast = { id: number; title: string; desc?: string; tone: Tone }
type Fn = (title: string, desc?: string, tone?: Tone) => void

const Ctx = createContext<Fn>(() => {})

const ICON: Record<Tone, ReactNode> = {
  success: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
  info: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" />,
  warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" />,
}
const COLOR: Record<Tone, string> = { success: 'bg-green-500', info: 'bg-secondary', warning: 'bg-amber-500' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback<Fn>((title, desc, tone = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, title, desc, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full sm:w-96 bg-dark text-white rounded-2xl shadow-2xl px-4 py-3 flex gap-3 items-start animate-[pop_.18s_ease-out]">
            <span className={`h-6 w-6 rounded-full ${COLOR[t.tone]} flex items-center justify-center shrink-0 mt-0.5`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{ICON[t.tone]}</svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.desc && <p className="text-xs text-white/70 mt-0.5">{t.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
