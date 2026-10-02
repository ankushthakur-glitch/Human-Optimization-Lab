import { Linking, Platform } from "react-native"

/* The phone's own tools, for a booking, an appointment or a safety
   message: dialling a number, directions in maps, and a calendar entry.
   One behaviour for the same pills everywhere ("Call", "Directions", "Add
   to calendar" on a test, a booking, a visit, the medicines page and the
   assistant). Each opens outside the app and never claims it worked; if
   nothing can open the link (a desktop browser and a phone number),
   nothing happens. */

/** Dials a number written the way the app shows it: "(858) 555-0100". */
export function call(phone: string) {
  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`).catch(() => {})
}

/** Directions to an address or a place: Apple Maps on an iPhone, Google
    Maps on everything else. */
export function directions(address: string) {
  const q = encodeURIComponent(address)
  Linking.openURL(Platform.OS === "ios" ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {})
}

/** A ready to save calendar entry, opened in the calendar's own page (the
    app carries no calendar module): the title, the start, an hour by
    default, and where. */
export function addToCalendar({ title, start, minutes = 60, where }: { title: string; start: Date; minutes?: number; where: string }) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const end = new Date(start.getTime() + minutes * 60_000)
  const params = [`text=${encodeURIComponent(title)}`, `dates=${stamp(start)}/${stamp(end)}`, `location=${encodeURIComponent(where)}`]
  Linking.openURL(`https://calendar.google.com/calendar/r/eventedit?${params.join("&")}`).catch(() => {})
}
