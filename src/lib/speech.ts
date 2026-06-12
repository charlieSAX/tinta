// ── Speech: read Spanish aloud with the best voice the device offers ─────────
// Web Speech API only (no dependencies, works offline once a voice is on the
// device). Voice choice matters: the stock robotic voice is a last resort, and
// we NEVER fall back to a wrong-language voice. If the device has no Spanish
// voice at all, callers surface guidance instead of speaking.

export const SPEECH_LANG = 'es'
export const PREFERRED_REGION = 'es-ES'
export const SAMPLE_SENTENCE = 'Hola. Así suena esta voz leyendo un artículo en español.'

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Voices arrive asynchronously on most browsers (voiceschanged). Cache them.
let voicesCache: SpeechSynthesisVoice[] = []
let voicesReady = false

function readVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return []
  const v = window.speechSynthesis.getVoices()
  if (v.length > 0) {
    voicesCache = v
    voicesReady = true
  }
  return voicesCache
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([])
  const now = readVoices()
  if (voicesReady) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => resolve(readVoices())
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    // Some engines never fire voiceschanged; settle after a beat regardless.
    setTimeout(done, 700)
  })
}

/** All installed voices for the target language, best first. */
export function targetVoices(): SpeechSynthesisVoice[] {
  return readVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(SPEECH_LANG))
    .sort((a, b) => voiceScore(b) - voiceScore(a))
}

// Higher is better. Enhanced/premium device voices first, then the preferred
// region, then on-device voices (work offline), then everything else.
const QUALITY_MARKERS = ['premium', 'enhanced', 'natural', 'neural', 'plus', 'siri']

export function voiceScore(v: SpeechSynthesisVoice): number {
  const id = `${v.name} ${v.voiceURI}`.toLowerCase()
  let score = 0
  if (QUALITY_MARKERS.some((m) => id.includes(m))) score += 8
  if (v.lang.replace('_', '-').toLowerCase() === PREFERRED_REGION.toLowerCase()) score += 3
  if (v.localService) score += 2
  if (v.default) score += 1
  return score
}

export function isEnhanced(v: SpeechSynthesisVoice): boolean {
  const id = `${v.name} ${v.voiceURI}`.toLowerCase()
  return QUALITY_MARKERS.some((m) => id.includes(m))
}

/** The voice to use: the saved pick if it still exists, else the best installed. */
export async function resolveVoice(savedURI?: string): Promise<SpeechSynthesisVoice | null> {
  await loadVoices()
  const candidates = targetVoices()
  if (candidates.length === 0) return null
  if (savedURI) {
    const saved = candidates.find((v) => v.voiceURI === savedURI)
    if (saved) return saved
  }
  return candidates[0]
}

// ── A tiny global speaker so only one thing talks at a time, and buttons can
//    show a playing state. Subscribe via useSpeaker(id). ──────────────────────

type Listener = () => void
let currentId: string | null = null
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribeSpeaker(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function speakingId(): string | null {
  return currentId
}

export interface SpeakOptions {
  voiceURI?: string
  /** Slightly slow for learners by default. */
  rate?: number
}

/** Speak `text` as utterance `id`. Resolves false if no target voice exists. */
export async function speak(id: string, text: string, opts: SpeakOptions = {}): Promise<boolean> {
  if (!speechSupported()) return false
  const voice = await resolveVoice(opts.voiceURI)
  if (!voice) return false

  stop()
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang || PREFERRED_REGION
  u.rate = opts.rate ?? 0.92
  u.onend = () => {
    if (currentId === id) {
      currentId = null
      emit()
    }
  }
  u.onerror = u.onend
  currentId = id
  emit()
  window.speechSynthesis.speak(u)
  return true
}

export function stop(): void {
  if (!speechSupported()) return
  window.speechSynthesis.cancel()
  if (currentId !== null) {
    currentId = null
    emit()
  }
}
