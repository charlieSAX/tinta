import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../lib/db'
import {
  loadVoices,
  speak,
  speakingId,
  speechSupported,
  stop,
  subscribeSpeaker,
  targetVoices,
} from '../lib/speech'
import { Icon } from './Icon'

/** Tracks whether utterance `id` is currently playing. */
export function useSpeaker(id: string): boolean {
  const [active, setActive] = useState(() => speakingId() === id)
  useEffect(() => subscribeSpeaker(() => setActive(speakingId() === id)), [id])
  return active
}

/** Whether the device has any Spanish voice installed. */
export function useHasVoice(): boolean | undefined {
  const [has, setHas] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    let on = true
    void loadVoices().then(() => {
      if (on) setHas(targetVoices().length > 0)
    })
    return () => {
      on = false
    }
  }, [])
  return has
}

/**
 * A small play/stop toggle. Two sizes: 'row' (inline, for glossary rows) and
 * 'block' (labelled pill, for the article text). Hidden when speech synthesis
 * is unavailable; disabled with guidance when no Spanish voice is installed.
 */
export function SpeakButton({
  id,
  text,
  label,
  variant = 'row',
}: {
  id: string
  text: string
  label: string
  variant?: 'row' | 'block'
}) {
  const playing = useSpeaker(id)
  const hasVoice = useHasVoice()
  const settings = useLiveQuery(() => getSettings(), [])

  if (!speechSupported()) return null
  const disabled = hasVoice === false
  const title = disabled ? 'No Spanish voice installed on this device. See Settings, Audio.' : undefined

  function onClick() {
    if (playing) {
      stop()
    } else {
      void speak(id, text, { voiceURI: settings?.voiceURI })
    }
  }

  if (variant === 'block') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={playing ? `Stop reading ${label}` : `Listen to ${label}`}
        aria-pressed={playing}
        className={[
          'inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors',
          playing
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-line bg-card text-ink-soft hover:border-ink-soft hover:text-ink',
          disabled ? 'opacity-40' : '',
        ].join(' ')}
      >
        <Icon name={playing ? 'stop' : 'speaker'} size={16} />
        {playing ? 'Stop' : 'Listen'}
        {playing ? <SpeakingBars /> : null}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={playing ? `Stop reading ${label}` : `Listen to ${label}`}
      aria-pressed={playing}
      className={[
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
        playing ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-paper-2 hover:text-ink',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
    >
      <Icon name={playing ? 'stop' : 'speaker'} size={16} />
    </button>
  )
}

/** Three gently dancing bars while audio plays. */
function SpeakingBars() {
  return (
    <span className="ml-0.5 inline-flex items-end gap-[2px]" aria-hidden="true">
      <span className="speak-bar" style={{ animationDelay: '0ms' }} />
      <span className="speak-bar" style={{ animationDelay: '140ms' }} />
      <span className="speak-bar" style={{ animationDelay: '280ms' }} />
    </span>
  )
}
