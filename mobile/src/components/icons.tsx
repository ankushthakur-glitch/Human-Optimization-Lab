import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon"
import AngryIcon from "@hugeicons/core-free-icons/AngryIcon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import ChartUpIcon from "@hugeicons/core-free-icons/ChartUpIcon"
import CheckmarkSquare02Icon from "@hugeicons/core-free-icons/CheckmarkSquare02Icon"
import CircleArrowLeft01Icon from "@hugeicons/core-free-icons/CircleArrowLeft01Icon"
import ClipboardListIcon from "@hugeicons/core-free-icons/ClipboardListIcon"
import FaceIdIcon from "@hugeicons/core-free-icons/FaceIdIcon"
import HappyIcon from "@hugeicons/core-free-icons/HappyIcon"
import HeartCheckIcon from "@hugeicons/core-free-icons/HeartCheckIcon"
import Home09Icon from "@hugeicons/core-free-icons/Home09Icon"
import InLoveIcon from "@hugeicons/core-free-icons/InLoveIcon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import NeutralIcon from "@hugeicons/core-free-icons/NeutralIcon"
import Sad01Icon from "@hugeicons/core-free-icons/Sad01Icon"
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import ViewIcon from "@hugeicons/core-free-icons/ViewIcon"
import ViewOffSlashIcon from "@hugeicons/core-free-icons/ViewOffSlashIcon"

import { HugeIcon } from "@/components/hugeicon"

/* The app's icons, all Hugeicons (the portal's set, see
   src/design-system/icons.tsx), at the portal's 1.5 stroke. */

type IconProps = { size?: number; color: string }

export const IconEye = ({ size = 18, color }: IconProps) => <HugeIcon icon={ViewIcon} size={size} color={color} />
export const IconEyeOff = ({ size = 18, color }: IconProps) => <HugeIcon icon={ViewOffSlashIcon} size={size} color={color} />
export const IconMail = ({ size = 20, color }: IconProps) => <HugeIcon icon={Mail01Icon} size={size} color={color} />
export const IconLock = ({ size = 20, color }: IconProps) => <HugeIcon icon={SquareLock02Icon} size={size} color={color} />
export const IconFaceId = ({ size = 22, color }: IconProps) => <HugeIcon icon={FaceIdIcon} size={size} color={color} />
export const IconCalendar = ({ size = 20, color }: IconProps) => <HugeIcon icon={Calendar03Icon} size={size} color={color} />
export const IconChevronLeft = ({ size = 20, color }: IconProps) => (
  <HugeIcon icon={ArrowLeft01Icon} size={size} color={color} strokeWidth={1.8} />
)

/** The assistant's rating, worst to best. */
export const RATING_FACES = [AngryIcon, Sad01Icon, NeutralIcon, HappyIcon, InLoveIcon]
export const IconFace = ({ face, size = 34, color }: IconProps & { face: number }) => (
  <HugeIcon icon={RATING_FACES[face]} size={size} color={color} />
)

/** Checkboxes, done rows and plan features. */
export function IconCheck({ size = 16, color, strokeWidth = 2 }: IconProps & { strokeWidth?: number }) {
  return <HugeIcon icon={Tick02Icon} size={size} color={color} strokeWidth={strokeWidth} />
}

/* The tab bar's icons: outline at rest, filled when selected. `solid` names
   each icon's body; its inner lines are cut out of the fill in `cut`. */

export type TabIconProps = IconProps & { active?: boolean; cut?: string }

function tabIcon(icon: typeof Home09Icon, body: readonly number[], keep?: readonly number[]) {
  return function TabIcon({ size = 22, color, active, cut }: TabIconProps) {
    return <HugeIcon icon={icon} size={size} color={color} solid={active ? body : undefined} cut={cut} keep={keep} />
  }
}

export const IconHome = tabIcon(Home09Icon, [0])
export const IconResults = tabIcon(Analytics01Icon, [3])
export const IconPlan = tabIcon(ClipboardListIcon, [1])
export const IconUpgrade = IconPlan
export const IconToDo = tabIcon(CheckmarkSquare02Icon, [0])
export const IconCare = tabIcon(HeartCheckIcon, [0])
/* The plan's own tabs (Back, Today, Progress): Back is never selected.
   Progress fills its three bars and keeps its arrow as a line. */
export const IconBack = tabIcon(CircleArrowLeft01Icon, [0])
export const IconToday = tabIcon(Calendar03Icon, [1])
export const IconProgress = tabIcon(ChartUpIcon, [0, 3, 4], [1, 2])
