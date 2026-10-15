"use client"

import * as React from "react"

/* Speak to write on the browser's own speech recognition (Chrome, Edge,
   Safari). Words land in the draft as they are heard: interim words are
   replaced as the recogniser settles, final words stay. */

type Alternative = { transcript: string }
type Result = { isFinal: boolean; 0: Alternative }
type ResultEvent = { resultIndex: number; results: ArrayLike<Result> }

type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: ResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function useDictation({
  onText,
  onError,
}: {
  /** The draft as it should read now: the text before dictation plus what was heard. */
  onText: (text: string) => void
  onError: (message: string) => void
}) {
  const [listening, setListening] = React.useState(false)
  const rec = React.useRef<Recognition | null>(null)
  const handlers = React.useRef({ onText, onError })
  React.useEffect(() => {
    handlers.current = { onText, onError }
  })

  React.useEffect(() => () => rec.current?.abort(), [])

  function start(base: string) {
    const Ctor = recognitionCtor()
    if (!Ctor) {
      handlers.current.onError("Speech to text isn't supported in this browser")
      return
    }
    const r = new Ctor()
    r.continuous = true
    r.interimResults = true
    r.lang = "en-US"
    const lead = base && !/\s$/.test(base) ? `${base} ` : base
    let heard = ""
    r.onresult = (event) => {
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!
        if (result.isFinal) heard += result[0].transcript
        else interim += result[0].transcript
      }
      handlers.current.onText(
        `${lead}${heard}${interim}`.replace(/ {2,}/g, " ")
      )
    }
    r.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      )
        handlers.current.onError(
          "Allow microphone access to use speak to write"
        )
      else if (event.error !== "aborted" && event.error !== "no-speech")
        handlers.current.onError("Couldn't hear that, try again")
    }
    r.onend = () => {
      rec.current = null
      setListening(false)
    }
    rec.current = r
    r.start()
    setListening(true)
  }

  function stop() {
    rec.current?.stop()
  }

  return { listening, start, stop }
}
