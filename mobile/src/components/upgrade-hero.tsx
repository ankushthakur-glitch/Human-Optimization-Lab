import * as React from "react"
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from "react-native"
import Svg, { ClipPath, Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg"

import { CrownSimple } from "@/components/ph"
import { BARS, CARDS, GRAPHS, HERO_H, HERO_W, ICONS, LINKS } from "@/lib/hero-geometry"
import { color, font, ink, space } from "@/lib/theme"

/* The upgrade page's banner: an "Upgrade to Premium" badge over the supplied
   picture. The picture is the whole banner, headline included ("A healthier
   tomorrow built from your data"), drawn at the card's full width in its own
   16:9 shape so it is never stretched, never wider than a tablet column, and
   read aloud as one header.

   The picture itself never moves. Only light moves over the things in it
   (lib/hero-geometry.ts says where they are): a soft glint sweeps across each
   data card in turn, a ring breathes out from each icon, a point of light
   runs along the lines that join the cards and along the two small graphs,
   and the bars of the chart rise one after another. The badge catches a
   glint too. All of it is quiet, and all of it stands still for someone who
   has reduced motion on. */

const HERO = require("../../assets/images/upgrade-hero.png")

/** An SVG shape that can be animated. The animated wrapper hands its shape a
    `collapsable` flag the web build would write onto the page as a bad
    attribute, so it is dropped on the way in. */
function animated<P extends object>(Shape: React.ComponentType<P>) {
  const Inner = React.forwardRef<unknown, P & { collapsable?: boolean }>(({ collapsable: _drop, ...rest }, ref) => <Shape ref={ref as never} {...(rest as unknown as P)} />)
  Inner.displayName = "AnimatedShape"
  return Animated.createAnimatedComponent(Inner)
}
const ACircle = animated(Circle)
const ARect = animated(Rect)
const APath = animated(Path)

const TEAL = "#2FC4B2"

/** A value that runs 0 to 1 once, rests, and starts over, after a first delay. */
const run = (v: Animated.Value, ms: number, rest: number, start = 0, easing: (t: number) => number = Easing.inOut(Easing.quad)) =>
  Animated.loop(
    Animated.sequence([
      Animated.delay(start),
      Animated.timing(v, { toValue: 1, duration: ms, easing, useNativeDriver: false }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: false }),
      Animated.delay(rest),
    ])
  )

/** One value per effect, each looping on its own beat so they never line up. */
function useBeats(n: number, make: (v: Animated.Value, i: number) => Animated.CompositeAnimation) {
  const values = React.useRef(Array.from({ length: n }, () => new Animated.Value(0))).current
  React.useEffect(() => {
    const loops = values.map((v, i) => make(v, i))
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
    // The beats are fixed for the life of the banner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values])
  return values
}

/** The light that moves over the picture, in the picture's own coordinates. */
function HeroMotion() {
  const glints = useBeats(CARDS.length, (v, i) => run(v, 1100, 3600, 700 + i * 1100))
  const rings = useBeats(ICONS.length, (v, i) => run(v, 2200, 1800, i * 900, Easing.out(Easing.quad)))
  const links = useBeats(LINKS.length, (v, i) => run(v, Math.round(LINKS[i].len * 6) + 900, 1800 + i * 400, i * 600, Easing.inOut(Easing.sin)))
  const graphs = useBeats(GRAPHS.length, (v, i) => run(v, 1500, 3200, 1500 + i * 1400, Easing.inOut(Easing.sin)))
  const bars = useBeats(BARS.length, (v, i) => run(v, 700, 3600, 2000 + i * 260, Easing.out(Easing.quad)))

  return (
    <Svg style={styles.motion} viewBox={`0 0 ${HERO_W} ${HERO_H}`} preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="glint" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
        {CARDS.map((c) => (
          <ClipPath key={c.id} id={`clip-${c.id}`}>
            <Rect x={c.x} y={c.y} width={c.w} height={c.h} rx={c.r} />
          </ClipPath>
        ))}
      </Defs>

      {/* The lines that join the cards: a point of light runs along each. */}
      {LINKS.map((l, i) => {
        const offset = links[i].interpolate({ inputRange: [0, 1], outputRange: [0, -(l.len + 40)] })
        // Unseen while resting, in and out softly while it runs.
        const seen = links[i].interpolate({ inputRange: [0, 0.04, 0.9, 1], outputRange: [0, 1, 1, 0] })
        return (
          <G key={l.id}>
            <APath d={l.d} fill="none" stroke={TEAL} strokeWidth={16} strokeOpacity={seen.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] })} strokeLinecap="round" strokeDasharray="1 5000" strokeDashoffset={offset} />
            <APath d={l.d} fill="none" stroke="#7AF0E2" strokeWidth={6} strokeOpacity={seen} strokeLinecap="round" strokeDasharray="1 5000" strokeDashoffset={offset} />
          </G>
        )
      })}

      {/* The two small graphs: a dot runs up the line. */}
      {GRAPHS.map((g, i) => {
        const offset = graphs[i].interpolate({ inputRange: [0, 1], outputRange: [0, -g.len] })
        const seen = graphs[i].interpolate({ inputRange: [0, 0.06, 0.9, 1], outputRange: [0, 1, 1, 0] })
        return (
          <G key={g.id}>
            <APath d={g.d} fill="none" stroke={TEAL} strokeWidth={14} strokeOpacity={seen.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] })} strokeLinecap="round" strokeDasharray="1 5000" strokeDashoffset={offset} />
            <APath d={g.d} fill="none" stroke="#1FA89A" strokeWidth={6} strokeOpacity={seen} strokeLinecap="round" strokeDasharray="1 5000" strokeDashoffset={offset} />
          </G>
        )
      })}

      {/* The bars of the chart rise one after another. */}
      {BARS.map((b, i) => (
        <ARect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={TEAL} fillOpacity={bars[i].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.38, 0] })} />
      ))}

      {/* A ring breathes out from each icon. */}
      {ICONS.map((ic, i) => (
        <ACircle
          key={ic.id}
          cx={ic.cx}
          cy={ic.cy}
          r={rings[i].interpolate({ inputRange: [0, 1], outputRange: [ic.r, ic.r + 22] })}
          fill="none"
          stroke={ic.hue}
          strokeWidth={4}
          strokeOpacity={rings[i].interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] })}
        />
      ))}

      {/* A soft glint sweeps across each data card in turn. */}
      {CARDS.map((c, i) => (
        <G key={c.id} clipPath={`url(#clip-${c.id})`}>
          <ARect y={c.y} width={70} height={c.h} fill="url(#glint)" x={glints[i].interpolate({ inputRange: [0, 1], outputRange: [c.x - 80, c.x + c.w + 10] })} />
        </G>
      ))}
    </Svg>
  )
}

export function UpgradeHero() {
  const [still, setStill] = React.useState(false)
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {})
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setStill)
    return () => sub.remove()
  }, [])

  const glint = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    if (still) return
    const shine = run(glint, 900, 2800)
    shine.start()
    return () => shine.stop()
  }, [still, glint])

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <CrownSimple size={14} weight="fill" color={color.primary} />
        <Text style={styles.badgeText} maxFontSizeMultiplier={1.15}>
          Upgrade to Premium
        </Text>
        <Animated.View style={[styles.glint, { transform: [{ translateX: glint.interpolate({ inputRange: [0, 1], outputRange: [-30, 150] }) }, { rotate: "18deg" }] }]} />
      </View>

      <View style={styles.hero} accessible accessibilityRole="header" accessibilityLabel="A healthier tomorrow built from your data">
        <Image source={HERO} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
        {!still && <HeroMotion />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.item },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: color.primaryTint,
    borderWidth: 1,
    borderColor: color.primaryHalo,
  },
  badgeText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.primary },
  glint: { position: "absolute", top: -6, bottom: -6, width: 14, backgroundColor: "rgba(255,255,255,0.7)" },
  // The picture's own 16:9 (1672 by 941): it fills the width and keeps its
  // shape; on a wide screen it stops at a comfortable size and centres.
  hero: { width: "100%", maxWidth: 560, alignSelf: "center", aspectRatio: HERO_W / HERO_H, borderRadius: 16, overflow: "hidden", backgroundColor: "#FDFEFE", borderWidth: 1, borderColor: "#E6F0EE" },
  image: { width: "100%", height: "100%" },
  motion: { ...StyleSheet.absoluteFill, pointerEvents: "none" },
})
