import * as React from "react"
import { Linking, Platform } from "react-native"

/* Speaking a question into the chat bar, as voice typing in a messaging
   app: tap the microphone, speak, and the words are written into the field
   as they are heard. Nothing is sent: when it stops the patient reads the
   text, edits it and sends it with the bar's own send button.

   On the phone the OS recogniser does the work (expo-speech-recognition:
   Android SpeechRecognizer, iOS SFSpeechRecognizer) and needs a development
   build; permission is asked on the first tap, and a refusal comes back as
   a `problem` the bar words for the patient. On the web build the browser's
   speech recognition writes the words and the microphone's loudness drives
   the voice beam. Expo Go has no speech recognition, so there (and in a
   browser without it) the bar listens for show: the beam follows a
   synthetic voice and, when stopped, a sample question is written in. */

export type VoiceState = "idle" | "listening" | "processing"

/** Something the patient should hear about, and what they can do about it. */
export type VoiceProblem = { words: string; action?: { label: string; onPress: () => void } }

type Native = typeof import("expo-speech-recognition")

let loaded: Native | null | undefined
/** The native recogniser, or null where the app has none (web, Expo Go). */
function native(): Native | null {
  if (Platform.OS === "web") return null
  if (loaded === undefined) {
    try {
      loaded = require("expo-speech-recognition") as Native
    } catch {
      loaded = null
    }
  }
  return loaded
}

/** How long a problem with nothing to fix in Settings stays up, ms. */
const SOFT_MS = 5000

const SETTINGS: VoiceProblem = {
  words: "Microphone access is off. Turn it on in Settings to speak your answer.",
  action: { label: "Open settings", onPress: () => Linking.openSettings() },
}
const NOT_HEARD: VoiceProblem = { words: "Didn't catch that. Tap the microphone and try again." }

/** What the prototype "hears" where nothing can transcribe. */
const SAMPLE = "Why has my LDL gone up since my last test?"

type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
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

/** `onText` gets the field's whole text: what was typed before, then what
    was heard. `sample` is what is written in where nothing can transcribe. */
export function useVoiceInput(onText: (text: string) => void, sample: string = SAMPLE) {
  const [state, setState] = React.useState<VoiceState>("idle")
  const [problem, setProblem] = React.useState<VoiceProblem>()
  const meter = React.useRef(0)
  const rec = React.useRef<Recognition | null>(null)
  const audio = React.useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const settle = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const problemTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // A start is waiting on the permission dialog: ignore further taps.
  const asking = React.useRef(false)
  const said = React.useRef("")
  const before = React.useRef("")
  const text = React.useRef(onText)
  text.current = onText

  const dismiss = React.useCallback(() => {
    clearTimeout(problemTimer.current)
    setProblem(undefined)
  }, [])
  /** Show a problem; a soft one (nothing to fix in Settings) clears itself. */
  const report = React.useCallback((next: VoiceProblem, soft = false) => {
    clearTimeout(problemTimer.current)
    setProblem(next)
    if (soft) problemTimer.current = setTimeout(() => setProblem(undefined), SOFT_MS)
  }, [])

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
      native()?.ExpoSpeechRecognitionModule.abort()
      release()
      clearTimeout(timer.current)
      clearTimeout(settle.current)
      clearTimeout(problemTimer.current)
    },
    [release]
  )

  /* The native recogniser reports through events: the words so far, how
     loud the voice is, an error, the end. */
  React.useEffect(() => {
    const n = native()
    if (!n) return
    const M = n.ExpoSpeechRecognitionModule
    const subs = [
      M.addListener("result", (e) => {
        said.current = e.results[0]?.transcript ?? ""
        text.current(before.current + said.current)
      }),
      M.addListener("volumechange", (e) => {
        // -2 to 10; at or below 0 is inaudible.
        meter.current = Math.max(0, Math.min(1, e.value / 10))
      }),
      M.addListener("error", (e) => {
        if (e.error === "aborted") return
        if (e.error === "not-allowed") report(SETTINGS)
        else if (e.error === "no-speech" || e.error === "speech-timeout") report(NOT_HEARD, true)
        else if (e.error === "network") report({ words: "Voice typing needs a connection. Check it and try again." }, true)
        else if (e.error === "service-not-allowed" || e.error === "language-not-supported") report({ words: "Voice typing isn't available on this device." })
        else report({ words: "Voice typing stopped. Tap the microphone to try again." }, true)
      }),
      M.addListener("end", () => {
        clearTimeout(settle.current)
        meter.current = 0
        setState("idle")
      }),
    ]
    return () => subs.forEach((s) => s.remove())
  }, [report])

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

  // "Try again" after a refused permission listens again, with the field as it was.
  const again = React.useRef<() => void>(() => {})

  /** Ask for the microphone and speech recognition, then listen. */
  async function startNative(n: Native) {
    const M = n.ExpoSpeechRecognitionModule
    if (!M.isRecognitionAvailable()) {
      report({ words: "Voice typing isn't available on this device." })
      return
    }
    asking.current = true
    try {
      let p = await M.getPermissionsAsync()
      if (!p.granted) p = await M.requestPermissionsAsync()
      if (!p.granted) {
        // Only Settings can turn it on once the OS will not ask again.
        report(p.canAskAgain ? { words: "Allow the microphone to speak your answer.", action: { label: "Try again", onPress: () => again.current() } } : SETTINGS)
        return
      }
      M.start({ lang: "en-US", interimResults: true, continuous: false, addsPunctuation: true, volumeChangeEventOptions: { enabled: true, intervalMillis: 80 } })
      setState("listening")
    } catch {
      report({ words: "Voice typing isn't available right now. Tap the microphone to try again." }, true)
    } finally {
      asking.current = false
    }
  }

  function start(current: string) {
    if (state !== "idle" || asking.current) return
    dismiss()
    before.current = current.trim() ? `${current.trim()} ` : ""
    said.current = ""
    again.current = () => start(current)
    const n = native()
    if (n) {
      startNative(n)
      return
    }
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
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          report({ words: "Microphone access is blocked. Allow it for this site in your browser's settings." })
        } else if (e.error === "no-speech") {
          report(NOT_HEARD, true)
        }
      }
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
    const n = native()
    if (n) {
      // The last words settle, then "end" arrives; if it never does, go idle anyway.
      n.ExpoSpeechRecognitionModule.stop()
      settle.current = setTimeout(() => setState("idle"), 2500)
      return
    }
    const r = rec.current
    timer.current = setTimeout(() => {
      if (r) {
        r.stop()
        return
      }
      text.current(before.current + sample)
      setState("idle")
    }, r ? 500 : 900)
  }

  const level = React.useCallback(() => (audio.current || native() ? meter.current : synthetic()), [])

  return { state, start, stop, level, problem, dismiss }
}
