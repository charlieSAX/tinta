import { useCallback, useEffect, useState } from 'react'
import { getSettings, setSettings } from '../lib/db'

type Theme = 'light' | 'dark'

const KEY = 'tinta-theme'

function readCached(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'dark' || t === 'light') return t
  } catch {
    /* ignore */
  }
  return 'light'
}

function apply(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
}

/**
 * Reading-mode theme. localStorage is the instant-paint cache (also applied by
 * the inline script in index.html); IndexedDB settings are the source of truth.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readCached)

  // Reconcile with the persisted setting once on mount.
  useEffect(() => {
    let alive = true
    getSettings().then((s) => {
      if (alive && s.theme !== theme) {
        setThemeState(s.theme)
        apply(s.theme)
      }
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    apply(theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    apply(t)
    void setSettings({ theme: t })
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      apply(next)
      void setSettings({ theme: next })
      return next
    })
  }, [])

  return { theme, setTheme, toggle }
}
