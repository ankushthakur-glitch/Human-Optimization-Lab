import * as React from "react"
import { AccessibilityInfo } from "react-native"
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg"

import { hex, mix, rgba, type Rgb } from "@/components/voiceorbs/color"

/* The Siri Wave Line orb from VoiceOrbs (MIT, see LICENSE here): four sine
   waves that swell and drift across a baseline. Ported from its canvas to
   SVG paths so it runs everywhere react-native-svg does, fixed in the
   original's "thinking" state and its light theme drawing. The waves keep
   the original's proportions to the width; the height only needs to be a
   third of it. */

const CURVES = 4
const SAMPLES = 60
const BASE_CENTER = [-0.35, 0.4, 0.05, -0.7]
const FREQ_MUL = [1, 1.3, 0.75, 1.55]
const FLOW_MUL = [1, 1.2, 0.85, 1.4]
const WOBBLE_RATE = [1.3, 1.7, 2.1, 1.1]
const SEED = [0.3, 2.1, 4.2, 5.4]
const FACTOR = [1, 0.85, 0.7, 0.55]
const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

/** Inlay colours: light petrol into mint. */
export const WAVE_FROM = "#3A6670"
export const WAVE_TO = "#9FF0DC"

export function SiriWaveLine({ width, from = WAVE_FROM, to = WAVE_TO }: { width: number; from?: string; to?: string }) {
  const id = React.useId().replace(/:/g, "")
  const height = Math.round(width * 0.34)
  const [t, setT] = React.useState(0)

  React.useEffect(() => {
    let raf = 0
    let live = true
    const start = Date.now()
    const loop = () => {
      setT((Date.now() - start) / 1000)
      raf = requestAnimationFrame(loop)
    }
    AccessibilityInfo.isReduceMotionEnabled()
      .then((still) => live && !still && loop())
      .catch(() => live && loop())
    return () => {
      live = false
      cancelAnimationFrame(raf)
    }
  }, [])

  /* Colours for the light theme, as the original mixes them. */
  const colors = React.useMemo(() => {
    const a = hex(from)
    const b = hex(to)
    const palette: Rgb[] = [a, b, mix(a, b, 0.5), mix(mix(a, b, 0.25), WHITE, 0.2)]
    const fill = palette.map((c) => mix(c, BLACK, 0.2))
    return { fill, line: fill.map((c) => mix(c, BLACK, 0.18)), base: mix(mix(a, b, 0.5), BLACK, 0.25) }
  }, [from, to])

  const pad = width * 0.04
  const cy = height / 2
  const halfH = width * 0.5
  const unit = width / 168

  const paths = []
  for (let k = CURVES - 1; k >= 0; k -= 1) {
    const wob = 1 - 0.15 * (0.5 + 0.5 * Math.sin(t * WOBBLE_RATE[k] + SEED[k]))
    const amp = 0.22 * FACTOR[k] * wob * halfH
    const center = Math.sin(t * 1.3 + k * 1.35) * 1.2
    const freq = 3.4 * FREQ_MUL[k]
    const phase = SEED[k] + t * 2 * FLOW_MUL[k]
    const top: string[] = []
    const bottom: string[] = []
    for (let j = 0; j < SAMPLES; j += 1) {
      const u = j / (SAMPLES - 1)
      const x = pad + u * (width - pad * 2)
      const xn = (u * 2 - 1) * 2
      const e = 1 - (u * 2 - 1) ** 2
      const q = (xn - center) / 0.5
      const env = 2 / (2 + q ** 4)
      const y = amp * env * env * e * e * Math.sin(freq * xn - phase)
      top.push(`${x.toFixed(2)},${(cy - y).toFixed(2)}`)
      bottom.unshift(`${x.toFixed(2)},${(cy + y).toFixed(2)}`)
    }
    const d = `M${top.join("L")}L${bottom.join("L")}Z`
    paths.push(
      <React.Fragment key={k}>
        <Path d={d} fill={rgba(colors.fill[k], 1)} fillOpacity={0.35} />
        <Path d={d} fill="none" stroke={`url(#${id}g${k})`} strokeOpacity={0.14} strokeWidth={4.5 * unit} />
        <Path d={d} fill="none" stroke={`url(#${id}l${k})`} strokeOpacity={0.85} strokeWidth={1.1 * unit} />
      </React.Fragment>
    )
  }

  /* Each stroke fades out toward both ends, as in the original. */
  const edge = (key: string, c: Rgb) => (
    <LinearGradient key={key} id={key} x1={pad} x2={width - pad} y1={0} y2={0} gradientUnits="userSpaceOnUse">
      <Stop offset="0" stopColor={rgba(c, 1)} stopOpacity={0} />
      <Stop offset="0.18" stopColor={rgba(c, 1)} stopOpacity={0.55} />
      <Stop offset="0.5" stopColor={rgba(c, 1)} stopOpacity={1} />
      <Stop offset="0.82" stopColor={rgba(c, 1)} stopOpacity={0.55} />
      <Stop offset="1" stopColor={rgba(c, 1)} stopOpacity={0} />
    </LinearGradient>
  )

  return (
    <Svg width={width} height={height}>
      <Defs>
        {colors.fill.map((c, k) => edge(`${id}g${k}`, c))}
        {colors.line.map((c, k) => edge(`${id}l${k}`, c))}
        {edge(`${id}b`, colors.base)}
      </Defs>
      <Rect x={pad} y={cy - 0.5 * unit} width={width - pad * 2} height={unit} fill={`url(#${id}b)`} opacity={0.52} />
      {paths}
    </Svg>
  )
}
