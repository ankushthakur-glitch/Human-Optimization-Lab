import { useLocalSearchParams } from "expo-router"
import * as React from "react"
import { View } from "react-native"

import { filmSeconds, FilmFrame, isFilm } from "@/components/film-frames"

/* The videos' render page: one frame of a film (?film=welcome or
   ?film=flourishing), held at a time the render script sets
   (scripts/render-film.mjs calls window.filmAt(t) and screenshots #film).
   Outside every guard, and never linked from the app. */

const FILM_W = 400
const FILM_H = 312

export default function FilmRender() {
  const { film } = useLocalSearchParams<{ film?: string }>()
  const name = isFilm(film) ? film : "welcome"
  const [t, setT] = React.useState(0)
  React.useEffect(() => {
    const w = globalThis as unknown as { filmAt?: (t: number) => Promise<void>; filmSeconds?: number }
    w.filmSeconds = filmSeconds(name)
    w.filmAt = (next) =>
      new Promise((done) => {
        setT(next)
        requestAnimationFrame(() => requestAnimationFrame(() => done()))
      })
    return () => {
      delete w.filmAt
    }
  }, [name])
  return (
    <View style={{ flex: 1, alignItems: "flex-start", justifyContent: "flex-start", backgroundColor: "#FFFFFF" }}>
      <View nativeID="film" style={{ width: FILM_W, height: FILM_H }}>
        <FilmFrame film={name} t={t} w={FILM_W} h={FILM_H} />
      </View>
    </View>
  )
}
