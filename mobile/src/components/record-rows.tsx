import { router } from "expo-router"
import * as React from "react"
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextStyle } from "react-native"

import { keepTogether } from "@/components/care-gap"
import { IconCamera, IconCheck, IconChevronRight, IconClose, IconKeyboard, IconSearch } from "@/components/icons"
import { List, ListRow } from "@/components/list"
import { RecordIcon, type RecordIconName } from "@/components/record-icons"
import { Block, DateBlock, DateTrack, Dot, KeyValue, Status, Tag, Tile, spokenDate, type DateLike, type Level, type Mark, type Tone, type TrackDate } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { dateOfAt } from "@/lib/member"
import { PROVENANCE_LABEL, type Provenance } from "@/lib/record"
import { chart, color, hairline, ink, space, touchRadius, type } from "@/lib/theme"

/* The rows and the item sheet the Record tab and its lists share (FINAL-
   SPEC C.5, C.6). A row says what an item is, where it stands as a mark
   and a word ("Records differ" with a clay ring, "Not booked yet" with a
   dot), one line of facts, and a count or a date on the right; the whole
   row opens it. The sheet is the approved one from sheet.tsx: the item's
   name, where it comes from as one provenance label (S-13), its details
   and its source, short enough that it never needs to scroll. */

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
  /** A count on the right, as a value ("5"). */
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
        <RecordIcon name={icon} size={18} color={color.primary} />
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
        {!!meta && <Text style={type.label}>{keepTogether(meta)}</Text>}
        {!!note && <Text style={styles.note}>{keepTogether(note)}</Text>}
        {track && (
          <View style={styles.track}>
            <DateTrack mini dates={track.dates} late={track.late} />
          </View>
        )}
      </View>
      {count !== undefined && <Text style={styles.count}>{String(count)}</Text>}
      {!!when && <Text style={styles.when}>{when}</Text>}
      {onPress && <IconChevronRight size={16} color={ink.tertiary} />}
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

function Rows({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Block title={title}>
      <View>
        {rows.map(([label, value], i) => (
          <KeyValue key={label} label={label} value={value} last={i === rows.length - 1} />
        ))}
      </View>
    </Block>
  )
}

/** One item's details over the screen (sheet.tsx, used as it is). */
export function ItemSheet({ item, onClose }: { item: ItemDetail; onClose: () => void }) {
  return (
    <Sheet title={item.title} onClose={onClose}>
      {item.provenance && (
        <View style={styles.provenance}>
          <Status tone={PROVENANCE_TONE[item.provenance]}>{PROVENANCE_LABEL[item.provenance]}</Status>
        </View>
      )}
      <Rows title="Details" rows={item.details} />
      {!!item.source?.length && <Rows title="Where it comes from" rows={item.source} />}
    </Sheet>
  )
}

/** "Add to your record": a photo of a report, or something she tells us
    (F-95). The Record tab opens it, and "Added by you" when nothing is
    there yet. */
export function AddToRecordSheet({ onClose }: { onClose: () => void }) {
  const go = (path: "/add-report" | "/tell-us") => {
    onClose()
    router.push(path)
  }
  return (
    <Sheet title="Add to your record" onClose={onClose}>
      <List>
        <ListRow
          icon={
            <Tile>
              <IconCamera size={18} color={color.primary} />
            </Tile>
          }
          title="Photo of a report"
          onPress={() => go("/add-report")}
        />
        <ListRow
          icon={
            <Tile>
              <IconKeyboard size={18} color={color.primary} />
            </Tile>
          }
          title="Tell us something"
          onPress={() => go("/tell-us")}
        />
      </List>
    </Sheet>
  )
}

/* ----------------------------------------------------------- search -- */

/** A search box on the page: the magnifier, the words, and a clear button
    once something is typed. Its label is spoken, not shown. */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (text: string) => void; placeholder: string }) {
  const [focused, setFocused] = React.useState(false)
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <IconSearch size={18} color={focused ? color.primary : ink.tertiary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={ink.tertiary}
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
        <Pressable onPress={() => onChange("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search" style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
          <IconClose size={14} color={color.onPrimary} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // A 36 tile with a row's 12 above and below: 60, as the kit's rows and
  // Frontline's tile rows come to. Rows with no tile (Conditions,
  // Immunizations) keep that height.
  row: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, minHeight: 60 },
  rowTop: { alignItems: "flex-start" },
  pressed: { opacity: 0.6 },
  body: { flex: 1, gap: space.line },
  titleLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.inline, rowGap: space.stack },
  title: { ...type.title, flexShrink: 1 },
  // A third line sits 4 under the second, as in Frontline's three line rows.
  note: { ...type.label, marginTop: space.line },
  track: { marginTop: space.inline, marginBottom: space.line },
  count: { ...type.value, fontVariant: ["tabular-nums"] },
  // A date on the right is a timestamp, quieter than the title: the kit's
  // row date (Frontline's 12 regular in Grey/07).
  when: { ...type.label, fontVariant: ["tabular-nums"] },

  status: { flexDirection: "row", alignItems: "center", gap: space.mark },
  statusWord: { ...type.metaStrong, flexShrink: 1 },

  // Pulled 6 toward the sheet's title (its 16 less 6: Frontline's 10), so
  // the label reads as the title's own line.
  provenance: { flexDirection: "row", marginTop: -6 },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inline,
    height: 44,
    paddingHorizontal: space.compact,
    borderRadius: touchRadius,
    borderWidth: 1,
    // A field's edge, as the chips' beside it (Frontline's inputs).
    borderColor: hairline.outline,
    backgroundColor: color.background,
  },
  searchFocused: { borderColor: color.primary, boxShadow: `0 0 0 3px ${color.primaryHalo}` },
  // Frontline's input text: Body/14 in the title grey. No line height, which
  // a single line field on iOS would clip.
  searchInput: {
    flex: 1,
    height: "100%",
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: ink.strong,
    // The box draws the focus state; the browser's own ring would double it.
    ...Platform.select({ web: { outlineStyle: "none" } as unknown as TextStyle }),
  },
  clear: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#A3ACB9", alignItems: "center", justifyContent: "center" },
})
