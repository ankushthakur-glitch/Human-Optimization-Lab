import { useEvent } from "expo"
import { VideoView, type VideoPlayer } from "expo-video"
import * as React from "react"
import { BackHandler, PanResponder, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native"

import { ArrowsInSimple, ArrowsOutSimple, ArrowClockwise, ArrowCounterClockwise, Pause, Play, X } from "@/components/ph"
import { color, font, space } from "@/lib/theme"

/* A move's reference clip, opened from its card as a popup with play, pause
   and an expand button. It is a layer over the screen, not a native modal,
   so the web build keeps it inside the drawn phone (as the Sheet does).
   Expand makes it the full view, turned on its side to fill the phone
   horizontally, with the controls a streaming app has: play and pause, 10
   seconds back and forward, a bar to scrub along with the time, and
   controls that fade while it plays and return on a tap. The popup and the
   full view share one player, so expanding carries on from the same frame. */

const SKIP = 10
const HIDE_AFTER = 3000
const DOT = 14
const SCRIM = "rgba(0,0,0,0.45)"

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export function ExerciseVideoModal({ visible, player, title, ratio, onClose }: { visible: boolean; player: VideoPlayer; title: string; ratio: number; onClose: () => void }) {
  const [full, setFull] = React.useState(false)
  // Switching views draws the picture afresh, which would restart it paused;
  // where it was and whether it was playing are put back once it is up.
  const carry = React.useRef<{ at: number; playing: boolean } | null>(null)
  const switchTo = React.useCallback(
    (to: boolean) => {
      carry.current = { at: player.currentTime, playing: player.playing }
      setFull(to)
    },
    [player],
  )
  React.useEffect(() => {
    const kept = carry.current
    if (!kept) return
    carry.current = null
    const id = setTimeout(() => {
      player.currentTime = kept.at
      if (kept.playing) player.play()
      else player.pause()
    }, 60)
    return () => clearTimeout(id)
  }, [full, player])

  // Opening always starts in the popup, and plays at once, inside the tap.
  React.useEffect(() => {
    if (!visible) return
    setFull(false)
    player.timeUpdateEventInterval = 0.25
    player.muted = false
    player.play()
    // A browser that refuses to start a clip with sound leaves it paused;
    // playing it muted is allowed, so it runs rather than sitting on a frame.
    const id = setTimeout(() => {
      if (player.playing) return
      player.muted = true
      player.play()
    }, 900)
    return () => clearTimeout(id)
  }, [visible, player])

  const close = React.useCallback(() => {
    player.pause()
    onClose()
  }, [player, onClose])

  // The phone's back button steps out of the full view, then closes.
  React.useEffect(() => {
    if (!visible || Platform.OS === "web") return
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (full) switchTo(false)
      else close()
      return true
    })
    return () => sub.remove()
  }, [visible, full, close, switchTo])

  useDeviceChrome(visible ? (full ? "full" : "popup") : null)

  if (!visible) return null
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      {full ? (
        <FullView player={player} title={title} ratio={ratio} onCollapse={() => switchTo(false)} onClose={close} />
      ) : (
        <Popup player={player} title={title} ratio={ratio} onExpand={() => switchTo(true)} onClose={close} />
      )}
    </View>
  )
}

/** On the web the phone's clock bar and home bar are drawn outside the app
    (public/index.html), so the layer cannot cover them. While a clip is up
    the page dims them for the popup and blacks them out for the full view. */
function useDeviceChrome(mode: "popup" | "full" | null) {
  React.useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !mode) return
    const device = document.getElementById("device")
    device?.classList.add(`video-${mode}`)
    return () => device?.classList.remove(`video-${mode}`)
  }, [mode])
}

/** Play or pause, kept in step with the player however it changes. */
function usePlayback(player: VideoPlayer) {
  // Read from the player on every sign of life, so the button cannot stay
  // on "play" while the clip runs, or the reverse.
  const [isPlaying, setIsPlaying] = React.useState(player.playing)
  React.useEffect(() => {
    const sync = () => setIsPlaying(player.playing)
    sync()
    const subs = [player.addListener("playingChange", sync), player.addListener("statusChange", sync), player.addListener("timeUpdate", sync)]
    return () => subs.forEach((sub) => sub.remove())
  }, [player])
  const toggle = React.useCallback(() => (player.playing ? player.pause() : player.play()), [player])
  return { isPlaying, toggle }
}

/** Where the clip is and how long it runs. */
function useProgress(player: VideoPlayer) {
  const tick = useEvent(player, "timeUpdate", { currentTime: player.currentTime, bufferedPosition: player.bufferedPosition, currentLiveTimestamp: null, currentOffsetFromLive: null })
  // The length is known once the clip has loaded.
  useEvent(player, "statusChange", { status: player.status })
  return { time: tick.currentTime, buffered: tick.bufferedPosition, duration: player.duration }
}

function Popup({ player, title, ratio, onExpand, onClose }: { player: VideoPlayer; title: string; ratio: number; onExpand: () => void; onClose: () => void }) {
  const { isPlaying, toggle } = usePlayback(player)
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss video" />
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          <RoundButton label="Close video" onPress={onClose} dim>
            <X size={16} color={color.background} weight="bold" />
          </RoundButton>
        </View>
        <View style={[styles.frame, { aspectRatio: ratio }]}>
          <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
          <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={isPlaying ? `Pause: ${title}` : `Play: ${title}`} style={styles.center}>
            <View style={[styles.play, isPlaying && styles.playHint]}>
              {isPlaying ? <Pause size={22} color={color.primary} weight="fill" /> : <Play size={22} color={color.primary} weight="fill" />}
            </View>
          </Pressable>
          <View style={styles.expand}>
            <RoundButton label="Full screen" onPress={onExpand} dim>
              <ArrowsOutSimple size={16} color={color.background} weight="bold" />
            </RoundButton>
          </View>
        </View>
      </View>
    </View>
  )
}

/** The full view: the phone's whole screen, with the picture laid on its
    side. The inner layer is as wide as the screen is tall and as tall as it
    is wide, turned a quarter, so everything in it is drawn landscape. */
function FullView({ player, title, ratio, onCollapse, onClose }: { player: VideoPlayer; title: string; ratio: number; onCollapse: () => void; onClose: () => void }) {
  const [box, setBox] = React.useState({ w: 0, h: 0 })
  return (
    <View style={styles.full} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 && (
        <View style={[styles.turned, { width: box.h, height: box.w, left: (box.w - box.h) / 2, top: (box.h - box.w) / 2 }]}>
          <Landscape player={player} title={title} ratio={ratio} onCollapse={onCollapse} onClose={onClose} />
        </View>
      )}
    </View>
  )
}

function Landscape({ player, title, ratio, onCollapse, onClose }: { player: VideoPlayer; title: string; ratio: number; onCollapse: () => void; onClose: () => void }) {
  const { isPlaying, toggle } = usePlayback(player)
  const { time, buffered, duration } = useProgress(player)
  const [shown, setShown] = React.useState(true)
  const [scrub, setScrub] = React.useState<number | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Controls fade 3 seconds after the last touch, and only while it plays.
  const wake = React.useCallback(() => {
    setShown(true)
    clearTimeout(timer.current)
    if (player.playing) timer.current = setTimeout(() => setShown(false), HIDE_AFTER)
  }, [player])
  React.useEffect(() => {
    wake()
    return () => clearTimeout(timer.current)
  }, [wake, isPlaying])

  const seekTo = (to: number) => {
    const end = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : Infinity
    player.currentTime = Math.min(Math.max(0, to), end)
  }
  const skip = (by: number) => {
    seekTo(player.currentTime + by)
    wake()
  }
  const shownTime = scrub ?? time

  return (
    <View style={styles.fill}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => (shown ? setShown(false) : wake())}
        accessibilityRole="button"
        accessibilityLabel={shown ? "Hide controls" : "Show controls"}
      />
      {shown && (
        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.top} pointerEvents="box-none">
            <RoundButton label="Exit full screen" onPress={onCollapse} dim>
              <ArrowsInSimple size={18} color={color.background} weight="bold" />
            </RoundButton>
            <Text style={styles.fullTitle} numberOfLines={1}>
              {title}
            </Text>
            <RoundButton label="Close video" onPress={onClose} dim>
              <X size={18} color={color.background} weight="bold" />
            </RoundButton>
          </View>

          <View style={styles.transport} pointerEvents="box-none">
            <SkipButton label={`Back ${SKIP} seconds`} onPress={() => skip(-SKIP)} icon={ArrowCounterClockwise} />
            <Pressable
              onPress={() => {
                toggle()
                wake()
              }}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? `Pause: ${title}` : `Play: ${title}`}
              style={({ pressed }) => [styles.big, pressed && styles.pressed]}
            >
              {isPlaying ? <Pause size={34} color={color.background} weight="fill" /> : <Play size={34} color={color.background} weight="fill" />}
            </Pressable>
            <SkipButton label={`Forward ${SKIP} seconds`} onPress={() => skip(SKIP)} icon={ArrowClockwise} />
          </View>

          <View style={styles.bottom} pointerEvents="box-none">
            <Scrubber
              time={shownTime}
              buffered={buffered}
              duration={duration}
              onScrub={(to) => {
                setScrub(to)
                clearTimeout(timer.current)
              }}
              onCommit={(to) => {
                seekTo(to)
                setScrub(null)
                wake()
              }}
            />
            <View style={styles.times}>
              <Text style={styles.time}>{clock(shownTime)}</Text>
              <Text style={styles.time}>{`-${clock(Math.max(0, duration - shownTime))}`}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

/** The bar: drag along it, or tap to jump. It is drawn turned a quarter, so
    a finger moving down the screen is moving along the bar; the drag is
    read from how far the finger has travelled, not from where it is, which
    a turned layer reports wrongly in a browser. Tap-to-jump needs that
    position, so it works on a phone and a tap in the browser does not move
    the bar. */
function Scrubber({ time, buffered, duration, onScrub, onCommit }: { time: number; buffered: number; duration: number; onScrub: (to: number) => void; onCommit: (to: number) => void }) {
  const [width, setWidth] = React.useState(0)
  const live = React.useRef({ width, duration, time, onScrub, onCommit })
  live.current = { width, duration, time, onScrub, onCommit }
  const from = React.useRef(0)
  const last = React.useRef(0)

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => live.current.duration > 0,
        onMoveShouldSetPanResponder: () => live.current.duration > 0,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const { width: w, duration: d, time: t, onScrub: scrubTo } = live.current
          from.current = Platform.OS !== "web" && w > 0 ? (Math.min(Math.max(0, e.nativeEvent.locationX), w) / w) * d : t
          last.current = from.current
          scrubTo(from.current)
        },
        onPanResponderMove: (_, g) => {
          const { width: w, duration: d, onScrub: scrubTo } = live.current
          if (w <= 0) return
          // Down the screen is along the bar.
          last.current = Math.min(Math.max(0, from.current + (g.dy / w) * d), d)
          scrubTo(last.current)
        },
        onPanResponderRelease: () => live.current.onCommit(last.current),
        onPanResponderTerminate: () => live.current.onCommit(last.current),
      }),
    [],
  )

  const ratio = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0
  const loaded = duration > 0 && buffered > 0 ? Math.min(1, buffered / duration) : 0
  return (
    <View
      style={styles.hit}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Video position"
      accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(time), text: `${clock(time)} of ${clock(duration)}` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onCommit(Math.min(duration, Math.max(0, time + (e.nativeEvent.actionName === "increment" ? SKIP : -SKIP))))}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.loaded, { width: `${loaded * 100}%` }]} />
        <View style={[styles.done, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={[styles.dot, { left: ratio * width - DOT / 2 }]} pointerEvents="none" />
    </View>
  )
}

function SkipButton({ label, onPress, icon: Icon }: { label: string; onPress: () => void; icon: typeof ArrowClockwise }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
      <Icon size={44} color={color.background} weight="regular" />
      <View style={styles.skipNumber} pointerEvents="none">
        <Text style={styles.skipText}>{SKIP}</Text>
      </View>
    </Pressable>
  )
}

function RoundButton({ label, onPress, dim, children }: { label: string; onPress: () => void; dim?: boolean; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [styles.round, dim && styles.roundDim, pressed && styles.pressed]}>
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // An explicit size as well as the fill: on the web the picture is otherwise
  // drawn at the clip's own pixels (1920 by 1080), cropped to a corner.
  video: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  pressed: { opacity: 0.7 },

  // Popup: the clip on a dimmed screen, 16 in from the phone's sides.
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: space.card },
  card: { width: "100%", maxWidth: 560, backgroundColor: "#000", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: space.inline, paddingLeft: space.card, paddingRight: space.inline, paddingVertical: space.inline },
  cardTitle: { flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.background },
  frame: { backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  play: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.background, alignItems: "center", justifyContent: "center" },
  // While it plays the button stays but fades back, so the picture shows.
  playHint: { opacity: 0.7 },
  expand: { position: "absolute", right: space.inline, bottom: space.inline },

  // Full view: black, the whole picture on its side, controls over it.
  full: { ...StyleSheet.absoluteFill, backgroundColor: "#000", overflow: "hidden" },
  turned: { position: "absolute", transform: [{ rotate: "90deg" }], backgroundColor: "#000" },
  controls: { ...StyleSheet.absoluteFill, justifyContent: "space-between", backgroundColor: SCRIM },
  top: { flexDirection: "row", alignItems: "center", gap: space.item, paddingHorizontal: space.card, paddingVertical: space.inline },
  fullTitle: { flex: 1, fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: color.background, textAlign: "center" },
  transport: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 48 },
  big: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)" },
  skip: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  // The 10 sits inside the clock face.
  skipNumber: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", paddingTop: 1 },
  skipText: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, color: color.background },
  bottom: { paddingHorizontal: space.card, paddingBottom: space.item },
  times: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  time: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.background, fontVariant: ["tabular-nums"] },

  // Scrubber: a tall touch area around a thin bar.
  hit: { height: 36, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  loaded: { ...StyleSheet.absoluteFill, right: undefined, backgroundColor: "rgba(255,255,255,0.45)" },
  done: { ...StyleSheet.absoluteFill, right: undefined, backgroundColor: color.primary },
  dot: { position: "absolute", width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: color.background },

  round: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  roundDim: { backgroundColor: SCRIM },
})
