import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon"
import AngryIcon from "@hugeicons/core-free-icons/AngryIcon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon"
import AudioWave01Icon from "@hugeicons/core-free-icons/AudioWave01Icon"
import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import BloodPressureIcon from "@hugeicons/core-free-icons/BloodPressureIcon"
import Bookmark02Icon from "@hugeicons/core-free-icons/Bookmark02Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import Call02Icon from "@hugeicons/core-free-icons/Call02Icon"
import CallIcon from "@hugeicons/core-free-icons/CallIcon"
import Camera01Icon from "@hugeicons/core-free-icons/Camera01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import CheckmarkSquare02Icon from "@hugeicons/core-free-icons/CheckmarkSquare02Icon"
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon"
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon"
import Dumbbell01Icon from "@hugeicons/core-free-icons/Dumbbell01Icon"
import FaceIdIcon from "@hugeicons/core-free-icons/FaceIdIcon"
import FootprintsIcon from "@hugeicons/core-free-icons/FootprintsIcon"
import HappyIcon from "@hugeicons/core-free-icons/HappyIcon"
import Home09Icon from "@hugeicons/core-free-icons/Home09Icon"
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import InLoveIcon from "@hugeicons/core-free-icons/InLoveIcon"
import Invoice01Icon from "@hugeicons/core-free-icons/Invoice01Icon"
import KeyboardIcon from "@hugeicons/core-free-icons/KeyboardIcon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import Mic01Icon from "@hugeicons/core-free-icons/Mic01Icon"
import MinusSignIcon from "@hugeicons/core-free-icons/MinusSignIcon"
import Navigation03Icon from "@hugeicons/core-free-icons/Navigation03Icon"
import NeutralIcon from "@hugeicons/core-free-icons/NeutralIcon"
import Notification01Icon from "@hugeicons/core-free-icons/Notification01Icon"
import PauseIcon from "@hugeicons/core-free-icons/PauseIcon"
import PlayIcon from "@hugeicons/core-free-icons/PlayIcon"
import RiceBowl01Icon from "@hugeicons/core-free-icons/RiceBowl01Icon"
import Sad01Icon from "@hugeicons/core-free-icons/Sad01Icon"
import ScanImageIcon from "@hugeicons/core-free-icons/ScanImageIcon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import SecurityCheckIcon from "@hugeicons/core-free-icons/SecurityCheckIcon"
import SmartWatch01Icon from "@hugeicons/core-free-icons/SmartWatch01Icon"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon"
import TapeMeasureIcon from "@hugeicons/core-free-icons/TapeMeasureIcon"
import Task01Icon from "@hugeicons/core-free-icons/Task01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon"
import ViewIcon from "@hugeicons/core-free-icons/ViewIcon"
import ViewOffSlashIcon from "@hugeicons/core-free-icons/ViewOffSlashIcon"
import WeightScale01Icon from "@hugeicons/core-free-icons/WeightScale01Icon"

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
export const IconBell = ({ size = 20, color }: IconProps) => <HugeIcon icon={Notification01Icon} size={size} color={color} />
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

/* The member's day, the record's pages and the plan (FINAL-SPEC F.4): what
   each icon stands for is its name. Row and door icons are 18 (16 in hero
   rows and doors). */

export const IconCamera = ({ size = 18, color }: IconProps) => <HugeIcon icon={Camera01Icon} size={size} color={color} />
export const IconKeyboard = ({ size = 18, color }: IconProps) => <HugeIcon icon={KeyboardIcon} size={size} color={color} />
export const IconDumbbell = ({ size = 18, color }: IconProps) => <HugeIcon icon={Dumbbell01Icon} size={size} color={color} />
export const IconWalk = ({ size = 18, color }: IconProps) => <HugeIcon icon={FootprintsIcon} size={size} color={color} />
export const IconScale = ({ size = 18, color }: IconProps) => <HugeIcon icon={WeightScale01Icon} size={size} color={color} />
export const IconBloodPressure = ({ size = 18, color }: IconProps) => <HugeIcon icon={BloodPressureIcon} size={size} color={color} />
export const IconBowl = ({ size = 18, color }: IconProps) => <HugeIcon icon={RiceBowl01Icon} size={size} color={color} />
export const IconClock = ({ size = 18, color }: IconProps) => <HugeIcon icon={Clock01Icon} size={size} color={color} />
export const IconPlay = ({ size = 18, color }: IconProps) => <HugeIcon icon={PlayIcon} size={size} color={color} />
export const IconBookmark = ({ size = 18, color }: IconProps) => <HugeIcon icon={Bookmark02Icon} size={size} color={color} />
export const IconCalendarAdd = ({ size = 18, color }: IconProps) => <HugeIcon icon={CalendarAdd01Icon} size={size} color={color} />
export const IconDirections = ({ size = 18, color }: IconProps) => <HugeIcon icon={Navigation03Icon} size={size} color={color} />
export const IconInfo = ({ size = 18, color }: IconProps) => <HugeIcon icon={InformationCircleIcon} size={size} color={color} />
export const IconMinus = ({ size = 18, color }: IconProps) => <HugeIcon icon={MinusSignIcon} size={size} color={color} />
export const IconSearch = ({ size = 18, color }: IconProps) => <HugeIcon icon={Search01Icon} size={size} color={color} />
export const IconCard = ({ size = 18, color }: IconProps) => <HugeIcon icon={CreditCardIcon} size={size} color={color} />
export const IconInvoice = ({ size = 18, color }: IconProps) => <HugeIcon icon={Invoice01Icon} size={size} color={color} />
export const IconPause = ({ size = 18, color }: IconProps) => <HugeIcon icon={PauseIcon} size={size} color={color} />
export const IconWatch = ({ size = 18, color }: IconProps) => <HugeIcon icon={SmartWatch01Icon} size={size} color={color} />
export const IconAward = ({ size = 18, color }: IconProps) => <HugeIcon icon={Award01Icon} size={size} color={color} />
export const IconScan = ({ size = 18, color }: IconProps) => <HugeIcon icon={ScanImageIcon} size={size} color={color} />
export const IconTape = ({ size = 18, color }: IconProps) => <HugeIcon icon={TapeMeasureIcon} size={size} color={color} />
export const IconUpload = ({ size = 18, color }: IconProps) => <HugeIcon icon={Upload04Icon} size={size} color={color} />
export const IconImage = ({ size = 18, color }: IconProps) => <HugeIcon icon={Image01Icon} size={size} color={color} />
export const IconCall = ({ size = 18, color }: IconProps) => <HugeIcon icon={Call02Icon} size={size} color={color} />

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
export const IconToDo = tabIcon(CheckmarkSquare02Icon, [0])
