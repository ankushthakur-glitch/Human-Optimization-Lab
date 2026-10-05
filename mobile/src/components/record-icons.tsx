import * as React from "react"
import Svg, { Path } from "react-native-svg"

import { Bandaids, Buildings, CalendarCheck, ChartLine, FileText, Flask, Heartbeat, Hospital, Microscope, Pill, Syringe, Warning } from "@/components/ph"

/* Icons for the kinds of records and the places they come from, as the
   Figma "Hol" file draws its Record tab (5 Oct 2026): Phosphor at regular
   weight, and for conditions the file's own heart with a plus, drawn here
   at its 1.125 stroke on a 16 grid. */

export type RecordIconName =
  | "visits"
  | "conditions"
  | "medications"
  | "allergies"
  | "labs"
  | "vitals"
  | "procedures"
  | "immunizations"
  | "documents"
  | "clinic"
  | "hospital"
  | "lab"
  /** History: every day, weigh in and reading (the member home's record rows). */
  | "chart"

type Glyph = React.ComponentType<{ size?: number; color?: string }>

/** The Figma's conditions glyph: a heart holding a plus. */
function HeartPlus({ size = 16, color }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M12.9751 2.66235C11.1873 1.56573 9.62693 2.00765 8.6896 2.71159C8.3052 3.00022 8.11307 3.14453 8 3.14453C7.88693 3.14453 7.6948 3.00022 7.3104 2.71159C6.37308 2.00765 4.81273 1.56573 3.02496 2.66235C0.678713 4.10153 0.147812 8.84947 5.55969 12.8551C6.59048 13.6181 7.10587 13.9996 8 13.9996C8.89413 13.9996 9.40953 13.6181 10.4403 12.8551C15.8522 8.84947 15.3213 4.10153 12.9751 2.66235Z"
        stroke={color}
        strokeWidth={1.125}
        strokeLinecap="round"
      />
      <Path d="M8 6V10M6 8H10" stroke={color} strokeWidth={1.125} strokeLinecap="round" />
    </Svg>
  )
}

const ICONS: Record<RecordIconName, Glyph> = {
  visits: CalendarCheck,
  conditions: HeartPlus,
  medications: Pill,
  allergies: Warning,
  labs: Flask,
  vitals: Heartbeat,
  procedures: Bandaids,
  immunizations: Syringe,
  documents: FileText,
  clinic: Buildings,
  hospital: Hospital,
  lab: Microscope,
  chart: ChartLine,
}

export function RecordIcon({ name, size = 16, color }: { name: RecordIconName; size?: number; color: string }) {
  const Icon = ICONS[name]
  return <Icon size={size} color={color} />
}
