import { useNav, type ScreenName, type Tab } from '../nav'
import { Icon, type IconName } from './Icon'

const TABS: { tab: Tab; name: ScreenName; icon: IconName; label: string }[] = [
  { tab: 'library', name: 'library', icon: 'library', label: 'Library' },
  { tab: 'review', name: 'review', icon: 'review', label: 'Review' },
  { tab: 'progress', name: 'progress', icon: 'progress', label: 'Progress' },
  { tab: 'settings', name: 'settings', icon: 'settings', label: 'Settings' },
]

export function BottomNav({ due }: { due: number }) {
  const { activeTab, root } = useNav()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-measure items-stretch justify-around">
        {TABS.map((t) => {
          const active = activeTab === t.tab
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => root({ name: t.name })}
              aria-current={active ? 'page' : undefined}
              aria-label={t.tab === 'review' && due > 0 ? `${t.label}, ${due} due` : t.label}
              className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2"
            >
              <span className="relative">
                <Icon name={t.icon} size={22} className={active ? 'text-accent' : 'text-muted'} />
                {t.tab === 'review' && due > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-none text-white">
                    {due > 99 ? '99+' : due}
                  </span>
                ) : null}
              </span>
              <span className={`text-[0.625rem] font-semibold ${active ? 'text-ink' : 'text-muted'}`}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
