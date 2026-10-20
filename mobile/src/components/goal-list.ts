import type * as React from "react"

import {
  Barbell,
  Bone,
  Brain,
  Cigarette,
  Drop,
  Eye,
  ForkKnife,
  Gauge,
  Heart,
  Heartbeat,
  Leaf,
  Lightning,
  Moon,
  PersonSimpleRun,
  Pill,
  Scales,
  Smiley,
  Sun,
  Target,
  Tooth,
  Wind,
} from "@/components/ph"
import type { Hue } from "@/components/record-kit"

/* The plan's goals (Journey_7 screens 2 and 3), shared by /goals, where
   they are chosen, and /goal-plans, where each adds its plan. */

type Icon = React.ComponentType<{ size?: number; color?: string; weight?: "regular" | "bold" | "fill" }>

export type Goal = { label: string; icon: Icon; hue: Hue }

export const GOALS: Goal[] = [
  { label: "Lose weight or reduce body fat", icon: Scales, hue: "teal" },
  { label: "Improve metabolic health", icon: Gauge, hue: "amber" },
  { label: "Improve cholesterol and heart health", icon: Heart, hue: "red" },
  { label: "Gain or preserve muscle", icon: Barbell, hue: "neutral" },
  { label: "Improve bone health", icon: Bone, hue: "violet" },
  { label: "Improve sleep", icon: Moon, hue: "blue" },
  { label: "Increase energy", icon: Lightning, hue: "amber" },
  { label: "Improve fitness and VO₂ max", icon: Heartbeat, hue: "teal" },
  { label: "Improve kidney health", icon: Drop, hue: "blue" },
]

/** Her own goal's icon, from the first words that match; a target when
    nothing does. */
const OWN_ICONS: { words: RegExp; icon: Icon; hue: Hue }[] = [
  { words: /sleep|insomnia|rest|nap|tired at night/, icon: Moon, hue: "blue" },
  { words: /stress|anxi|mood|calm|mental|happ|depress/, icon: Smiley, hue: "violet" },
  { words: /brain|memory|focus|cognit|think|clarity/, icon: Brain, hue: "violet" },
  { words: /breath|lung|asthma/, icon: Wind, hue: "blue" },
  { words: /weight|fat|waist|slim/, icon: Scales, hue: "teal" },
  { words: /sugar|glucose|a1c|diabet|insulin|kidney|hydrat|water/, icon: Drop, hue: "blue" },
  { words: /heart|cholesterol|blood pressure|bp\b|cardio/, icon: Heart, hue: "red" },
  { words: /muscle|strength|strong|gym|lift/, icon: Barbell, hue: "neutral" },
  { words: /bone|joint|posture|back pain/, icon: Bone, hue: "violet" },
  { words: /energy|fatigue|tired|stamina/, icon: Lightning, hue: "amber" },
  { words: /run|walk|step|fitness|vo2|vo₂|endurance|active/, icon: PersonSimpleRun, hue: "teal" },
  { words: /eat|diet|food|nutrition|meal|protein/, icon: ForkKnife, hue: "green" },
  { words: /gut|digest|inflamm|plant|vegan|natural/, icon: Leaf, hue: "green" },
  { words: /smok|vap|nicotine|quit/, icon: Cigarette, hue: "neutral" },
  { words: /medic|pill|supplement|vitamin/, icon: Pill, hue: "teal" },
  { words: /eye|vision|sight/, icon: Eye, hue: "blue" },
  { words: /teeth|tooth|dental|oral/, icon: Tooth, hue: "neutral" },
  { words: /skin|sun|vitamin d|outdoor/, icon: Sun, hue: "amber" },
  { words: /pulse|heart rate|hrv|recover/, icon: Heartbeat, hue: "red" },
]

export function ownGoal(label: string): Goal {
  const match = OWN_ICONS.find((o) => o.words.test(label.toLowerCase()))
  return { label, icon: match?.icon ?? Target, hue: match?.hue ?? "teal" }
}

/** A chosen goal with its icon, for /goal-plans. */
// A goal saved under its old bracketed name ("Improve metabolic health (blood
// sugar, A1C)") still finds its icon.
export const goalOf = (label: string): Goal => GOALS.find((g) => g.label === label.replace(/\s*\(.*\)$/, "")) ?? ownGoal(label)
