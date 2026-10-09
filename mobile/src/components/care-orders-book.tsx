import * as React from "react"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native"

import { Art } from "@/components/art"
import { keepTogether } from "@/components/care-gap"
import { ChoiceRow, IconAction, InfoNote, SheetRows, SmallLink } from "@/components/care-orders-rows"
import { PageGround, PrimaryButton } from "@/components/hol"
import { CalendarBlank, CalendarCheck, CalendarPlus, Camera, CreditCard, FileText, Images, MapPin, Microscope, Phone, ShieldPlus, UploadSimple } from "@/components/ph"
import { Block, ChipRow, Group, HUE, NeedsRow, toast } from "@/components/record-kit"
import { Sheet } from "@/components/sheet"
import { Button, TextField } from "@/components/ui"
import { dayOfWords, showDate } from "@/lib/dates"
import { addToCalendar, directions } from "@/lib/links"
import { addDays, dayLabel, localDay, shortDay } from "@/lib/member"
import type { Added, Booking, State } from "@/lib/onboarding"
import { useOnboarding } from "@/lib/onboarding"
import { PATIENT } from "@/lib/patient"
import { BLOOD, IMAGING, phoneOf, type Order, type Partner } from "@/lib/record"
import { color, font, hairline, ink, space, touchRadius, type } from "@/lib/theme"
import { bookingOf, localIso } from "@/lib/todo"

/* Booking a test the doctor ordered, shared by the test's page and the care
   gap that follows it (FINAL-SPEC C.8, C.9):

   BookIt       the three ways forward on every test (user, 9 Oct 2026):
                "Book through the app" (a partner), "I booked it", and
                "Done somewhere else"
   BookedSheet  "When is it booked?": a date and a location she types,
                Save once the date reads. Saying so never closes the test
                (F-43)
   ElsewhereSheet  "Done somewhere else": when and where it was done, and
                the report to upload (a photo or a file)
   UpdateSheet  "Update test", the other answers: to an open test (Q-22),
                or to a booked one, which can be changed or cancelled but
                never booked again over itself (F-41)
   BookSheet    booking with a partner that takes cash (C.8.2, F-44, F-45): the
                places with their price and first opening, a time, the
                card, and one button with the amount in it (S-69); paid,
                the booking, and Done back to the test, now booked

   Plus the words for a partner's price and first opening, worked out from
   today so an opening is never in the past, and who to call about a
   booking. */

/** "Pacific Heart, La Jolla" as "Pacific Heart". */
export const placeShort = (where: string) => where.split(",")[0].trim()

/** "Harborview Longevity Clinic" as "Harborview". */
export const CLINIC = PATIENT.practice.split(" ")[0]

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

/** The ways forward on a test not booked yet, the same on every page:
    "Book through the app" opens the partner booking sheet (`onPartner`),
    "I booked it" asks the day and place (`onBooked`), and "Done somewhere
    else" asks when and where and takes the report (`onElsewhere`). */
export function BookIt({ order: o, onBooked, onPartner, onElsewhere }: { order: Order; onBooked: () => void; onPartner: () => void; onElsewhere: () => void }) {
  const partner = partnersFor(o)[0]
  const teal = HUE.teal.ink
  return (
    <Block title="Book it">
      <Group>
        {partner && (
          <NeedsRow icon={<CalendarPlus size={16} color={teal} />} title="Book through the app" meta={`From ${partnerLine(partner)}`} onPress={onPartner} />
        )}
        <NeedsRow icon={<CalendarCheck size={16} color={teal} />} title="I booked it" meta="Add the date and location" onPress={onBooked} />
        <NeedsRow icon={<Microscope size={16} color={teal} />} title="Done somewhere else" meta="Upload the report" onPress={onElsewhere} />
      </Group>
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

/** A date field: she types the day ("Nov 12", "11/12") and sees it read
    back inside the field ("Thu, Nov 12"). `year` as dayOfWords reads it:
    "next" for a day ahead, "nearest" for one gone by. */
function DateField({ label, value, onChange, year, example }: { label: string; value: string; onChange: (t: string) => void; year: "next" | "nearest"; example: string }) {
  const read = dayOfWords(value, new Date(), year)
  return (
    <TextField
      label={label}
      placeholder={example}
      value={value}
      onChangeText={onChange}
      autoCapitalize="words"
      autoCorrect={false}
      returnKeyType="done"
      trailing={
        // Kept in place while empty, so a screen reader hears the day as
        // soon as it reads.
        <Text style={styles.readBack} accessibilityLiveRegion="polite">
          {read ? sayDay(read) : ""}
        </Text>
      }
    />
  )
}

/** "When is it booked?": the date she types (read back in the field) and
    the location, for a test (optional), then Save once the date reads. A
    mammogram or a visit booked by phone is often weeks out, so any day
    ahead can be given. */
export function BookedSheet({ withWhere = false, onSave, onClose }: { withWhere?: boolean; onSave: (day: Date, where?: string) => void; onClose: () => void }) {
  const [date, setDate] = React.useState("")
  const [where, setWhere] = React.useState("")
  // An example two weeks from today, so it is never a day gone by.
  const [example] = React.useState(() => shortDay(addDays(new Date(), 14)))
  const chosen = dayOfWords(date)
  return (
    // The sheet rises with the keyboard while she types.
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet title="When is it booked?" onClose={onClose}>
        <DateField label="Date" value={date} onChange={setDate} year="next" example={example} />
        {withWhere && <TextField label="Location" placeholder="Clinic or lab, optional" value={where} onChangeText={setWhere} autoCapitalize="words" returnKeyType="done" />}
        <Button disabled={!chosen} onPress={() => chosen && onSave(chosen, where.trim() || undefined)}>
          Save
        </Button>
      </Sheet>
    </KeyboardAvoidingView>
  )
}

/** A report she picked: a photo or a file, by name. */
export type Report = { uri: string; name: string }

/** "Done somewhere else": when it was done (a day gone by), where, and
    the report, from the camera, her photos or a file; Save once the date
    reads. The report is optional: the result may still come in from the
    place itself. */
export function ElsewhereSheet({ onSave, onClose }: { onSave: (day: Date, where?: string, report?: Report) => void; onClose: () => void }) {
  const [date, setDate] = React.useState("")
  const [where, setWhere] = React.useState("")
  const [report, setReport] = React.useState<Report>()
  const [picking, setPicking] = React.useState(false)
  const [example] = React.useState(() => shortDay(addDays(new Date(), -7)))
  const read = dayOfWords(date, new Date(), "nearest")
  // A day still ahead was not done yet.
  const chosen = read && read.getTime() <= Date.now() ? read : undefined
  const teal = HUE.teal.ink

  const pick = (how: "camera" | "photos" | "file") => async () => {
    setPicking(false)
    try {
      if (how === "file") {
        const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true })
        if (!r.canceled) setReport({ uri: r.assets[0].uri, name: r.assets[0].name })
        return
      }
      if (how === "camera") {
        const allowed = await ImagePicker.requestCameraPermissionsAsync()
        if (!allowed.granted) return toast("Allow the camera in Settings to take a photo")
      }
      const r = await (how === "camera" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ["images"], quality: 0.8 })
      if (!r.canceled) setReport({ uri: r.assets[0].uri, name: r.assets[0].fileName ?? "Photo of the report" })
    } catch {
      toast("That couldn't be added")
    }
  }

  if (picking)
    return (
      <Sheet title="Upload report" onClose={() => setPicking(false)}>
        <SheetRows>
          {/* A browser opens its file chooser for the camera too; no camera row there. */}
          {Platform.OS !== "web" && <NeedsRow icon={<Camera size={16} color={teal} />} title="Take a photo" onPress={pick("camera")} />}
          <NeedsRow icon={<Images size={16} color={teal} />} title="Choose from photos" onPress={pick("photos")} />
          <NeedsRow icon={<FileText size={16} color={teal} />} title="Upload a file" onPress={pick("file")} />
        </SheetRows>
      </Sheet>
    )

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet title="Done somewhere else" onClose={onClose}>
        <DateField label="Date" value={date} onChange={setDate} year="nearest" example={example} />
        <TextField label="Location" placeholder="Clinic or lab" value={where} onChangeText={setWhere} autoCapitalize="words" returnKeyType="done" />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Report</Text>
          {report ? (
            <View style={[styles.upload, styles.uploaded]}>
              <FileText size={18} color={teal} />
              <Text style={styles.uploadName} numberOfLines={1}>
                {report.name}
              </Text>
              <SmallLink onPress={() => setReport(undefined)} accessibilityLabel={`Remove ${report.name}`}>
                Remove
              </SmallLink>
            </View>
          ) : (
            <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Upload report" style={({ pressed }) => [styles.upload, pressed && styles.pressed]}>
              <UploadSimple size={18} color={teal} />
              <Text style={styles.uploadWords}>Upload a photo or file</Text>
            </Pressable>
          )}
        </View>
        <Button disabled={!chosen} onPress={() => chosen && onSave(chosen, where.trim() || undefined, report)}>
          Save
        </Button>
      </Sheet>
    </KeyboardAvoidingView>
  )
}

/** What saving "Done somewhere else" keeps: the answer on the test, and the
    report, when there is one, added to her record to be checked. */
export function elsewhereSave(state: Pick<State, "testAnswers" | "added">, o: Order, day: Date, where?: string, report?: Report): Partial<State> {
  const testAnswers = { ...state.testAnswers, [o.id]: { answer: "elsewhere" as const, at: new Date().toISOString() } }
  if (!report) return { testAnswers }
  const added: Added = {
    id: `added-${Date.now()}`,
    title: o.name,
    detail: report.name,
    at: showDate(),
    report: { where: where ?? "", date: showDate(day), values: [] },
    via: "photo",
  }
  return { testAnswers, added: [...(state.added ?? []), added] }
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

/** The partners a test may be booked with: its own, or the imaging or
    blood partners for its kind, so every test can be booked through the
    app (user, 9 Oct 2026). */
export const partnersFor = (o: Order) => byPrice(o.partners ?? (o.kind === "imaging" ? IMAGING : BLOOD))

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
  // The report, as a field beside Date and Location: its label, then a
  // dashed box of the same height, edge and corners as theirs.
  field: { gap: 6 },
  fieldLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.text },
  upload: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inline,
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.inputBorder,
    borderRadius: touchRadius,
    backgroundColor: color.background,
  },
  // Picked: a plain edge, the name on the left and Remove on the right.
  uploaded: { borderStyle: "solid", justifyContent: "flex-start" },
  uploadWords: { fontFamily: font.medium, fontSize: 14, color: ink.primary },
  uploadName: { flex: 1, fontFamily: font.regular, fontSize: 16, color: color.text },
  pressed: { opacity: 0.6 },
  readBack: { ...type.metaStrong, color: ink.primary, paddingRight: 14 },
})
