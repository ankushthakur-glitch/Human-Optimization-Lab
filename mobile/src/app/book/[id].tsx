import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { keepTogether } from "@/components/care-gap"
import { byPrice, openingOf, partnerLine } from "@/components/care-orders-book"
import { ChoiceRow } from "@/components/care-orders-rows"
import { PageNotFoundState } from "@/components/error-state"
import { FlowScreen } from "@/components/flow"
import { IconCard, IconInfo } from "@/components/icons"
import { Banner, Block, Card, ChipRow, Group, HUE, NeedsRow, SmallAction, TextAction } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { toast } from "@/components/toast"
import { Button } from "@/components/ui"
import { showDate } from "@/lib/dates"
import { addToCalendar, directions } from "@/lib/links"
import { dayLabel } from "@/lib/member"
import { useOnboarding } from "@/lib/onboarding"
import { order as findOrder, type Order } from "@/lib/record"
import { space, type } from "@/lib/theme"
import { bookingOf, localIso } from "@/lib/todo"

/* Booking a test with a partner that takes cash (FINAL-SPEC C.8.2, F-44,
   F-45): open to every patient, free or member, and only for a test whose
   order names no place (F-46). The places with their price and first
   opening, a time at the chosen place, the card, and one button with the
   amount in it (S-69). Paying shows the booking here, on the same page;
   Done goes back to the test, now booked. No membership on this page. */

/** The sample card on file. */
const CARD = "Visa ending 4242"

/** What to call a test in "Book your ..." (sample copy). */
const BOOK_NAME: Record<string, string> = { mammogram: "mammogram", "labs-nov": "blood test" }

/** What to know before the day, for clinical review (L-49); a test that
    needs fasting says so from its order. */
const NOTE: Record<string, { title: string; meta?: string }> = {
  // "turn out" held as one, so a narrow phone wraps before it.
  mammogram: { title: "Most callbacks after a screening mammogram turn out to be nothing.", meta: "Skip deodorant and lotion on the day." },
}

function noteOf(o: Order) {
  if (NOTE[o.id]) return NOTE[o.id]
  if (!o.prep) return undefined
  // "Fast for 10 to 12 hours." over "Water is fine."
  const end = o.prep.indexOf(". ")
  return end < 0 ? { title: o.prep } : { title: o.prep.slice(0, end + 1), meta: o.prep.slice(end + 2) }
}

/** "10:15 AM" on a day, as a date and time. */
function atTime(day: Date, time: string) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(time)
  const hours = m ? (Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0) : 12
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, m ? Number(m[2]) : 0)
}

/** "Dr. Maya Patel" as "Dr. Patel". */
function doctorOf(by: string) {
  const parts = by.split(",")[0].trim().split(/\s+/)
  return parts[0] === "Dr." && parts.length > 2 ? `Dr. ${parts[parts.length - 1]}` : parts.join(" ")
}

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const onboarding = useOnboarding()
  const [place, setPlace] = React.useState<string>()
  const [time, setTime] = React.useState("")
  const [card, setCard] = React.useState(onboarding.membership?.card ?? CARD)
  const [paying, setPaying] = React.useState(false)
  const [choosing, setChoosing] = React.useState(false)

  const o = id ? findOrder(id) : undefined
  // A place the doctor named is never swapped for a partner (F-46).
  const partners = o && !o.at ? byPrice(o.partners ?? []) : []
  if (!o || !partners.length) return <PageNotFoundState />

  const title = `Book your ${BOOK_NAME[o.id] ?? `${o.name.charAt(0).toLowerCase()}${o.name.slice(1)}`}`
  // Read where every screen reads a booking (lib/todo.ts bookingOf).
  const booking = bookingOf(o.id, onboarding)

  // Booked and paid through Inlay: the confirmation, here on the same page.
  // A paid booking always names its partner.
  if (booking?.paid) {
    const day = booking.date
    const when = booking.time ? `${dayLabel(day)}, ${booking.time}` : dayLabel(day)
    const where = booking.where ?? partners[0].name
    return (
      // Done goes back to the test, now booked; opened from a link with
      // nothing behind it, it opens the test.
      <FlowScreen
        page
        title={title}
        footer={<Button onPress={() => (router.canGoBack() ? router.back() : router.push({ pathname: "/order/[id]", params: { id: o.id } }))}>Done</Button>}
      >
        <Card style={styles.done}>
          <Art name="calendar" size={96} />
          <View style={styles.doneWords}>
            <Text style={styles.doneTitle} accessibilityRole="header">{`Booked for ${when}`}</Text>
            {/* Two centred lines on a phone: "Dr. Patel" is never split
                across them, and the second never holds a lone word. */}
            <Text style={styles.doneMeta}>{keepTogether(`${where}. Paid ${booking.paid}. ${doctorOf(o.by)} will see when it's done.`)}</Text>
          </View>
          <View style={styles.pills}>
            <SmallAction onPress={() => addToCalendar({ title: o.name, start: day, where })}>Add to calendar</SmallAction>
            <SmallAction onPress={() => directions(where)}>Directions</SmallAction>
          </View>
        </Card>
      </FlowScreen>
    )
  }

  const chosen = partners.find((p) => p.name === place)
  const opening = chosen && openingOf(chosen)
  const note = noteOf(o)
  // The amount is in the button (S-69): the chosen place's, or the lowest.
  const price = (chosen ?? partners[0]).price

  const pay = () => {
    if (!chosen || !opening || !time) return
    setPaying(true)
    const at = atTime(opening.date, time)
    // The payment takes a moment; then the booking is kept on the test.
    setTimeout(() => {
      onboarding
        .save({
          bookings: {
            ...onboarding.bookings,
            // In the local day and time form every booking is kept in.
            [o.id]: { where: chosen.name, when: `${dayLabel(at)}, ${time}`, price: chosen.price, paid: showDate(new Date()), at: localIso(at), time },
          },
        })
        .catch(() => {})
      setPaying(false)
    }, 1000)
  }

  return (
    <View style={styles.screen}>
      <FlowScreen
        page
        title={title}
        footer={
          <Button onPress={pay} disabled={!chosen || !time} pending={paying}>
            {`Pay and book, ${price}`}
          </Button>
        }
      >
        {note && (
          <Banner hue="teal" icon={<IconInfo size={18} color={HUE.teal.ink} />} title={keepTogether(note.title)} meta={note.meta && keepTogether(note.meta)} />
        )}

        <Block title="Where">
          <View accessibilityRole="radiogroup">
            <Group>
              {partners.map((p) => (
                <ChoiceRow
                  key={p.name}
                  title={p.name}
                  meta={partnerLine(p)}
                  selected={p.name === place}
                  onPress={() => {
                    setPlace(p.name)
                    // Times belong to a place: a new place starts without one.
                    if (p.name !== place) setTime("")
                  }}
                />
              ))}
            </Group>
          </View>
        </Block>

        {chosen && opening && (
          <Block title="When" meta={dayLabel(opening.date)}>
            <ChipRow options={chosen.times.map((t) => ({ value: t, label: t }))} value={time} onChange={setTime} />
          </Block>
        )}

        <Block title="Payment">
          <Group>
            <NeedsRow
              icon={<IconCard size={18} color={HUE.teal.ink} />}
              title={card}
              right={<TextAction onPress={() => setChoosing(true)}>Change</TextAction>}
            />
          </Group>
        </Block>
      </FlowScreen>

      {choosing && (
        <Sheet title="Pay with" onClose={() => setChoosing(false)}>
          <View accessibilityRole="radiogroup">
            <Group>
              {[onboarding.membership?.card ?? CARD, "Apple Pay"].map((m) => (
                <ChoiceRow
                  key={m}
                  title={m}
                  selected={m === card}
                  onPress={() => {
                    setCard(m)
                    setChoosing(false)
                  }}
                />
              ))}
            </Group>
          </View>
        </Sheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The confirmation is laid out as the kit's empty state is: the object,
  // the words and the pills centred, with the same room around them.
  done: { alignItems: "center", gap: space.card, paddingVertical: 24, paddingHorizontal: 20 },
  // A 16 pt title over the line under it (Frontline 4).
  doneWords: { alignItems: "center", gap: space.stack },
  doneTitle: { ...type.section, textAlign: "center" },
  doneMeta: { ...type.label, textAlign: "center" },
  pills: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.inline },
})
