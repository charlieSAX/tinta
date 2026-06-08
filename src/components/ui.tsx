import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

// ── Section label (uppercase grotesque kicker) ───────────────────────────────
export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`kicker ${className}`}>{children}</div>
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`hr ${className}`} />
}

// ── Filter chip (toggle) ─────────────────────────────────────────────────────
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'shrink-0 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line bg-transparent text-muted hover:text-ink-soft',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ── Buttons ──────────────────────────────────────────────────────────────────
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  block?: boolean
  icon?: IconName
}

export function Button({
  variant = 'secondary',
  block,
  icon,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none min-h-[44px]'
  const variants: Record<string, string> = {
    primary: 'bg-accent text-white hover:opacity-95',
    secondary: 'border border-line bg-card text-ink hover:border-ink-soft',
    ghost: 'text-ink-soft hover:text-ink hover:bg-paper-2',
    danger: 'border border-line text-again hover:bg-accent-soft',
  }
  return (
    <button className={[base, variants[variant], block ? 'w-full' : '', className].join(' ')} {...rest}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
  size = 20,
  className = '',
}: {
  icon: IconName
  label: string
  onClick?: () => void
  size?: number
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink ${className}`}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

// ── Stat tile ────────────────────────────────────────────────────────────────
export function StatTile({
  value,
  label,
  hint,
  accent,
}: {
  value: ReactNode
  label: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className={`tabular font-reading text-3xl leading-none ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
      <div className="mt-2 text-[0.8125rem] font-medium text-ink-soft">{label}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
    </div>
  )
}

// ── Modal + confirm dialog ───────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="animate-fade-up relative w-full max-w-md rounded-t-3xl border border-line bg-card p-5 shadow-[var(--shadow-card)] sm:rounded-3xl">
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
      <h2 id="confirm-title" className="font-reading text-xl text-ink">
        {title}
      </h2>
      {body ? <div className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</div> : null}
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" block onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} block onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-line border-t-accent"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
