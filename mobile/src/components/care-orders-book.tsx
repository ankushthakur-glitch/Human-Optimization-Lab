import * as React from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { keepTogether } from "@/components/care-gap"
import { ChoiceRow, IconAction, InfoNote, QuietRow, SheetRows, SmallLink } from "@/components/care-orders-rows"
import { PageGround, PrimaryButton } from "@/components/hol"
import { CalendarBlank, CalendarCheck, CreditCard, MapPin, Microscope, Phone, ShieldPlus } from "@/components/ph"
import { Block, ChipRow, Group, HUE, NeedsRow } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { dayOfWords, showDate } from "@/lib/dates"
import { addToCalendar, call, directions } from "@/lib/links"
import { addDays, dayFrom, dayLabel, localDay, shortDay } from "@/lib/member"
import type { Booking } from "@/lib/onboarding"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { phoneOf, type Order, type Partner } from "@/lib/record"
import { hairline, ink, space, type } from "@/lib/theme"
import { bookingOf, localIso } from "@/lib/todo"

/* Booking a test the doctor ordered, shared by the test's page and the care
   gap that follows it (FINAL-SPEC C.8, C.9):

   BookIt       the ways to book: call the place the order names (never a
                partner in its place, F-46), or the clinic when it names
                none; "I booked it"; and, only when no place is named, the
                quiet partner row (F-51)
   BookedSheet  "When is it booked?": the next 14 days, "Later" for a day
                after them (she types it), an optional place, Save. Saying
                so never closes the test (F-43)
   UpdateSheet  "Update test", the other answers: to an open test (Q-22),
                or to a booked one, which can be changed or cancelled but
                never booked again over itself (F-41)
   BookSheet    booking with a partner that takes cash (C.8.2, F-44, F-45),
                only for a test whose order names no place (F-46): the
                places with their price and first opening, a time, the
                card, and one button with the amount in it (S-69); paid,
                the booking, and Done back to the test, now booked

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

/** The ways to book a test, for a test not booked yet: call the place
    (or the clinic), "I booked it", and the quiet partner row, which opens
    the booking sheet (`onPartner`). */
export function BookIt({ order: o, onBooked, onPartner }: { order: Order; onBooked: () => void; onPartner: () => void }) {
  const named = o.at ? placeShort(o.at) : undefined
  const phone = bookingPhone(o)
  // Only an order that names no place may go to a partner, and then only
  // as the quiet last choice, from the lowest price.
  const partner = named ? undefined : byPrice(o.partners ?? [])[0]
  return (
    <Block title="Book it">
      <Group>
        <NeedsRow
          icon={<Phone size={16} color={HUE.teal.ink} />}
          title={named ? `Call ${named}` : `Call ${CLINIC} to book`}
          meta={phone}
          onPress={phone ? () => call(phone) : undefined}
        />
        <NeedsRow icon={<CalendarCheck size={16} color={HUE.teal.ink} />} title="I booked it" onPress={onBooked} />
      </Group>
      {partner && (
        <QuietRow
          // The last three words kept together, so the line never ends on a
          // lone "partner".
          title={"You may be able to get this for less with a partner"}
          meta={`From ${partnerLine(partner)}`}
          onPress={onPartner}
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
  const teal = HUE.teal.ink
  return (
    <Sheet title="Update test" onClose={onClose}>
      <SheetRows>
        {booked && (
          <NeedsRow
            icon={<Phone size={16} color={teal} />}
            title="Change or cancel"
            meta={`${contact.name}, ${contact.phone}`}
            onPress={() => onAnswer("change")}
          />
        )}
        {!booked && <NeedsRow icon={<CalendarCheck size={16} color={teal} />} title="I booked it" onPress={() => onAnswer("booked")} />}
        <NeedsRow icon={<Microscope size={16} color={teal} />} title="Done somewhere else" onPress={() => onAnswer("elsewhere")} />
        {!booked && <NeedsRow icon={<Phone size={16} color={teal} />} title="I need help booking" meta={contact.phone} onPress={() => onAnswer("help")} />}
        <NeedsRow icon={<ShieldPlus size={16} color={teal} />} title="My doctor said I don't need it" onPress={() => onAnswer("not-needed")} />
      </SheetRows>
    </Sheet>
  )
}

/* ------------------------------------------------------ book a partner -- */

/** The sample card on file. */
const CARD = "Visa ending 4242"

/** What to call a test in "Book your ..." (sample copy). */
const BOOK_NAME: Record<string, string> = { mammogram: "mammogram", "labs-nov": "blood test" }

/** What to know before the day, for clinical review (L-49); a test that
    needs fasting says so from its order. */
const NOTE: Record<string, string> = {
  mammogram: "Most callbacks after a screening mammogram turn out to be nothing. Skip deodorant and lotion on the day.",
}

const noteOf = (o: Order) => NOTE[o.id] ?? o.prep

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

/** The partners a test may be booked with: none when its order names a
    place, which is never swapped for a partner (F-46). */
export const partnersFor = (o: Order) => (o.at ? [] : byPrice(o.partners ?? []))

/** "Book your blood test" (Figma), open to every patient, free or member.
    The sheet's middle sits on the page gradient between its header and a
    footer bar holding the one button. Paying shows the booking here, in
    the same sheet; Done closes it on the test, now booked. No membership
    here. */
export function BookSheet({ order: o, onClose }: { order: Order; onClose: () => void }) {
  const onboarding = useOnboarding()
  const [place, setPlace] = React.useState<string>()
  const [time, setTime] = React.useState("")
  const [card, setCard] = React.useState(onboarding.membership?.card ?? CARD)
  const [paying, setPaying] = React.useState(false)
  const [choosing, setChoosing] = React.useState(false)

  const partners = partnersFor(o)
  const title = `Book your ${BOOK_NAME[o.id] ?? `${o.name.charAt(0).toLowerCase()}${o.name.slice(1)}`}`
  // Read where every screen reads a booking (lib/todo.ts bookingOf).
  const booking = bookingOf(o.id, onboarding)
  if (!partners.length) return null

  // Booked and paid through Inlay: the confirmation, in the same sheet. A
  // paid booking always names its partner.
  if (booking?.paid) {
    const day = booking.date
    const when = booking.time ? `${dayLabel(day)}, ${booking.time}` : dayLabel(day)
    const where = booking.where ?? partners[0].name
    return (
      <Sheet title={title} onClose={onClose}>
        <View style={styles.done}>
          <PageGround />
          <Art name="calendar" size={60} />
          <View style={styles.doneWords}>
            <Text style={styles.doneTitle} accessibilityRole="header">{`Booked for ${when}`}</Text>
            {/* Two centred lines on a phone: "Dr. Patel" is never split
                across them, and the second never holds a lone word. */}
            <Text style={styles.doneMeta}>{keepTogether(`${where}. Paid ${booking.paid}. ${doctorOf(o.by)} will see when it's done.`)}</Text>
          </View>
        </View>
        <View style={styles.pair}>
          <IconAction grow icon={<CalendarBlank size={14} color={ink.primary} />} onPress={() => addToCalendar({ title: o.name, start: day, where })}>
            Add to calendar
          </IconAction>
          <IconAction grow icon={<MapPin size={14} color={ink.primary} />} onPress={() => directions(where)}>
            Directions
          </IconAction>
        </View>
        <View style={[styles.footer, styles.footerEdge]}>
          <PrimaryButton onPress={onClose}>Done</PrimaryButton>
        </View>
      </Sheet>
    )
  }

  if (choosing)
    return (
      <Sheet title="Pay with" onClose={() => setChoosing(false)}>
        <View accessibilityRole="radiogroup">
          <SheetRows>
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
          </SheetRows>
        </View>
      </Sheet>
    )

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
    <Sheet title={title} onClose={onClose}>
      <View style={styles.ground}>
        <PageGround />
        {!!note && <InfoNote>{keepTogether(note)}</InfoNote>}

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
            <ChipRow wrap options={chosen.times.map((t) => ({ value: t, label: t }))} value={time} onChange={setTime} />
          </Block>
        )}

        <Block title="Payment">
          <Group>
            <NeedsRow
              icon={<CreditCard size={16} color={HUE.teal.ink} />}
              title={card}
              right={<SmallLink onPress={() => setChoosing(true)}>Change</SmallLink>}
            />
          </Group>
        </Block>
      </View>
      <View style={[styles.footer, styles.footerRule]}>
        <PrimaryButton onPress={pay} disabled={!chosen || !time || paying}>
          {paying ? "Paying" : `Pay and book, ${price}`}
        </PrimaryButton>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  // The sheet's middle on the page gradient, edge to edge between its
  // header's hairline and the footer's (the sheet's own 16 taken back).
  ground: { marginHorizontal: -space.gutter, marginTop: -space.gutter, padding: space.gutter, paddingBottom: 24, gap: space.gutter, overflow: "hidden" },
  // The footer bar: a hairline over the one button, 16 around it; the
  // sheet keeps the room under it.
  footer: { marginHorizontal: -space.gutter, paddingHorizontal: space.gutter, paddingTop: space.gutter },
  footerRule: { marginTop: -space.gutter, borderTopWidth: 1, borderTopColor: hairline.edge },
  footerEdge: { marginTop: space.item, borderTopWidth: 1, borderTopColor: hairline.edge },
  // The confirmation: the object and the words centred on a soft card.
  done: {
    alignItems: "center",
    gap: space.item,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hairline.edge,
    overflow: "hidden",
  },
  doneWords: { alignItems: "center", gap: space.inline },
  doneTitle: { ...type.section, color: ink.content, textAlign: "center" },
  doneMeta: { ...type.label, textAlign: "center" },
  pair: { flexDirection: "row", gap: space.item },
  // The day as it was read, in teal words at 12 pt, inside the field on the
  // right, in the field's own 14 pt inset (the TextField in ui.tsx).
  readBack: { ...type.metaStrong, color: ink.primary, paddingRight: 14 },
})
