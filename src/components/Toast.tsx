import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tone = 'default' | 'success' | 'error'
interface ToastItem {
  id: number
  message: string
  tone: Tone
}
interface ToastApi {
  push: (message: string, tone?: Tone) => void
}

const Ctx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast must be used inside <ToastProvider>')
  return c
}

const toneBar: Record<Tone, string> = {
  default: 'var(--ink-soft)',
  success: 'var(--good)',
  error: 'var(--again)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: Tone = 'default') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }}
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-up pointer-events-auto w-full max-w-measure rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink shadow-[var(--shadow-card)]"
            style={{ borderLeft: `3px solid ${toneBar[t.tone]}` }}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
