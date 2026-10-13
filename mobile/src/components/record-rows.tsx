import { router } from "expo-router"
import * as React from "react"
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { Art } from "@/components/art"
import { Camera, CaretRight, ImageSquare, MagnifyingGlass, PencilSimple, Sparkle, UploadSimple, X } from "@/components/ph"
import { RecordIcon, type RecordIconName } from "@/components/record-icons"
import { Banner, Card, DateBlock, DateTrack, Dot, Group, HUE, KeyValue, LiveDot, Tag, Tile, spokenDate, type DateLike, type Level, type Mark, type Tone, type TrackDate } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { ADD_KINDS, addKindOf, asksHowTaken, type AddKind } from "@/lib/add-record"
import { showDate } from "@/lib/dates"
import { useOnboarding, type Added } from "@/lib/onboarding"
import { PROVENANCE_LABEL, type Provenance } from "@/lib/record"
import { checkSupplement } from "@/lib/supplement-check"
import { card, chart, color, font, hairline, ink, outOfRangeColor, space, surface, type } from "@/lib/theme"

/* The rows, controls and sheets the Record tab and its lists share, in the
   Figma "Hol" language (5 Oct 2026). A row is a round 28 tile with a 16
   Phosphor icon, the title, one line of facts 4 under it, a count badge or
   a date on the right and the grey caret; the whole row opens it. Filter
   chips, the search field and the "20 of 27 in range" summary are drawn
   here once, so Results, the Record tab and every list read the same. The
   item sheet is the Figma's detail sheet: the name with its badge, then
   one card of label and value rows. */

/** A status as a mark and a word: a dot, a clay ring (records differ,
    borderline), a filled clay dot (a test not booked past its due date), a
    teal ring (done, waiting for results) or a green check (results in),
    all the record kit's Dot. Never the colour alone. */
export type RowStatus = {
  word: string
  level?: Level
  tone?: Tone
  /** The mark's shape when it is not the tone's own (C.0.4). */
  mark?: Mark
}

/** The mark and the word on one line, as a row's second line. */
function StatusLine({ status }: { status: RowStatus }) {
  return (
    <View style={styles.status}>
      <Dot level={status.level} tone={status.tone} mark={status.mark} />
      <Text style={styles.statusWord} numberOfLines={1}>
        {status.word}
      </Text>
    </View>
  )
}

/** Figma's count badge: a 10 pt number on a grey pill with a hairline. */
export function CountBadge({ children }: { children: number | string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{String(children)}</Text>
    </View>
  )
}

export type ItemRowProps = {
  /** A record icon on a teal tile, or any node in its place. */
  icon?: RecordIconName | React.ReactNode
  /** A calendar block instead of the icon, for an appointment. */
  date?: DateLike
  title: string
  /** An exception beside the title only: "Outside your clinic", "Being
      checked". */
  tag?: { tone: Tone; label: string }
  status?: RowStatus
  /** One line of facts: the place, the date, a reaction. */
  meta?: string
  /** A sentence under the facts, e.g. how two lists differ. */
  note?: string
  /** A test's three dates under the row: ordered, scheduled, done. */
  track?: { dates: TrackDate[]; late?: boolean }
  /** A count on the right, as the Figma's badge ("5"). */
  count?: number | string
  /** A date on the right ("Aug 12"). */
  when?: string
  onPress?: () => void
  accessibilityLabel?: string
}

const isIconName = (icon: unknown): icon is RecordIconName => typeof icon === "string"

/** One item in a record list or a Record tab category. */
export function ItemRow({ icon, date, title, tag, status, meta, note, track, count, when, onPress, accessibilityLabel }: ItemRowProps) {
  const left = date ? (
    <DateBlock date={date} />
  ) : icon ? (
    isIconName(icon) ? (
      <Tile>
        <RecordIcon name={icon} size={16} color={color.primary} />
      </Tile>
    ) : (
      icon
    )
  ) : null
  const label =
    accessibilityLabel ??
    [title, tag?.label, status?.word, date ? spokenDate(date) : undefined, meta, note, count !== undefined ? String(count) : undefined, when].filter(Boolean).join(", ")
  // Every line wraps by the app's one rule (care-gap.ts keepTogether): a
  // number with its word ("3 providers", "20 mg"), dates, times, names and
  // places whole, and never one short word left on a line ("Who has looked
  // / at your record").
  const body = (
    <>
      {left}
      <View style={styles.body}>
        {tag ? (
          <View style={styles.titleLine}>
            <Text style={styles.title}>{keepTogether(title)}</Text>
            <Tag tone={tag.tone}>{tag.label}</Tag>
          </View>
        ) : (
          <Text style={styles.title}>{keepTogether(title)}</Text>
        )}
        {status && <StatusLine status={status} />}
        {!!meta && <Text style={styles.meta}>{keepTogether(meta)}</Text>}
        {!!note && <Text style={styles.meta}>{keepTogether(note)}</Text>}
        {track && (
          <View style={styles.track}>
            <DateTrack mini dates={track.dates} late={track.late} />
          </View>
        )}
      </View>
      {count !== undefined && <CountBadge>{count}</CountBadge>}
      {!!when && <Text style={styles.when}>{when}</Text>}
      {onPress && <CaretRight size={16} color={card.chevron} />}
    </>
  )
  const look = [styles.row, (!!track || !!note) && styles.rowTop]
  if (!onPress)
    return (
      <View style={look} accessible accessibilityLabel={label}>
        {body}
      </View>
    )
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [...look, pressed && styles.pressed]}>
      {body}
    </Pressable>
  )
}

/* -------------------------------------------------------- summary -- */

/** "20 of 27 in range": the record's results as one 8 pt bar split in
    range (teal), borderline (Warning/07) and out of range, white hairlines
    between the parts, and a legend of dots and counts, so nothing rests on
    colour alone (Figma "Results" card). */
export function RangeSummary({ inRange, borderline, out, total }: { inRange: number; borderline: number; out: number; total: number }) {
  const parts = [
    { key: "in", n: inRange, tone: color.primary, label: `${inRange} in range` },
    { key: "borderline", n: borderline, tone: color.amber, label: `${borderline} borderline` },
    { key: "out", n: out, tone: outOfRangeColor(), label: `${out} out of range` },
  ].filter((p) => p.n > 0)
  return (
    <View style={styles.summary} accessible accessibilityRole="summary" accessibilityLabel={`${inRange} of ${total} in range. ${parts.map((p) => p.label).join(", ")}.`}>
      <View style={styles.summaryTop}>
        <Text style={styles.summaryTitle}>{`${inRange} of ${total} in range`}</Text>
        <View style={styles.bar}>
          {parts.map((p, i) => (
            <View key={p.key} style={[{ flexGrow: p.n, flexBasis: 0, backgroundColor: p.tone }, i > 0 && styles.barSplit]} />
          ))}
        </View>
      </View>
      <View style={styles.legend}>
        {parts.map((p) => (
          <View key={p.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: p.tone }]} />
            <Text style={styles.legendText}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/* ---------------------------------------------------------- chips -- */

/** Figma's filter chips: 28 pills 8 apart, the chosen one on the teal tint
    with a Primary/03 edge, the rest white at 60% with a hairline. One is
    chosen at a time. `scroll` keeps many chips on one line that scrolls
    sideways to the screen's edges (the Timeline's six kinds). */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  scroll,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label?: string
  scroll?: boolean
}) {
  const chips = (
    <View style={[styles.chips, scroll && styles.chipsLine]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
  if (!scroll) return chips
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBleed} contentContainerStyle={styles.chipsScroll}>
      {chips}
    </ScrollView>
  )
}

/* ------------------------------------------------------------ sheet -- */

/** What an item's sheet shows. */
export type ItemDetail = {
  title: string
  provenance?: Provenance
  details: [string, string][]
  /** Source, system and last updated. */
  source?: [string, string][]
}

/** Who stands behind an item: teal for a source or a clinician, grey for
    what she told us or a device. */
const PROVENANCE_TONE: Record<Provenance, Tone> = {
  verified: "primary",
  clinician: "primary",
  confirmed: "primary",
  patient: "muted",
  device: "muted",
  ai: "muted",
}

/** Opens one item's details on their own page (record/item): only the
    item's own facts and where they come from, nothing else (user, 5 Oct
    2026). Every list in the record opens its items this way. */
export function openItem(item: ItemDetail) {
  router.push({ pathname: "/record/item", params: { d: JSON.stringify(item) } })
}

/** One item's details: the name with its badge, one card of label and
    value rows, then where it comes from in a card of its own. */
export function ItemDetails({ item }: { item: ItemDetail }) {
  return (
    <>
      {item.provenance && (
        <View style={styles.detailBadge}>
          <Tag tone={PROVENANCE_TONE[item.provenance]}>{PROVENANCE_LABEL[item.provenance]}</Tag>
        </View>
      )}
      <Card style={styles.detail}>
        {item.details.map(([label, value], i) => (
          <KeyValue key={`${label}${i}`} label={label} value={value} last={i === item.details.length - 1} />
        ))}
      </Card>
      {!!item.source?.length && (
        <View style={styles.sourceBlock}>
          <Text style={styles.sourceLabel}>Source</Text>
          <Card style={styles.detail}>
            {item.source.map(([label, value], i) => (
              <KeyValue key={`${label}${i}`} label={label} value={value} last={i === item.source!.length - 1} />
            ))}
          </Card>
        </View>
      )}
    </>
  )
}

/** How long reading a photo takes. */
const READ_MS = 2200

/** Something she added, as its details page shows it: a record's fields
    (typed in or read from a photo), a report's values, or what she told us. */
export function addedDetail(a: Added): ItemDetail {
  const source: [string, string][] = [
    ["Source", a.via === "photo" ? "Photo you added" : "Added by you"],
    ["Added", a.at],
    ["Status", "Being checked"],
  ]
  if (a.fields) return { title: a.title, provenance: "patient", details: a.fields.length ? a.fields : [["Kind", addKindOf(a.kind)?.name ?? "Record"]], source }
  if (a.report) return { title: a.title, provenance: "patient", details: [["Date", a.report.date], ["Where", a.report.where], ...a.report.values], source }
  return {
    title: a.title,
    provenance: "patient",
    details: [[a.id.startsWith("told-allergy-") ? "Your answer" : "What it holds", a.detail]],
    source,
  }
}

/** The page for one added record. */
export const addedHref = (a: Added) => ({ pathname: "/record/item" as const, params: { d: JSON.stringify(addedDetail(a)) } })

type AddStage = "kind" | "how" | "photo" | "reading" | "take"

/** The photo option's words: a medicine or supplement is photographed from
    its prescription or its bottle. */
const PHOTO_TITLE: Partial<Record<AddKind, string>> = {
  medicines: "Take a photo of the prescription or bottle",
  supplements: "Take a photo of the bottle",
}

/** The sample "How do you take it?" starts from: what the photo read. */
const takenFrom = (fields: [string, string][]) =>
  fields
    .filter(([label]) => label === "Dose" || label === "How often")
    .map(([, value]) => value)
    .join(", ")

/** "Add to your record": which kind of record (unless the list it was
    opened from says), then by photo or typed in (user, 5 Oct 2026). A
    photo asks how (take one, choose one, upload a file), a centred card
    reads it, and the record opens on its own page, added. A medicine or
    supplement read from a photo first asks "How do you take it?" in her
    own words, which the doctor sees, and a supplement is checked against
    her record (lib/supplement-check). Typed in opens the kind's form. The
    prototype reads a sample of the kind. */
export function AddToRecordSheet({ kind: fixed, onClose }: { kind?: AddKind; onClose: () => void }) {
  const onboarding = useOnboarding()
  const [kind, setKind] = React.useState<AddKind | undefined>(fixed)
  const [stage, setStage] = React.useState<AddStage>(fixed ? "how" : "kind")
  const [read, setRead] = React.useState<Added>()
  const [taken, setTaken] = React.useState("")
  const info = addKindOf(kind)

  const finish = async (added: Added, how?: string) => {
    const now = new Date().toISOString()
    // How she takes it is her answer for this medicine, dated now, so Dr.
    // Patel reads it with the rest (lib/record providerAnswer).
    await onboarding
      .save({
        added: [...(onboarding.added ?? []), added],
        ...(how ? { meds: { ...onboarding.meds, [added.id]: { medication: added.title, shown: [], answer: "taking" as const, note: how, at: now } } } : {}),
      })
      .catch(() => {})
    onClose()
    router.push(addedHref(added))
  }

  React.useEffect(() => {
    if (stage !== "reading" || !info) return
    const t = setTimeout(async () => {
      const added: Added = {
        id: `added-${Date.now()}`,
        title: info.sample.title,
        detail: info.name,
        at: showDate(),
        kind: info.kind,
        fields: info.sample.fields,
        via: "photo",
      }
      if (asksHowTaken(info.kind)) {
        setRead(added)
        setTaken(takenFrom(info.sample.fields))
        return setStage("take")
      }
      await finish(added)
    }, READ_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  if (stage === "take" && read && info) {
    const how = taken.trim()
    const warning = info.kind === "supplements" ? checkSupplement(read.title) : undefined
    return (
      <Sheet title={info.action} onClose={onClose}>
        <ScrollView style={styles.sheetList} contentContainerStyle={styles.takeBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card style={styles.detail}>
            {[["Read from your photo", read.title] as [string, string], ...(read.fields ?? [])].map(([label, value], i, all) => (
              <KeyValue key={label} label={label} value={value} last={i === all.length - 1} />
            ))}
          </Card>
          {warning && (
            <View accessibilityLiveRegion="polite">
              <Banner hue="amber" icon={<Sparkle size={16} color={HUE.amber.ink} weight="fill" />} title={warning.title} meta={warning.why} />
            </View>
          )}
          <TextField label="How do you take it?" value={taken} onChangeText={setTaken} placeholder="Dose, how often, time of day" autoFocus />
          <Button
            disabled={!how}
            onPress={() => finish({ ...read, fields: [...(read.fields ?? []), ["How you take it", how]] }, how)}
          >
            Add to my record
          </Button>
          <Text style={[type.meta, styles.takeNote]}>Dr. Patel will see this.</Text>
        </ScrollView>
      </Sheet>
    )
  }

  if (stage === "reading")
    return (
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.modalScrim} />
        <View style={styles.modalWrap} pointerEvents="box-none">
          <View style={styles.modal} accessibilityViewIsModal accessible accessibilityRole="progressbar" accessibilityLabel="Reading your photo">
            <Art name="document" size={88} />
            <View style={styles.modalLine}>
              <LiveDot />
              <Text style={type.section}>Reading your photo</Text>
            </View>
          </View>
        </View>
      </View>
    )

  const glyph = optionIcon
  const options: SheetOption[] =
    stage === "kind"
      ? ADD_KINDS.map((k) => ({
          key: k.kind,
          title: k.name,
          icon: (
            <Tile>
              <RecordIcon name={k.icon} size={16} color={color.primary} />
            </Tile>
          ),
          onPress: () => {
            setKind(k.kind)
            setStage("how")
          },
        }))
      : stage === "how"
        ? [
            { key: "photo", title: (kind && PHOTO_TITLE[kind]) || "Add a photo", icon: glyph(Camera), onPress: () => setStage("photo") },
            {
              key: "typed",
              title: "Type it in",
              icon: glyph(PencilSimple),
              onPress: () => {
                onClose()
                router.push({ pathname: "/record/add", params: { kind } })
              },
            },
          ]
        : [
            { key: "camera", title: "Take a photo", icon: glyph(Camera), onPress: () => setStage("reading") },
            { key: "library", title: "Choose from photos", icon: glyph(ImageSquare), onPress: () => setStage("reading") },
            { key: "file", title: "Upload a file", icon: glyph(UploadSimple), onPress: () => setStage("reading") },
          ]
  const title = stage === "kind" ? "Add to your record" : info ? info.action : "Add to your record"
  return (
    <Sheet title={title} onClose={onClose}>
      <SheetOptions options={options} />
    </Sheet>
  )
}

/** One choice in a sheet: its icon on a tile, its words and a chevron. */
export type SheetOption = { key: string; title: string; icon: React.ReactNode; onPress: () => void }

/** A sheet's choices, one per row with a rule between, as "Add to your
    record" and "Update what you take" list them. */
export function SheetOptions({ options }: { options: SheetOption[] }) {
  return (
    <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
      {options.map(({ key, title, icon, onPress }, i) => (
        <Pressable
          key={key}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={title}
          style={({ pressed }) => [styles.option, i > 0 && styles.optionRule, pressed && styles.pressed]}
        >
          {icon}
          <Text style={styles.optionTitle}>{title}</Text>
          <CaretRight size={16} color={card.chevron} />
        </Pressable>
      ))}
    </ScrollView>
  )
}

/** A sheet option's icon on its teal tile. */
export const optionIcon = (Icon: typeof Camera) => (
  <Tile>
    <Icon size={16} color={color.primary} />
  </Tile>
)

/** What she added to one list, under its own label, each opening its
    details page. Nothing added, nothing shown. */
export function AddedOfKind({ kind }: { kind: AddKind }) {
  const added = (useOnboarding().added ?? []).filter((a) => a.kind === kind)
  if (!added.length) return null
  return (
    <View style={styles.sourceBlock}>
      <Text style={styles.sourceLabel}>Added by you</Text>
      <Group>
        {[...added].reverse().map((a) => (
          <ItemRow
            key={a.id}
            icon={addKindOf(a.kind)?.icon}
            title={a.title}
            tag={{ tone: "muted", label: "Being checked" }}
            meta={a.via === "photo" ? `From a photo, ${a.at}` : `Added ${a.at}`}
            onPress={() => router.push(addedHref(a))}
          />
        ))}
      </Group>
    </View>
  )
}

/* ----------------------------------------------------------- search -- */

/** Figma's search field: the magnifier and the words on Grey/01 with a
    hairline, radius 8, and a clear button once something is typed. Its
    label is spoken, not shown. */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (text: string) => void; placeholder: string }) {
  const [focused, setFocused] = React.useState(false)
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <MagnifyingGlass size={20} color={focused ? color.primary : ink.detail} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.searchInput}
        maxFontSizeMultiplier={1.3}
      />
      {!!value && (
        <Pressable
          onPress={() => onChange("")}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <X size={12} color={color.onPrimary} />
        </Pressable>
      )}
    </View>
  )
}

/** Figma's Grey/05 placeholder and Grey/01 field. */
const PLACEHOLDER = "#B7B7B7"
const FIELD = "#FBFBFB"

const styles = StyleSheet.create({
  // A 28 tile with a row's 12 above and below; the rules sit between rows.
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY },
  rowTop: { alignItems: "flex-start" },
  pressed: { opacity: 0.6 },
  body: { flex: 1, gap: space.stack },
  titleLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.inline, rowGap: space.stack },
  title: { ...type.title, flexShrink: 1 },
  meta: { ...type.label },
  track: { marginTop: space.inline, marginBottom: space.line },
  when: { ...type.label, fontVariant: ["tabular-nums"] },

  badge: {
    minWidth: 20,
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: surface.inset,
  },
  badgeText: { ...type.captionStrong, color: ink.detail, fontVariant: ["tabular-nums"] },

  status: { flexDirection: "row", alignItems: "center", gap: space.mark },
  statusWord: { ...type.metaStrong, flexShrink: 1 },

  // The title 8 over the bar, the legend 12 under it.
  summary: { gap: space.item },
  summaryTop: { gap: space.inline },
  summaryTitle: { ...type.title, color: ink.detail },
  bar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: hairline.rule },
  barSplit: { borderLeftWidth: 1, borderLeftColor: color.background },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: space.gutter, rowGap: space.mark },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.mark },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { ...type.label, color: ink.content },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  chipsLine: { flexWrap: "nowrap" },
  // The row runs under the page's gutter to the screen's edges; the shadow
  // gets room above and below.
  chipsBleed: { marginHorizontal: -space.gutter, marginVertical: -space.inline },
  chipsScroll: { paddingHorizontal: space.gutter, paddingVertical: space.inline },
  chip: {
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 10.5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: card.fill,
    boxShadow: card.shadow,
  },
  chipOn: { borderWidth: 0.7, borderColor: color.primaryLine, backgroundColor: color.primaryTint, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.03)" },
  chipText: { ...type.label, color: ink.content },
  chipTextOn: { color: ink.primary },

  // The sheet's one card of label and value rows; each row brings its own
  // 12 above and below.
  detail: { paddingVertical: 0 },
  detailBadge: { flexDirection: "row" },
  sourceBlock: { gap: space.item },
  sourceLabel: { ...type.sectionLabel },

  // The reading card, centred over a dimmed screen.
  modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  modalWrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", padding: space.gutter },
  modal: { width: "100%", maxWidth: 320, alignItems: "center", gap: space.card, paddingVertical: 24, paddingHorizontal: space.card, borderRadius: 20, backgroundColor: color.background },
  modalLine: { flexDirection: "row", alignItems: "center", gap: space.mark },

  // The kind list can run past a short phone: it scrolls inside the sheet.
  sheetList: { maxHeight: 460 },
  // "How do you take it?": what was read, the check, the field and Add, in
  // the sheet's own spacing.
  takeBody: { gap: space.gutter },
  takeNote: { textAlign: "center" },
  option: { flexDirection: "row", alignItems: "center", gap: space.lead },
  // Rows 16 apart across a rule, as the Figma's sheet sets them.
  optionRule: { marginTop: space.gutter, paddingTop: space.gutter, borderTopWidth: 1, borderTopColor: hairline.rule },
  optionTitle: { ...type.title, flex: 1 },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inline,
    height: 42,
    paddingHorizontal: space.gutter,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.outline,
    backgroundColor: FIELD,
  },
  searchFocused: { borderColor: color.primary },
  // Body/14 in the title grey. No line height, which a single line field
  // on iOS would clip.
  searchInput: {
    flex: 1,
    height: "100%",
    fontFamily: font.regular,
    fontSize: 14,
    color: ink.strong,
    // The box draws the focus state; the browser's own ring would double it.
    ...Platform.select({
      web: { outlineStyle: "none" } as unknown as TextStyle,
    }),
  },
  clear: { width: 20, height: 20, borderRadius: 10, backgroundColor: chart.rule, alignItems: "center", justifyContent: "center" },
})
