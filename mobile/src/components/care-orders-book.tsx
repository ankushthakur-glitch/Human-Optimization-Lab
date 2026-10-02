import { router } from "expo-router"
import * as React from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native"

import { QuietRow } from "@/components/care-orders-rows"
import { IconCalendar, IconCall } from "@/components/icons"
import { RecordIcon } from "@/components/record-icons"
import { Block, ChipRow, Group, HUE, NeedsRow } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { dayOfWords } from "@/lib/dates"
import { call } from "@/lib/links"
import { addDays, dayFrom, dayLabel, localDay, shortDay } from "@/lib/member"
import type { Booking } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { phoneOf, type Order, type Partner } from "@/lib/record"
import { ink, type } from "@/lib/theme"

/* Booking a test the doctor ordered, shared by the test's page and the care
   gap that follows it (FINAL-SPEC C.8, C.9):

   BookIt       the ways to book: call the place the order names (never a
                partner in its place, F-46), or the clinic when it names
                none; "I booked it"; and, only when no place is named, the
                quiet partner row (F-51)
   BookedSheet  "When is it booked?": the next 14 days, "Later" for a day
                after them (she types it), an optional place, Save. Saying
                so never closes the test (F-43)
   UpdateSheet  the other answers: to an open test (Q-22), or to a booked
                one, which can be changed or cancelled but never booked
                again over itself (F-41)

   Plus the words for a partner's price and first opening, worked out from
   today so an opening is never in the past, and who to call. */

/** "Pacific Heart, La Jolla" as "Pacific Heart". */
export const placeShort = (where: string) => where.split(",")[0].trim()

/** "Harborview Longevity Clinic" as "Harborview". */
export const CLINIC = PATIENT.practice.split(" ")[0]

/** Who to call to book a test: the place the order names (its number from
    the record), or the clinic. */
export function bookingPhone(o: Pick<Order, "at">): string | undefined {
  return o.at ? phoneOf(o.at) : PATIENT.practicePhone
}

/** A place to call, as a row names it. */
export type Contact = { name: string; phone: string }

/** Who to call about a booked test: the place it is booked at (a partner
    or a place the record has a number for), or else the clinic, which can
    change any booking. */
export function contactFor(where?: string): Contact {
  const name = where ? placeShort(where) : undefined
  const phone = phoneOf(where)
  return name && phone ? { name, phone } : { name: CLINIC, phone: PATIENT.practicePhone }
}

const priceOf = (p: Partner) => Number(p.price.replace(/[^\d.]/g, "")) || 0

/** The partners from the lowest price up. */
export const byPrice = (partners: readonly Partner[]) => [...partners].sort((a, b) => priceOf(a) - priceOf(b))

/** A partner's first opening, counted from today and moved off a Sunday,
    when the places are closed: the day, and the words "today", "tomorrow"
    or "Wed, Oct 7". */
export function openingOf(p: Partner, now: Date = new Date()) {
  const days = p.soonestInDays + (addDays(now, p.soonestInDays).getDay() === 0 ? 1 : 0)
  const date = addDays(now, days)
  const words = days <= 0 ? "today" : days === 1 ? "tomorrow" : dayLabel(date)
  return { date, words }
}

/** A partner's price, then "first opening Wed, Oct 7". */
export const partnerLine = (p: Partner, now: Date = new Date()) => `${p.price}, first opening ${openingOf(p, now).words}`

/** The ways to book a test, for a test not booked yet. */
export function BookIt({ order: o, onBooked }: { order: Order; onBooked: () => void }) {
  const named = o.at ? placeShort(o.at) : undefined
  const phone = bookingPhone(o)
  // Only an order that names no place may go to a partner, and then only
  // as the quiet last choice, from the lowest price.
  const partner = named ? undefined : byPrice(o.partners ?? [])[0]
  return (
    <Block title="Book it">
      <Group>
        <NeedsRow
          icon={<IconCall size={18} color={HUE.teal.ink} />}
          title={named ? `Call ${named}` : `Call ${CLINIC} to book`}
          meta={phone}
          onPress={phone ? () => call(phone) : undefined}
        />
        <NeedsRow icon={<IconCalendar size={18} color={HUE.teal.ink} />} title="I booked it" onPress={onBooked} />
      </Group>
      {partner && (
        <QuietRow
          // The last three words kept together, so the line never ends on a
          // lone "partner".
          title={"You may be able to get this for less with a partner"}
          meta={`From ${partnerLine(partner)}`}
          onPress={() => router.push({ pathname: "/book/[id]", params: { id: o.id } })}
        />
      )}
    </Block>
  )
}

/** A test she booked herself, as she told it: the day (a local day key, no
    time), the place if she gave one, nothing paid through Inlay. It never
    closes the test (F-43). */
export function toldBooking(day: Date, where?: string): Booking {
  return { where: where ?? "", when: dayLabel(day), at: localDay(day) }
}

/** The bookings with the one she told us about for a test, or nothing to
    save when the test is booked and paid through Inlay: what she tells us
    never replaces a paid booking, with its place, time and payment. */
export function withTold(bookings: Record<string, Booking> | undefined, id: string, day: Date, where?: string) {
  if (bookings?.[id]?.price) return undefined
  return { ...bookings, [id]: toldBooking(day, where) }
}

/** "Thu, Nov 12", with the year when it is not this one: "Tue, Jan 5,
    2027". */
const sayDay = (d: Date, now: Date = new Date()) => (d.getFullYear() === now.getFullYear() ? dayLabel(d) : `${dayLabel(d)}, ${d.getFullYear()}`)

/** The chip for a day after the next 14. */
const LATER = "later"

/** "When is it booked?": a chip for each of the next 14 days, "Later" for
    any day after them, which she types ("Nov 12") and sees read back in
    the field ("Thu, Nov 12"), where (for a test, optional), and Save once
    there is a day. A mammogram or a visit booked by phone is often weeks
    out, so no booking is left without a day to give. */
export function BookedSheet({ withWhere = false, onSave, onClose }: { withWhere?: boolean; onSave: (day: Date, where?: string) => void; onClose: () => void }) {
  const [days] = React.useState(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1)))
  const [day, setDay] = React.useState("")
  const [later, setLater] = React.useState("")
  const [where, setWhere] = React.useState("")
  const options = [...days.map((d, i) => ({ value: localDay(d), label: i === 0 ? "Tomorrow" : dayLabel(d) })), { value: LATER, label: "Later" }]
  const typed = day === LATER ? dayOfWords(later) : undefined
  const chosen = day === LATER ? typed : day ? dayFrom(day) : undefined
  return (
    // The sheet rises with the keyboard while she types the day or the
    // place.
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet title="When is it booked?" onClose={onClose}>
        <ChipRow options={options} value={day} onChange={setDay} />
        {day === LATER && (
          <TextField
            label="Which day?"
            // An example a month from today, so it is never a day gone by.
            placeholder={shortDay(addDays(days[0], 29))}
            value={later}
            onChangeText={setLater}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            trailing={
              // Kept in place while empty, so a screen reader hears the day
              // as soon as it reads.
              <Text style={styles.readBack} accessibilityLiveRegion="polite">
                {typed ? sayDay(typed) : ""}
              </Text>
            }
          />
        )}
        {withWhere && <TextField label="Where" placeholder="Optional" value={where} onChangeText={setWhere} autoCapitalize="words" returnKeyType="done" />}
        <Button disabled={!chosen} onPress={() => chosen && onSave(chosen, where.trim() || undefined)}>
          Save
        </Button>
      </Sheet>
    </KeyboardAvoidingView>
  )
}

/** What she can tell us about a test: about an open one (Q-22), and
    "change" about a booked one (F-41). */
export type TestAnswer = "booked" | "elsewhere" | "help" | "change" | "not-needed"

/** "Update this test": the answers that fit where the test stands, each
    one tap. Open: "I booked it", "Done somewhere else", "I need help
    booking" (calls the clinic), "My doctor said I don't need it" (Q-22).
    Booked: "Change or cancel" (calls the place it is booked at, or the
    clinic), "Done somewhere else", "My doctor said I don't need it"; never
    "I booked it" or help booking, so what she tells us never replaces a
    booking, and never a paid one with its place, time and payment. */
export function UpdateSheet({
  booked = false,
  contact,
  onAnswer,
  onClose,
}: {
  booked?: boolean
  /** Who "I need help booking" or "Change or cancel" calls. */
  contact: Contact
  onAnswer: (answer: TestAnswer) => void
  onClose: () => void
}) {
  const ink = HUE.teal.ink
  return (
    <Sheet title="Update this test" onClose={onClose}>
      <Group>
        {booked && (
          <NeedsRow
            icon={<IconCall size={18} color={ink} />}
            title="Change or cancel"
            meta={`${contact.name}, ${contact.phone}`}
            onPress={() => onAnswer("change")}
          />
        )}
        {!booked && <NeedsRow icon={<IconCalendar size={18} color={ink} />} title="I booked it" onPress={() => onAnswer("booked")} />}
        <NeedsRow icon={<RecordIcon name="lab" size={18} color={ink} />} title="Done somewhere else" onPress={() => onAnswer("elsewhere")} />
        {!booked && <NeedsRow icon={<IconCall size={18} color={ink} />} title="I need help booking" meta={contact.phone} onPress={() => onAnswer("help")} />}
        <NeedsRow icon={<RecordIcon name="clinic" size={18} color={ink} />} title="My doctor said I don't need it" onPress={() => onAnswer("not-needed")} />
      </Group>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  // The day as it was read, in teal words at 12 pt, inside the field on the
  // right, in the field's own 14 pt inset (the TextField in ui.tsx).
  readBack: { ...type.metaStrong, color: ink.primary, paddingRight: 14 },
})
