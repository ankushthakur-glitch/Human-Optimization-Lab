import * as React from "react"
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from "react-native"
import Svg, { Path } from "react-native-svg"

import { upgradeTab, useExperience } from "@/lib/experience"
import { useOnboarding } from "@/lib/onboarding"
import { color, font, ink, space, type } from "@/lib/theme"

/* The short walk through shown once, the first time home opens after
   setup: the screen dims, one part of it stays lit, and a card beside it
   says what it does, "1 of 3" with Skip and Next. Three stops: the tab
   bar, the assistant's orb, and her photo, which opens her account.

   The parts it points at register themselves with useTourTarget (the tab
   bar in tab-bar.tsx, the photo in home-header.tsx); TabScreen provides
   the context and draws the tour over everything. Finishing or skipping
   records "app-tour" in `dismissed`, so it never shows again; a demo seed
   clears that, so a fresh review sees it. */

export type TourTarget = "tabs" | "assistant" | "account"

type Tour = { register: (id: TourTarget, view: View | null) => void }
const TourContext = React.createContext<Tour | null>(null)

/** A ref for the part of the screen a tour stop lights up. */
export function useTourTarget(id: TourTarget) {
  const tour = React.useContext(TourContext)
  return React.useCallback(
    (view: View | null) => tour?.register(id, view),
    [tour, id]
  )
}

const SEEN = "app-tour"

type Stop = { target: TourTarget; title: string; body: string }

function stopsFor(member: boolean, namesAsk: boolean): Stop[] {
  return [
    {
      target: "tabs",
      title: "Find your way around",
      body: member
        ? "Home is your day. To do lists what is open, Record holds your results, Connect links your doctors and devices, and Plan is your plan with Dr. Patel."
        : "Home is your day. To do lists what is open, Record holds your results, Connect links your doctors and devices, and Upgrade shows what a membership adds.",
    },
    {
      target: "assistant",
      title: namesAsk ? "Ask Inlay" : "Ask your health assistant",
      body: member
        ? "Tap the circle to ask about your results, medicines, visits or plan."
        : "Tap the circle to ask about your results, medicines or visits. The ring fills as you use this week's AI credit.",
    },
    {
      target: "account",
      title: "Your account",
      body: "Tap your photo for your profile, who can see your record, and your settings.",
    },
  ]
}

/** Wraps a tab's page: gives its parts useTourTarget and, on home, draws
    the tour over them until she has seen it. */
export function TourHost({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  const onboarding = useOnboarding()
  const member = !upgradeTab(useExperience())
  const root = React.useRef<View>(null)
  const views = React.useRef<Partial<Record<TourTarget, View>>>({})
  const [size, setSize] = React.useState<{ width: number; height: number }>()
  const [step, setStep] = React.useState(0)
  const [hole, setHole] = React.useState<LayoutRectangle>()
  const [open, setOpen] = React.useState(false)
  const fade = React.useRef(new Animated.Value(0)).current

  const show = active && !onboarding.dismissed?.[SEEN]
  const stops = stopsFor(member, !!onboarding.demo?.tourNamesAsk)
  const stop = stops[step]
  const targetId = stop?.target

  const tour = React.useMemo<Tour>(
    () => ({
      register(id, view) {
        if (view) views.current[id] = view
        else delete views.current[id]
      },
    }),
    []
  )

  // Waits a moment after home opens, so the page has laid out and the
  // patient has seen it before it dims.
  React.useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(t)
  }, [show])

  // The lit part, measured against the tour's own frame (both in window
  // terms, then subtracted), so it lines up on a phone and inside the web
  // build's drawn phone alike.
  React.useEffect(() => {
    if (!open || !targetId) return
    const target = views.current[targetId]
    if (!target || !root.current) return setHole(undefined)
    root.current.measureInWindow((rx, ry) => {
      target.measureInWindow((x, y, width, height) =>
        setHole({ x: x - rx, y: y - ry, width, height })
      )
    })
  }, [open, targetId, size?.width, size?.height])

  React.useEffect(() => {
    if (open && hole)
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start()
  }, [open, hole, fade])

  const finish = () => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setOpen(false))
    onboarding
      .save({
        dismissed: {
          ...onboarding.dismissed,
          [SEEN]: new Date().toISOString(),
        },
      })
      .catch(() => {})
  }
  const next = () => (step < stops.length - 1 ? setStep(step + 1) : finish())

  return (
    <TourContext.Provider value={tour}>
      <View
        ref={root}
        style={styles.fill}
        onLayout={(e) => setSize(e.nativeEvent.layout)}
      >
        {children}
        {show && open && hole && size && stop && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
            <Spotlight hole={hole} width={size.width} height={size.height} />
            <Card
              stop={stop}
              index={step}
              count={stops.length}
              hole={hole}
              width={size.width}
              height={size.height}
              onNext={next}
              onSkip={finish}
            />
          </Animated.View>
        )}
      </View>
    </TourContext.Provider>
  )
}

/** The dimmed screen with a rounded window cut round the lit part. The
    Svg is drawn at the measured size, never a percentage (iOS keeps an
    Svg's first size). Taps on the dim go nowhere, so the tour is the only
    thing to answer. */
function Spotlight({
  hole,
  width,
  height,
}: {
  hole: LayoutRectangle
  width: number
  height: number
}) {
  const pad = 6
  const x = hole.x - pad
  const y = hole.y - pad
  const w = hole.width + pad * 2
  const h = hole.height + pad * 2
  const r = Math.min(h / 2, 32)
  const cut =
    `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} ` +
    `A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} ` +
    `V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`
  return (
    <View
      style={StyleSheet.absoluteFill}
      onStartShouldSetResponder={() => true}
    >
      <Svg width={width} height={height}>
        <Path
          d={`M0,0 H${width} V${height} H0 Z ${cut}`}
          fill={SCRIM}
          fillRule="evenodd"
        />
        <Path
          d={cut}
          fill="none"
          stroke={color.onPrimary}
          strokeOpacity={0.9}
          strokeWidth={2}
        />
      </Svg>
    </View>
  )
}

/** The card beside the lit part: above it when the part sits low on the
    screen, below it otherwise, with a small pointer at the part's centre. */
function Card({
  stop,
  index,
  count,
  hole,
  width,
  height,
  onNext,
  onSkip,
}: {
  stop: Stop
  index: number
  count: number
  hole: LayoutRectangle
  width: number
  height: number
  onNext: () => void
  onSkip: () => void
}) {
  const above = hole.y + hole.height / 2 > height / 2
  const gap = 18
  const cardWidth = Math.min(width - space.gutter * 2, 340)
  const left = Math.min(
    Math.max(hole.x + hole.width / 2 - cardWidth / 2, space.gutter),
    width - space.gutter - cardWidth
  )
  const pointer = Math.min(
    Math.max(hole.x + hole.width / 2 - left - 7, 20),
    cardWidth - 34
  )
  const last = index === count - 1
  const place = above
    ? { bottom: height - hole.y + gap }
    : { top: hole.y + hole.height + gap }

  return (
    <View
      style={[styles.card, { width: cardWidth, left }, place]}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.pointer,
          { left: pointer },
          above ? { bottom: -6 } : { top: -6 },
        ]}
      />
      <Text style={styles.title} accessibilityRole="header">
        {stop.title}
      </Text>
      <Text style={styles.body}>{stop.body}</Text>
      <View style={styles.foot}>
        <Text style={styles.count}>{`${index + 1} of ${count}`}</Text>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          hitSlop={10}
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}
        >
          <Text style={styles.nextText}>{last ? "Done" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const SCRIM = "rgba(11, 18, 20, 0.62)"

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: {
    position: "absolute",
    backgroundColor: color.background,
    borderRadius: 16,
    padding: space.gutter,
    gap: space.stack,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.18)",
  },
  pointer: {
    position: "absolute",
    width: 14,
    height: 14,
    backgroundColor: color.background,
    transform: [{ rotate: "45deg" }],
    borderRadius: 2,
  },
  title: { ...type.section },
  body: { ...type.body },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.item,
    marginTop: space.item,
  },
  count: { ...type.meta, flex: 1, fontVariant: ["tabular-nums"] },
  skip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: space.stack,
  },
  skipText: { ...type.link, color: ink.secondary },
  pressed: { opacity: 0.7 },
  next: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: space.section,
    borderRadius: 8,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  nextPressed: { backgroundColor: color.primaryPressed },
  nextText: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: color.onPrimary,
  },
})
