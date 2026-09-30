import AngryIcon from "@hugeicons/core-free-icons/AngryIcon"
import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon"
import AudioWave01Icon from "@hugeicons/core-free-icons/AudioWave01Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import CallIcon from "@hugeicons/core-free-icons/CallIcon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import FaceIdIcon from "@hugeicons/core-free-icons/FaceIdIcon"
import HappyIcon from "@hugeicons/core-free-icons/HappyIcon"
import Home09Icon from "@hugeicons/core-free-icons/Home09Icon"
import InLoveIcon from "@hugeicons/core-free-icons/InLoveIcon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import Message01Icon from "@hugeicons/core-free-icons/Message01Icon"
import Mic01Icon from "@hugeicons/core-free-icons/Mic01Icon"
import NeutralIcon from "@hugeicons/core-free-icons/NeutralIcon"
import Sad01Icon from "@hugeicons/core-free-icons/Sad01Icon"
import SecurityCheckIcon from "@hugeicons/core-free-icons/SecurityCheckIcon"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon"
import Task01Icon from "@hugeicons/core-free-icons/Task01Icon"
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
export const IconShield = ({ size = 20, color }: IconProps) => <HugeIcon icon={SecurityCheckIcon} size={size} color={color} />
export const IconCalendar = ({ size = 20, color }: IconProps) => <HugeIcon icon={Calendar03Icon} size={size} color={color} />
export const IconPhone = ({ size = 20, color }: IconProps) => <HugeIcon icon={CallIcon} size={size} color={color} />
export const IconPin = ({ size = 20, color }: IconProps) => <HugeIcon icon={Location01Icon} size={size} color={color} />

export const IconChevronRight = ({ size = 18, color }: IconProps) => (
  <HugeIcon icon={ArrowRight01Icon} size={size} color={color} />
)
export const IconChevronLeft = ({ size = 20, color }: IconProps) => (
  <HugeIcon icon={ArrowLeft01Icon} size={size} color={color} strokeWidth={1.8} />
)
export const IconClose = ({ size = 20, color }: IconProps) => (
  <HugeIcon icon={Cancel01Icon} size={size} color={color} strokeWidth={1.8} />
)
export const IconSend = ({ size = 20, color }: IconProps) => (
  <HugeIcon icon={ArrowUp02Icon} size={size} color={color} strokeWidth={2} />
)

export const IconMic = ({ size = 22, color }: IconProps) => <HugeIcon icon={Mic01Icon} size={size} color={color} />
export const IconVoice = ({ size = 22, color }: IconProps) => (
  <HugeIcon icon={AudioWave01Icon} size={size} color={color} strokeWidth={1.8} />
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

/** Marks what the record recommends; filled so it holds at small sizes. */
export const IconSparkle = ({ size = 16, color }: IconProps) => (
  <HugeIcon icon={SparklesIcon} size={size} color={color} solid={[0, 1]} />
)

/* The tab bar's icons: outline at rest, filled when selected. `solid` names
   each icon's body; its inner lines are cut out of the fill in `cut`. */

export type TabIconProps = IconProps & { active?: boolean; cut?: string }

function tabIcon(icon: typeof Home09Icon, body: readonly number[]) {
  return function TabIcon({ size = 22, color, active, cut }: TabIconProps) {
    return <HugeIcon icon={icon} size={size} color={color} solid={active ? body : undefined} cut={cut} />
  }
}

export const IconHome = tabIcon(Home09Icon, [0])
export const IconResults = tabIcon(Analytics01Icon, [3])
export const IconPlan = tabIcon(Task01Icon, [0, 2])
export const IconCareTeam = tabIcon(Message01Icon, [1])
