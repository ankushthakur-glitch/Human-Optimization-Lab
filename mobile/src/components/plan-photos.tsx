import * as ImagePicker from "expo-image-picker"
import * as React from "react"
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from "react-native"

import { CalendarBlank, Camera, Images, Info, Lightbulb, Lock, User } from "@/components/ph"
import { PrimaryButton } from "@/components/hol"
import { Block, Card, Tile, toast } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { card, chart, color, hairline, ink, space, surface, type } from "@/lib/theme"

/* The Plan screen's "Photos" tab (Journey_14 screen 49, "Photo check-in"):
   evidence she can see. A line for the last check-in and where the photos
   are kept, one button to take new ones, then front and side views across
   three dates with the weight and waist under each frame, a slider that
   draws the first photo over today's, and one line from Inlay about what
   the pictures show. Taking photos opens a sheet that asks for the front
   and the side; a saved pair becomes "Today". The earlier dates are sample
   photos not yet in the build, so their frames show a silhouette. */

export type Angle = "front" | "side"
export type Shots = Partial<Record<Angle, string>>
export type PhotoSheetKind = "capture" | "privacy"

const FRAMES = [
  { id: "start", label: "Start", date: "Jul 1, 2026", weight: "178 lb", waist: "36.5\"" },
  { id: "day30", label: "30 Days", date: "Jul 31, 2026", weight: "168.3 lb", waist: "34.1\"" },
  { id: "today", label: "Today", date: "Oct 5, 2026", weight: "165.6 lb", waist: "34.0\"" },
] as const

const VIEWS: { value: Angle; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" },
]

/** A photo's ground: the photo, or a quiet silhouette where there is none. */
function Frame({ uri, label, style }: { uri?: string; label: string; style?: object }) {
  return (
    <View style={[styles.frame, style]} accessible accessibilityLabel={uri ? label : `${label}, no photo`}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <User size={28} color={color.primaryLine} weight="light" />}
    </View>
  )
}

/** Front or Side, as a two part control: the chosen one white on the grey. */
function Toggle({ value, onChange }: { value: Angle; onChange: (v: Angle) => void }) {
  return (
    <View style={styles.toggle} accessibilityRole="tablist">
      {VIEWS.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.toggleItem, on && styles.toggleOn]}
          >
            <Text style={[type.title, { color: on ? ink.strong : ink.secondary }]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Start against today: the start photo drawn over today's up to the
    handle, which she drags (or steps with the arrow keys on web). */
function Compare({ start, today }: { start?: string; today?: string }) {
  const [at, setAt] = React.useState(0.5)
  const [w, setW] = React.useState(0)
  const track = React.useRef({ x: 0, w: 1 })
  const trackRef = React.useRef<View>(null)
  const move = (pageX: number) => setAt(Math.min(1, Math.max(0, (pageX - track.current.x) / track.current.w)))
  const pan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          trackRef.current?.measureInWindow((x, _y, w) => {
            track.current = { x, w: w || 1 }
            move(e.nativeEvent.pageX)
          })
        },
        onPanResponderMove: (e) => move(e.nativeEvent.pageX),
      }),
    [],
  )
  return (
    <View style={styles.compare}>
      <View style={styles.reveal} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={`Start and today compared, ${Math.round(at * 100)} percent start`}>
        <Frame uri={today} label="Today" style={styles.fill} />
        <View style={[styles.startLayer, { width: `${at * 100}%` }]}>
          <View style={[styles.startInner, { width: w }]}>
            <Frame uri={start} label="Start" style={[styles.fill, !start && styles.startTint]} />
          </View>
        </View>
        <View style={[styles.seam, { left: `${at * 100}%` }]} />
        <View style={[styles.tag, { left: 8 }]}>
          <Text style={styles.tagText}>Start</Text>
        </View>
        <View style={[styles.tag, { right: 8 }]}>
          <Text style={styles.tagText}>Today</Text>
        </View>
      </View>
      <View style={styles.sliderRow}>
        <Text style={type.axis}>Start</Text>
        <View
          ref={trackRef}
          style={styles.sliderHit}
          {...pan.panHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Compare start with today"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(at * 100) }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => setAt((v) => Math.min(1, Math.max(0, v + (e.nativeEvent.actionName === "increment" ? 0.1 : -0.1))))}
        >
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${at * 100}%` }]} />
          </View>
          <View style={[styles.handle, { left: `${at * 100}%` }]}>
            <View style={styles.handleBar} />
          </View>
        </View>
        <Text style={type.axis}>Today</Text>
      </View>
    </View>
  )
}

/** The tab's content. `shots` are the photos she has just taken: they stand
    in for today's frames and carry the date she took them. */
export function PhotoCheckIn({ shots, savedOn, onTake, onInfo }: { shots: Shots; savedOn?: string; onTake: () => void; onInfo: () => void }) {
  const [view, setView] = React.useState<Angle>("front")
  const last = savedOn ?? "Oct 5, 2026"
  const frames = FRAMES.map((f) => (f.id === "today" && savedOn ? { ...f, date: savedOn } : f))
  const mine = shots[view]
  return (
    <View style={styles.wrap}>
      <View style={styles.intro}>
        <Text style={type.section}>Photo check-in</Text>
        <Text style={type.body}>Track your transformation.</Text>
      </View>

      <Card style={styles.last}>
        <Tile hue="teal" size={36}>
          <CalendarBlank size={20} color={color.primary} />
        </Tile>
        <View style={styles.fill}>
          <Text style={type.title}>{`Last check-in: ${last}`}</Text>
          <Text style={[type.label, { color: ink.primary }]}>Photos saved securely</Text>
        </View>
        <Pressable onPress={onInfo} hitSlop={10} accessibilityRole="button" accessibilityLabel="Who can see your photos" style={({ pressed }) => pressed && styles.pressed}>
          <Info size={20} color={card.chevron} />
        </Pressable>
      </Card>

      <PrimaryButton onPress={onTake}>Take check-in photos</PrimaryButton>

      <Block title="Your progress photos">
        <Toggle value={view} onChange={setView} />
        <Text style={[type.sectionLabel, styles.viewLabel]}>{view === "front" ? "Front view" : "Side view"}</Text>
        <View style={styles.grid}>
          {frames.map((f) => (
            <View key={f.id} style={styles.cell} accessible accessibilityLabel={`${f.label}, ${f.date}, ${f.weight}, waist ${f.waist}`}>
              <Text style={type.metaStrong}>{f.label}</Text>
              <Text style={type.caption}>{f.date}</Text>
              <Frame uri={f.id === "today" ? mine : undefined} label={`${f.label} ${view} photo`} />
              <Text style={type.value}>{f.weight}</Text>
              <Text style={type.caption}>{`${f.waist} waist`}</Text>
            </View>
          ))}
        </View>
        <Compare key={view} start={undefined} today={mine} />
      </Block>

      <Card style={styles.insight}>
        <Tile hue="teal" size={32}>
          <Lightbulb size={18} color={color.primary} />
        </Tile>
        <View style={styles.fill}>
          <Text style={type.title}>Inlay Insight</Text>
          <Text style={type.body}>Visible changes from both front and side show your hard work is paying off!</Text>
        </View>
      </Card>
    </View>
  )
}

/* --------------------------------------------------------------- sheets -- */

/** One shot to take: the photo once taken, or the camera to take it. */
function Slot({ label, uri, onCamera, onLibrary }: { label: string; uri?: string; onCamera: () => void; onLibrary: () => void }) {
  return (
    <View style={styles.slot}>
      <Pressable onPress={onCamera} accessibilityRole="button" accessibilityLabel={uri ? `Retake ${label} photo` : `Take ${label} photo`} style={({ pressed }) => [styles.frame, styles.slotFrame, pressed && styles.pressed]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <>
            <Camera size={24} color={color.primary} />
            <Text style={[type.action, { marginTop: space.stack }]}>Take photo</Text>
          </>
        )}
      </Pressable>
      <Text style={type.title}>{label}</Text>
      <Pressable onPress={onLibrary} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Choose ${label} photo from library`} style={styles.libraryLink}>
        <Images size={14} color={ink.primary} />
        <Text style={type.action}>Library</Text>
      </Pressable>
    </View>
  )
}

/** The sheet over the tab bar: taking the pair, or who can see them. */
export function PhotoSheet({ kind, onClose, onSave }: { kind: PhotoSheetKind; onClose: () => void; onSave: (shots: Shots) => void }) {
  const [shots, setShots] = React.useState<Shots>({})
  async function camera(v: Angle) {
    const ok = await ImagePicker.requestCameraPermissionsAsync()
    if (!ok.granted) return toast("Allow the camera in Settings to take a photo")
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
    if (!r.canceled) setShots((s) => ({ ...s, [v]: r.assets[0].uri }))
  }
  async function library(v: Angle) {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 })
    if (!r.canceled) setShots((s) => ({ ...s, [v]: r.assets[0].uri }))
  }
  if (kind === "privacy")
    return (
      <Sheet title="Your photos are private" onClose={onClose}>
        <View style={styles.sheetBody}>
          <View style={styles.privacyRow}>
            <Tile hue="teal" size={36}>
              <Lock size={20} color={color.primary} />
            </Tile>
            <Text style={[type.body, styles.fill]}>Photos are stored securely, apart from your chart. Only you and your care team can see them.</Text>
          </View>
          <Text style={type.body}>You can delete a check-in at any time from this tab. Nothing is shared outside Inlay without your say.</Text>
          <PrimaryButton onPress={onClose}>Got it</PrimaryButton>
        </View>
      </Sheet>
    )
  const ready = !!shots.front && !!shots.side
  return (
    <Sheet title="Take check-in photos" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Text style={type.body}>Stand about six feet from the camera, in the same spot and light as last time, arms relaxed at your sides.</Text>
        <View style={styles.slots}>
          <Slot label="Front" uri={shots.front} onCamera={() => camera("front")} onLibrary={() => library("front")} />
          <Slot label="Side" uri={shots.side} onCamera={() => camera("side")} onLibrary={() => library("side")} />
        </View>
        <Text style={type.meta}>Photos are saved securely. Only you and your care team see them.</Text>
        <PrimaryButton disabled={!ready} onPress={() => onSave(shots)}>
          Save check-in
        </PrimaryButton>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.section },
  fill: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  intro: { gap: space.stack },
  last: { flexDirection: "row", alignItems: "center", gap: space.lead },
  viewLabel: { marginTop: space.inline },
  toggle: { flexDirection: "row", backgroundColor: color.inputFill, borderRadius: 10, padding: 3 },
  toggleItem: { flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  toggleOn: { backgroundColor: color.background, boxShadow: card.shadowXs },
  grid: { flexDirection: "row", gap: space.inline },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: space.stack,
    padding: space.inline,
    backgroundColor: color.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: chart.edge,
  },
  frame: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: surface.inset,
    alignItems: "center",
    justifyContent: "center",
  },
  compare: { gap: space.item },
  reveal: { aspectRatio: 4 / 3, borderRadius: 8, overflow: "hidden", backgroundColor: surface.inset, borderWidth: 1, borderColor: chart.edge },
  startLayer: { position: "absolute", top: 0, bottom: 0, left: 0, overflow: "hidden" },
  startInner: { position: "absolute", top: 0, bottom: 0, left: 0 },
  startTint: { backgroundColor: color.primarySoft, borderRadius: 0 },
  seam: { position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: color.background },
  tag: { position: "absolute", top: 8, backgroundColor: "rgba(43,43,43,0.72)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  tagText: { ...type.captionStrong, color: ink.onColor },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: space.lead },
  sliderHit: { flex: 1, height: 44, justifyContent: "center" },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: hairline.outline, overflow: "hidden" },
  sliderFill: { height: 4, backgroundColor: color.primary },
  handle: {
    position: "absolute",
    top: 6,
    width: 32,
    height: 32,
    marginLeft: -16,
    borderRadius: 16,
    backgroundColor: color.background,
    borderWidth: 2,
    borderColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: card.shadowXs,
  },
  handleBar: { width: 2, height: 12, borderRadius: 1, backgroundColor: color.primary },
  insight: { flexDirection: "row", alignItems: "flex-start", gap: space.lead, backgroundColor: color.primaryTint, borderColor: color.primarySoft },
  sheetBody: { gap: space.item, paddingBottom: space.item },
  slots: { flexDirection: "row", gap: space.item },
  slot: { flex: 1, alignItems: "center", gap: space.inline },
  slotFrame: { aspectRatio: 4 / 5, borderWidth: 1, borderStyle: "dashed", borderColor: color.primaryEdge, backgroundColor: color.primaryTint },
  libraryLink: { flexDirection: "row", alignItems: "center", gap: space.mark, minHeight: 32 },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: space.lead },
})
