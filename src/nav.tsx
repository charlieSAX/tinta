import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type ScreenName = 'library' | 'import' | 'reader' | 'review' | 'progress' | 'settings'

export interface Route {
  name: ScreenName
  packId?: string
}

export type Tab = 'library' | 'review' | 'progress' | 'settings'

interface NavApi {
  route: Route
  activeTab: Tab
  canBack: boolean
  go: (route: Route) => void
  back: () => void
  root: (route: Route) => void
}

const NavCtx = createContext<NavApi | null>(null)

export function useNav(): NavApi {
  const c = useContext(NavCtx)
  if (!c) throw new Error('useNav must be used inside <NavProvider>')
  return c
}

function tabFor(name: ScreenName): Tab {
  if (name === 'review') return 'review'
  if (name === 'progress') return 'progress'
  if (name === 'settings') return 'settings'
  return 'library' // library, import, reader all live under the Library tab
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'library' }])

  const api = useMemo<NavApi>(() => {
    const route = stack[stack.length - 1]
    return {
      route,
      activeTab: tabFor(route.name),
      canBack: stack.length > 1,
      go: (next) => setStack((s) => [...s, next]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      // Top-level tab switch: reset the stack and scroll to top.
      root: (next) => {
        setStack([next])
        window.scrollTo({ top: 0 })
      },
    }
  }, [stack])

  return <NavCtx.Provider value={api}>{children}</NavCtx.Provider>
}
