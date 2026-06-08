import { createContext, useContext, type ReactNode } from 'react'
import { useTheme } from './hooks/useTheme'

type ThemeApi = ReturnType<typeof useTheme>
const Ctx = createContext<ThemeApi | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useTheme()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useThemeCtx(): ThemeApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useThemeCtx must be used inside <ThemeProvider>')
  return c
}
