import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Appointment01Icon from "@hugeicons/core-free-icons/Appointment01Icon"
import BandageIcon from "@hugeicons/core-free-icons/BandageIcon"
import ClinicIcon from "@hugeicons/core-free-icons/ClinicIcon"
import HealthIcon from "@hugeicons/core-free-icons/HealthIcon"
import Hospital02Icon from "@hugeicons/core-free-icons/Hospital02Icon"
import InjectionIcon from "@hugeicons/core-free-icons/InjectionIcon"
import MedicalFileIcon from "@hugeicons/core-free-icons/MedicalFileIcon"
import Medicine02Icon from "@hugeicons/core-free-icons/Medicine02Icon"
import MicroscopeIcon from "@hugeicons/core-free-icons/MicroscopeIcon"
import PulseRectangle01Icon from "@hugeicons/core-free-icons/PulseRectangle01Icon"
import TestTube01Icon from "@hugeicons/core-free-icons/TestTube01Icon"

import { HugeIcon, type IconSvgObject } from "@/components/hugeicon"

/* Icons for the kinds of records and the places they come from, all
   Hugeicons at the app's 1.5 stroke. */

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

const ICONS: Record<RecordIconName, IconSvgObject> = {
  visits: Appointment01Icon,
  conditions: HealthIcon,
  medications: Medicine02Icon,
  allergies: Alert02Icon,
  labs: TestTube01Icon,
  vitals: PulseRectangle01Icon,
  procedures: BandageIcon,
  immunizations: InjectionIcon,
  documents: MedicalFileIcon,
  clinic: ClinicIcon,
  hospital: Hospital02Icon,
  lab: MicroscopeIcon,
}

export function RecordIcon({ name, size = 20, color }: { name: RecordIconName; size?: number; color: string }) {
  return <HugeIcon icon={ICONS[name]} size={size} color={color} />
}
