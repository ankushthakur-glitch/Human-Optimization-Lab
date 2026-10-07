import * as React from "react"
import { Platform } from "react-native"

/* Speaking a question into the chat bar. On the web build the browser's
   speech recognition writes the words into the field as they are heard and
   the microphone's loudness drives the voice beam. Expo Go has no speech
   recognition, so on the phone (and in a browser without it) the bar
   listens for show: the beam follows a synthetic voice and, when stopped,
   a sample question is written in. Swap in a native recogniser here when
   the app gets its own build. */

export type VoiceState = "idle" | "listening" | "processing"

/** What the prototype "hears" where nothing can transcribe. */
const SAMPLE = "Why has my LDL gone up since my last test?"

type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function recogniser(): Recognition | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

/** A synthetic voice: a swell with a flutter, as the library's demo. */
function synthetic() {
  const t = performance.now() / 1000
  const swell = Math.sin(t * 1.6) * 0.5 + 0.5
  return Math.max(0, Math.min(1, swell * 0.7 + Math.sin(t * 7.3) * 0.12))
}

/** `onText` gets the field's whole text: what was typed before, then what was heard. */
export function useVoiceInput(onText: (text: string) => void) {
  const [state, setState] = React.useState<VoiceState>("idle")
  const meter = React.useRef(0)
  const rec = React.useRef<Recognition | null>(null)
  const audio = React.useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const said = React.useRef("")
  const before = React.useRef("")
  const text = React.useRef(onText)
  text.current = onText

  const release = React.useCallback(() => {
    const a = audio.current
    if (a) {
      cancelAnimationFrame(a.raf)
      a.stream.getTracks().forEach((t) => t.stop())
      a.ctx.close().catch(() => {})
      audio.current = null
    }
    meter.current = 0
  }, [])

  React.useEffect(
    () => () => {
      rec.current?.abort()
      release()
      clearTimeout(timer.current)
    },
    [release]
  )

  /** The microphone's loudness on the web, for the beam. */
  async function listenLoudness() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      const read = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const v of data) sum += ((v - 128) / 128) ** 2
        meter.current = Math.min(1, Math.sqrt(sum / data.length) * 5)
        if (audio.current) audio.current.raf = requestAnimationFrame(read)
      }
      audio.current = { stream, ctx, raf: requestAnimationFrame(read) }
    } catch {
      // No loudness: the beam keeps a synthetic voice.
    }
  }

  function start(current: string) {
    if (state !== "idle") return
    before.current = current.trim() ? `${current.trim()} ` : ""
    said.current = ""
    const r = recogniser()
    rec.current = r
    if (r) {
      r.continuous = true
      r.interimResults = true
      r.lang = "en-US"
      r.onresult = (e) => {
        said.current = Array.from(e.results, (x) => x[0].transcript).join("")
        text.current(before.current + said.current)
      }
      r.onerror = () => {}
      r.onend = () => {
        rec.current = null
        release()
        setState("idle")
      }
      r.start()
      listenLoudness()
    }
    setState("listening")
  }

  /** Stop listening: a short "processing" while the last words settle. */
  function stop() {
    if (state !== "listening") return
    setState("processing")
    const r = rec.current
    timer.current = setTimeout(() => {
      if (r) {
        r.stop()
        return
      }
      text.current(before.current + SAMPLE)
      setState("idle")
    }, r ? 500 : 900)
  }

  const level = React.useCallback(() => (audio.current ? meter.current : synthetic()), [])

  return { state, start, stop, level }
}
