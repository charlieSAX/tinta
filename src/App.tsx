import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { seedIfEmpty } from './lib/seed'
import { getDueCounts } from './lib/queue'
import { getSettings } from './lib/db'
import { pullFeed } from './lib/feed'
import { NavProvider, useNav, type Route } from './nav'
import { ToastProvider, useToast } from './components/Toast'
import { ThemeProvider } from './theme'
import { BottomNav } from './components/BottomNav'
import { Library } from './screens/Library'
import { Import } from './screens/Import'
import { Reader } from './screens/Reader'
import { Review } from './screens/Review'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

function Shell() {
  const { route } = useNav()
  const toast = useToast()
  const [ready, setReady] = useState(false)
  const pulledRef = useRef(false)

  useEffect(() => {
    seedIfEmpty().finally(() => setReady(true))
  }, [])

  // Auto-pull the article feed once per launch (if enabled). Quiet on failure.
  useEffect(() => {
    if (!ready || pulledRef.current) return
    pulledRef.current = true
    getSettings().then((s) => {
      if (!s.autoPull) return
      pullFeed()
        .then((r) => {
          if (r.added > 0) {
            toast.push(`${r.added} new article${r.added === 1 ? '' : 's'} added to your library.`, 'success')
          }
        })
        .catch(() => {})
    })
  }, [ready, toast])

  const counts = useLiveQuery(() => getDueCounts(), [])
  const due = counts?.actionable ?? 0

  if (!ready) return <Splash />

  return (
    <div className="min-h-full">
      <main key={route.name + (route.packId ?? '')} className="animate-fade-in">
        {renderScreen(route)}
      </main>
      <BottomNav due={due} />
    </div>
  )
}

function renderScreen(route: Route) {
  switch (route.name) {
    case 'import':
      return <Import />
    case 'reader':
      return route.packId ? <Reader packId={route.packId} /> : <Library />
    case 'review':
      return <Review />
    case 'progress':
      return <Progress />
    case 'settings':
      return <Settings />
    case 'library':
    default:
      return <Library />
  }
}

function Splash() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="text-center">
        <div className="font-reading text-4xl font-medium tracking-tight text-ink">Tinta</div>
        <div className="kicker mt-2">Spanish reading &amp; review</div>
      </div>
    </div>
  )
}
