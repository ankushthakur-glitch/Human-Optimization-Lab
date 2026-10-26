import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { Rich } from "@/components/catalog-parts"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { PageGround, PrimaryButton } from "@/components/hol"
import { IconAction } from "@/components/care-orders-rows"
import { CalendarBlank, Check, MapPin } from "@/components/ph"
import { Block, Group } from "@/components/record-kit"
import { SITES, SLOTS, atSlot, bookingDays, firstOpen, goneOn, item as findItem, money, nextWord, type Site } from "@/lib/catalog"
import { addToCalendar, directions } from "@/lib/links"
import { dayLabel, weekdayOf } from "@/lib/member"
import { card, color, font, hairline, ink, space, type } from "@/lib/theme"

/* Booking a test or scan from the catalog (client deck, screen 54, "Book
   Your Draw": "Order, then straight to a time"): paying opens the
   calendar, not a waiting room. The physician's order goes to her portal
   and is signed in the background, exactly as it is at enrolment.

   Where     the three nearest sites with their distance and next opening
   When      four days and eight times a day, with what is gone shown as
             gone
   A note    nothing to bring and nothing to print: the lab has the order
             before the patient arrives, so the name at the desk is the
             whole of it. The signature is stated once and never blocks
             anything: a patient who has paid should be choosing a
             morning, not watching a status bar

   Confirm names the day and the time. From the catalog to a booked
   appointment in three screens. */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CatalogBookScreen() {
  const { id, more } = useLocalSearchParams<{ id: string; more?: string }>()
  const it = id ? findItem(id) : undefined
  // Several lab panels ordered together share one draw.
  const extra = (more ? more.split(",") : []).map(findItem).filter((x): x is NonNullable<typeof x> => !!x)
  const [siteId, setSiteId] = React.useState(SITES[0].id)
  const [day, setDay] = React.useState(0)
  const [time, setTime] = React.useState<string | undefined>(() => firstOpen(0))
  const [booked, setBooked] = React.useState(false)

  if (!it || !it.visit || !it.site) return <PageNotFoundState />

  const site = SITES.find((s) => s.id === siteId) ?? SITES[0]
  const days = bookingDays(site)
  const when = time ? atSlot(days[day], time) : undefined
  const where = `${it.site} — ${site.town}, ${site.address}`
  const { noun, about, bring } = it.visit
  const all = [it, ...extra]
  const total = all.reduce((sum, i) => sum + i.member, 0)
  const named = all.length > 1 ? `${all.length} tests` : it.name
  const title = `Book your ${noun}`

  const pickSite = (s: Site) => {
    setSiteId(s.id)
    setDay(0)
    setTime(firstOpen(0))
  }
  const pickDay = (i: number) => {
    setDay(i)
    // A time that is gone on the new day gives way to its first open one.
    setTime((t) => (t && !goneOn(i, t) ? t : firstOpen(i)))
  }

  if (booked && when)
    return (
      <FlowScreen
        page
        title={title}
        back={false}
        footer={<PrimaryButton onPress={() => router.dismissTo("/care")}>Done</PrimaryButton>}
      >
        <View style={styles.done}>
          <PageGround />
          <Art name="calendar" size={60} />
          <View style={styles.doneWords}>
            <Text style={styles.doneTitle} accessibilityRole="header">{`Booked for ${dayLabel(when)}, ${slotWords(time!)}`}</Text>
            <Text style={styles.doneMeta}>{`${where}. Paid ${money(total)}. Dr. Patel will see the result when it's done.`}</Text>
          </View>
        </View>
        <View style={styles.pair}>
          <IconAction grow icon={<CalendarBlank size={14} color={ink.primary} />} onPress={() => addToCalendar({ title: named, start: when, where })}>
            Add to calendar
          </IconAction>
          <IconAction grow icon={<MapPin size={14} color={ink.primary} />} onPress={() => directions(where)}>
            Directions
          </IconAction>
        </View>
      </FlowScreen>
    )

  return (
    <FlowScreen
      page
      title={title}
      footer={
        <PrimaryButton onPress={() => setBooked(true)} disabled={!when}>
          {when ? `Confirm · ${weekdayOf(when)} ${dayLabel(when).slice(5)}, ${slotWords(time!)}` : "Choose a time"}
        </PrimaryButton>
      }
    >
      <Text style={styles.intro}>{`${all.length > 1 ? all.map((i) => i.name).join(", ") : it.name}, paid ${money(total)}. ${about}`}</Text>

      <Block title="Where">
        <View accessibilityRole="radiogroup">
          <Group>
            {SITES.map((s) => (
              <SiteRow key={s.id} site={s} partner={it.site!} selected={s.id === siteId} onPress={() => pickSite(s)} />
            ))}
          </Group>
        </View>
      </Block>

      <Block title="When" meta={site.town}>
        <View style={styles.days} accessibilityRole="radiogroup" accessibilityLabel="Day">
          {days.map((d, i) => (
            <Pressable
              key={d.toDateString()}
              onPress={() => pickDay(i)}
              accessibilityRole="radio"
              accessibilityState={{ checked: i === day }}
              accessibilityLabel={dayLabel(d)}
              style={({ pressed }) => [styles.dayPill, i === day && styles.on, pressed && styles.pressed]}
            >
              <Text style={[styles.dayName, i === day && styles.onText]}>{DAYS[d.getDay()]}</Text>
              <Text style={[styles.dayNum, i === day && styles.onText]}>{d.getDate()}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.slots} accessibilityRole="radiogroup" accessibilityLabel="Time">
          {SLOTS.map((t) => {
            const gone = goneOn(day, t)
            const on = t === time && !gone
            return (
              <Pressable
                key={t}
                disabled={gone}
                onPress={() => setTime(t)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, disabled: gone }}
                accessibilityLabel={gone ? `${slotWords(t)}, gone` : slotWords(t)}
                style={({ pressed }) => [styles.slot, on && styles.on, gone && styles.gone, pressed && !gone && styles.pressed]}
              >
                <Text style={[styles.slotText, on && styles.onText, gone && styles.goneText]}>{t}</Text>
              </Pressable>
            )
          })}
        </View>
      </Block>

      <View style={styles.note}>
        <View style={styles.noteMark}>
          <Check size={12} color={color.primary} weight="bold" />
        </View>
        <Rich style={styles.noteText}>{`**Nothing to bring and nothing to print.** ${bring} Give your name at the desk.`}</Rich>
      </View>

    </FlowScreen>
  )
}

/** "8:15 am" */
const slotWords = (t: string) => `${t} am`

/** One site in the single choice list: its name and address, its distance,
    and when it next has a time, in teal. */
function SiteRow({ site, partner, selected, onPress }: { site: Site; partner: string; selected: boolean; onPress: () => void }) {
  const next = nextWord(site)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${partner}, ${site.town}. ${site.address}, ${site.miles} miles. Next opening ${next}`}
      style={({ pressed }) => [styles.site, selected && styles.siteOn, pressed && styles.pressed]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
      <View style={styles.siteBody}>
        <Text style={styles.siteName}>{`${partner} — ${site.town}`}</Text>
        <Text style={styles.siteMeta}>{`${site.address} · ${site.miles} miles`}</Text>
      </View>
      <View style={styles.next}>
        <Text style={styles.nextLabel}>next</Text>
        <Text style={styles.nextWhen}>{next}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  intro: { ...type.body },

  site: { flexDirection: "row", alignItems: "center", gap: space.lead, paddingVertical: space.rowY, paddingHorizontal: 2 },
  siteOn: {},
  // A grey ring until chosen; chosen, a teal ring with a teal dot.
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: hairline.outline, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: color.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary },
  siteBody: { flex: 1, gap: space.stack },
  siteName: { ...type.title },
  siteMeta: { ...type.label },
  next: { alignItems: "flex-end" },
  nextLabel: { ...type.caption },
  nextWhen: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, color: ink.primary },

  days: { flexDirection: "row", gap: space.inline },
  dayPill: { flex: 1, alignItems: "center", paddingVertical: space.inline, borderRadius: 8, borderWidth: 1, borderColor: hairline.outline, backgroundColor: color.background, boxShadow: card.shadowXs },
  dayName: { ...type.captionStrong, color: ink.secondary },
  dayNum: { ...type.stat },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: space.inline },
  slot: { width: "23.2%", alignItems: "center", justifyContent: "center", height: 36, borderRadius: 8, borderWidth: 1, borderColor: hairline.outline, backgroundColor: color.background },
  slotText: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink.content },
  on: { backgroundColor: color.primary, borderColor: color.primary },
  onText: { color: ink.onColor },
  gone: { backgroundColor: color.surface, borderColor: "transparent" },
  goneText: { color: ink.tertiary, opacity: 0.55 },

  note: { flexDirection: "row", gap: space.lead, alignItems: "flex-start", padding: space.card, borderRadius: 8, borderWidth: 1, borderColor: hairline.edge, backgroundColor: color.primaryTint },
  noteMark: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center" },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },

  done: { alignItems: "center", gap: space.item, paddingVertical: 24, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: hairline.edge, overflow: "hidden" },
  doneWords: { alignItems: "center", gap: space.inline },
  doneTitle: { ...type.section, textAlign: "center" },
  doneMeta: { ...type.label, textAlign: "center" },
  pair: { flexDirection: "row", gap: space.item },
})
