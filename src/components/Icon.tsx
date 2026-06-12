import type { ReactNode } from 'react'

// A small, original, hand-drawn stroke-icon set so the app carries no icon
// dependency. 24×24, inherits colour from `currentColor`.

export type IconName =
  | 'library'
  | 'review'
  | 'progress'
  | 'settings'
  | 'back'
  | 'right'
  | 'down'
  | 'up'
  | 'external'
  | 'download'
  | 'upload'
  | 'sun'
  | 'moon'
  | 'plus'
  | 'trash'
  | 'check'
  | 'x'
  | 'inbox'
  | 'book'
  | 'clipboard'
  | 'file'
  | 'link'
  | 'sparkle'
  | 'speaker'
  | 'stop'

const P: Record<IconName, ReactNode> = {
  speaker: (
    <>
      <path d="M4 9.5v5a1 1 0 0 0 1 1h2.6l4 3.4a.8.8 0 0 0 1.3-.6V5.7a.8.8 0 0 0-1.3-.6l-4 3.4H5a1 1 0 0 0-1 1z" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18.4 6.8a7.4 7.4 0 0 1 0 10.4" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="1.6" />,
  library: (
    <>
      <path d="M12 6.6v12.8" />
      <path d="M12 6.6S9.6 5 5.7 5.4C4.8 5.5 4 6.1 4 6.9V17c0 .8.7 1.4 1.5 1.3 3.6-.3 6.5 1.4 6.5 1.4" />
      <path d="M12 6.6S14.4 5 18.3 5.4c.9.1 1.7.7 1.7 1.5V17c0 .8-.7 1.4-1.5 1.3-3.6-.3-6.5 1.4-6.5 1.4" />
    </>
  ),
  review: (
    <>
      <rect x="3.5" y="7" width="12" height="13" rx="2" />
      <path d="M7.8 7V5.6c0-1.1.9-2 2-2h8.6c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H16" />
    </>
  ),
  progress: (
    <>
      <path d="M3.5 20h17" />
      <path d="M6 20v-6" />
      <path d="M12 20V7" />
      <path d="M18 20v-9" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7.5h9" />
      <path d="M17 7.5h3" />
      <circle cx="15" cy="7.5" r="2" />
      <path d="M4 16.5h3" />
      <path d="M11 16.5h9" />
      <circle cx="9" cy="16.5" r="2" />
    </>
  ),
  back: (
    <>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
  right: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  up: <path d="M6 15l6-6 6 6" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8.5 8.5" />
      <path d="M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20V9" />
      <path d="M7 13l5-5 5 5" />
      <path d="M5 4h14" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3v2.2" />
      <path d="M12 18.8V21" />
      <path d="M3 12h2.2" />
      <path d="M18.8 12H21" />
      <path d="M5.6 5.6l1.6 1.6" />
      <path d="M16.8 16.8l1.6 1.6" />
      <path d="M18.4 5.6l-1.6 1.6" />
      <path d="M7.2 16.8l-1.6 1.6" />
    </>
  ),
  moon: <path d="M20 14.6A8 8 0 1 1 9.4 4 6.4 6.4 0 0 0 20 14.6Z" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13l2.6-6.4A2 2 0 0 1 8.5 5.4h7a2 2 0 0 1 1.9 1.2L20 13" />
      <path d="M4 13v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="M4 13h4l1.4 2.2h5.2L16 13h4" />
    </>
  ),
  book: (
    <>
      <path d="M5.5 4H16a2 2 0 0 1 2 2v13.5" />
      <path d="M5.5 4v14" />
      <path d="M18 19.5H7.5A2 2 0 0 0 5.5 21" />
      <path d="M5.5 18A2 2 0 0 0 7.5 20H18" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M9 5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
    </>
  ),
  link: (
    <>
      <path d="M9.5 13.5a3 3 0 0 0 4.3.1l2.7-2.7a3 3 0 0 0-4.2-4.3l-1 1" />
      <path d="M14.5 10.5a3 3 0 0 0-4.3-.1l-2.7 2.7a3 3 0 0 0 4.2 4.3l1-1" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
      <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
}

export interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  title?: string
}

export function Icon({ name, size = 20, strokeWidth = 1.75, className, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {P[name]}
    </svg>
  )
}
