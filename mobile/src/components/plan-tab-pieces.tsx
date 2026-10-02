import Bone01Icon from "@hugeicons/core-free-icons/Bone01Icon"
import DropletIcon from "@hugeicons/core-free-icons/DropletIcon"
import HeartPulseIcon from "@hugeicons/core-free-icons/HeartPulseIcon"
import WeightScale01Icon from "@hugeicons/core-free-icons/WeightScale01Icon"

import { HugeIcon, type IconSvgObject } from "@/components/hugeicon"
import type { FocusArea } from "@/lib/record"
import { color } from "@/lib/theme"

/* The icon of what a plan works on, shared by the plan screens (the free
   Plan tab and its showroom, the plan page, the member's own plan) and the
   score page, so a focus area is drawn the same way before she joins and
   after (its name is lib/offers.ts FOCUS_NAME, never a disease name, F-88,
   B-07). The ticked lines every list of the plan is made of are the record
   kit's CheckLines. */

const FOCUS_ICON: Record<FocusArea, IconSvgObject> = {
  "blood sugar": DropletIcon,
  weight: WeightScale01Icon,
  heart: HeartPulseIcon,
  bone: Bone01Icon,
}

/** A focus area's icon, for its tile. */
export function FocusIcon({ area, size = 18, color: ink = color.primary }: { area: FocusArea; size?: number; color?: string }) {
  return <HugeIcon icon={FOCUS_ICON[area]} size={size} color={ink} />
}
