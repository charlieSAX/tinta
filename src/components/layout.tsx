import type { ReactNode } from 'react'
import { IconButton } from './ui'

/** The single reading column: centred, max ~64ch, with room for the bottom nav. */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mx-auto w-full max-w-measure px-5 ${className}`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  kicker,
  onBack,
  right,
  sticky = true,
}: {
  title: ReactNode
  kicker?: ReactNode
  onBack?: () => void
  right?: ReactNode
  sticky?: boolean
}) {
  return (
    <header
      className={[
        '-mx-5 mb-4 border-b border-line bg-paper px-5 py-3',
        sticky ? 'sticky top-0 z-30' : '',
      ].join(' ')}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
    >
      <div className="flex items-center gap-2">
        {onBack ? <IconButton icon="back" label="Go back" onClick={onBack} className="-ml-2.5 shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          {kicker ? <div className="kicker">{kicker}</div> : null}
          <h1 className="truncate font-reading text-[1.375rem] leading-tight text-ink">{title}</h1>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  )
}
