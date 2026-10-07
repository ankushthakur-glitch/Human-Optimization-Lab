import * as React from "react"
import { AccessibilityInfo, Animated, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg"

/* The portal library's Voice beam (src/design-system/ui/voice-beam.tsx,
   from `voice-glow`) drawn for the app: that one is DOM and CSS, so this
   is the same idea in react-native-svg. A row of soft colour lobes sits at
   the bottom edge of the wrapped field and rises with the voice: the
   centre lobe follows the lows, its neighbours the mids, the outer pair the
   highs, so a voice ripples outward; while heard the colours flow sideways.
   `processing` gathers the lobes into one beam that travels the edge and
   back, as the library's processing state. A thin line of the same colours
   runs along the edge. Still (one soft glow) when the phone asks for
   reduced motion. Values are written straight to Animated values each
   frame, so nothing re-renders while it plays. */

/** Inlay's palette for the beam, left to right: lavender, sky, the brand
    teal at the centre, mint, sky. */
export const BEAM_COLORS = ["#B8A9F5", "#7CC8F8", "#01837E", "#5FD1C2", "#8FD8F0"] as const

/** Lobe size at rest, px; the band each lobe follows (0 lows, 1 mids, 2 highs). */
const LOBE_W = 120
const LOBE_H = 64
const BAND = [2, 1, 0, 1, 2]
const SPACING = 40

/* chat.tsx has the same hook, but it draws this beam, so keep the import one way. */
function useStill() {
  const [still, setStill] = React.useState(false)
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {})
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setStill)
    return () => sub.remove()
  }, [])
  return still
}

export function VoiceBeam({
  level,
  active = true,
  processing = false,
  radius = 8,
  children,
  style,
}: {
  /** 0 to 1, sampled every frame. */
  level: () => number
  /** Off: the glow fades out. */
  active?: boolean
  processing?: boolean
  /** The wrapped field's corner radius, so the glow keeps inside it. */
  radius?: number
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const still = useStill()
  const [width, setWidth] = React.useState(0)
  const lobes = React.useRef(
    BEAM_COLORS.map(() => ({ x: new Animated.Value(0), sy: new Animated.Value(0.2), sx: new Animated.Value(1), o: new Animated.Value(0) }))
  ).current
  const line = React.useRef(new Animated.Value(0)).current

  // The latest props for the frame loop, without restarting it.
  const live = React.useRef({ level, active, processing, width })
  live.current = { level, active, processing, width }

  React.useEffect(() => {
    let frame = 0
    let last = performance.now()
    let shown = 0
    let gather = 0
    let flow = 0
    const bands = [0, 0, 0]
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const p = live.current
      const t = now / 1000
      const raw = p.active ? Math.max(0, Math.min(1, p.level())) : 0
      // Attack fast, release slow, as the library's defaults (0.1 s / 0.5 s).
      const target = p.processing ? 0.55 : raw
      const ease = (to: number, from: number) => from + (to - from) * Math.min(1, dt / (to > from ? 0.1 : 0.5))
      // Bands synthesised from the one level, each with its own wobble.
      bands[0] = ease(target * (0.85 + Math.sin(t * 5.1) * 0.15), bands[0])
      bands[1] = ease(target * (0.7 + Math.sin(t * 7.7 + 1) * 0.3), bands[1])
      bands[2] = ease(target * (0.55 + Math.sin(t * 11.3 + 2) * 0.45), bands[2])
      shown += ((p.active ? 1 : 0) - shown) * Math.min(1, dt / 0.25)
      gather += ((p.processing ? 1 : 0) - gather) * Math.min(1, dt / 0.6)
      if (!still) flow += dt * 60 * (0.25 + bands[0])

      const span = Math.max(1, p.width)
      const ring = SPACING * BEAM_COLORS.length
      // Processing: one beam sweeping the edge, eased into each turn.
      const sweep = Math.sin(t * Math.PI / 1.1) * Math.min(span * 0.36, 140)
      lobes.forEach((l, i) => {
        const rest = (i - 2) * SPACING
        const flowed = still ? rest : ((((rest + flow + ring / 2) % ring) + ring) % ring) - ring / 2
        const b = bands[BAND[i]]
        l.x.setValue(flowed * (1 - gather) * (1 + b * 0.6) + sweep * gather)
        l.sy.setValue(still ? 0.6 : 0.25 + b * 1.15 + gather * 0.1)
        l.sx.setValue(1 + b * 0.5 - gather * 0.45)
        l.o.setValue(shown * (still ? 0.7 : 0.35 + b * 0.65))
      })
      line.setValue(shown * (0.45 + bands[0] * 0.55))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [still, lobes, line])

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  return (
    <View style={style} onLayout={onLayout}>
      {children}
      <View pointerEvents="none" style={[styles.clip, { borderRadius: radius }]}>
        {lobes.map((l, i) => (
          <Animated.View
            key={i}
            style={[
              styles.lobe,
              {
                left: width / 2 - LOBE_W / 2,
                opacity: l.o,
                // Grow up from the edge: scale about the lobe's bottom.
                transform: [{ translateX: l.x }, { translateY: LOBE_H / 2 }, { scaleX: l.sx }, { scaleY: l.sy }, { translateY: -LOBE_H / 2 }],
              },
            ]}
          >
            <Svg width={LOBE_W} height={LOBE_H}>
              <Defs>
                {/* Centred on the ellipse, whose top half is all that shows: the
                    bounding box stretches the circle to the ellipse. */}
                <RadialGradient id={`beam${i}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <Stop offset="0" stopColor={BEAM_COLORS[i]} stopOpacity={0.6} />
                  <Stop offset="0.5" stopColor={BEAM_COLORS[i]} stopOpacity={0.24} />
                  <Stop offset="1" stopColor={BEAM_COLORS[i]} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={LOBE_W / 2} cy={LOBE_H} rx={LOBE_W / 2} ry={LOBE_H} fill={`url(#beam${i})`} />
            </Svg>
          </Animated.View>
        ))}
        {/* The edge stroke: the palette along the bottom, faded at the ends. */}
        <Animated.View style={[styles.line, { opacity: line }]}>
          <Svg width="100%" height={2}>
            <Defs>
              <LinearGradient id="beamLine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={BEAM_COLORS[0]} stopOpacity={0} />
                <Stop offset="0.2" stopColor={BEAM_COLORS[0]} />
                <Stop offset="0.4" stopColor={BEAM_COLORS[1]} />
                <Stop offset="0.5" stopColor={BEAM_COLORS[2]} />
                <Stop offset="0.65" stopColor={BEAM_COLORS[3]} />
                <Stop offset="0.8" stopColor={BEAM_COLORS[4]} />
                <Stop offset="1" stopColor={BEAM_COLORS[4]} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height={2} fill="url(#beamLine)" />
          </Svg>
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  lobe: { position: "absolute", bottom: 0, width: LOBE_W, height: LOBE_H },
  line: { position: "absolute", left: 0, right: 0, bottom: 0, height: 2 },
})
