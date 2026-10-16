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
  Compass,
  Lightbulb,
  Users,
} from "@/components/ph"
import type { Hue } from "@/components/record-kit"

/* The plan's goals (Journey_7 screens 2 and 3), shared by /goals, where
   they are chosen, and /goals-record, where each is checked against the
   record. */

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

/** The goals grouped as the "What would you like to improve?" step shows
    them: five expandable categories, 84 goals. A goal is saved by its label,
    as the flat list was. */
export type GoalCategory = { id: string; name: string; desc: string; icon: Icon; hue: Hue; goals: string[] }

export const CATEGORIES: GoalCategory[] = [
  {
    id: "phys",
    name: "Physical health",
    desc: "Your body, energy and strength",
    icon: Heart,
    hue: "red",
    goals: ["Lose weight or reduce body fat", "Improve metabolic health", "Improve cholesterol and heart health", "Gain or preserve muscle", "Improve bone health", "Improve sleep", "Increase energy", "Improve fitness and VO₂ max", "Lower blood pressure", "Balance blood sugar", "Reduce inflammation", "Improve gut health", "Walk more every day", "Improve flexibility and mobility", "Reduce joint or back pain", "Support hormone balance", "Improve skin and hair health", "Quit or cut back on alcohol"],
  },
  {
    id: "emo",
    name: "Emotional well-being",
    desc: "Mood, stress and resilience",
    icon: Smiley,
    hue: "violet",
    goals: ["Feel less stressed", "Manage anxiety", "Lift my mood", "Feel calmer in the evening", "Build a daily calm routine", "Be kinder to myself", "Handle setbacks better", "Reduce overthinking", "Feel more joy day to day", "Process difficult emotions", "Lower burnout risk", "Improve focus under pressure", "Spend less time on screens", "Practice gratitude", "Get through grief or change", "Wake up feeling rested", "Feel more in control"],
  },
  {
    id: "rel",
    name: "Relationships",
    desc: "Family, friends and community",
    icon: Users,
    hue: "blue",
    goals: ["Connect with friends more often", "Strengthen my partnership", "Be more present with family", "Make new friends", "Reduce loneliness", "Communicate more openly", "Set healthier boundaries", "Join a community group", "Support an aging parent", "Spend more time outdoors with others", "Volunteer locally", "Resolve a long-running conflict", "Plan regular family time", "Be a better listener", "Ask for help when I need it", "Mentor someone"],
  },
  {
    id: "purp",
    name: "Purpose",
    desc: "Meaning, values and direction",
    icon: Compass,
    hue: "amber",
    goals: ["Clarify what matters to me", "Find more meaning in my work", "Set a long-term life goal", "Live closer to my values", "Start a creative project", "Reduce time on things that drain me", "Give back to others", "Plan for retirement or a career change", "Build a weekly reflection habit", "Spend time in nature", "Explore faith or spirituality", "Leave a legacy for family", "Take a meaningful trip", "Improve work-life balance", "Finish something I started", "Say no more often"],
  },
  {
    id: "int",
    name: "Intellectual growth",
    desc: "Learning, memory and curiosity",
    icon: Lightbulb,
    hue: "teal",
    goals: ["Sharpen my memory", "Improve focus and attention", "Learn a new language", "Read more books", "Learn a new skill", "Keep my brain active as I age", "Reduce brain fog", "Try a new hobby", "Take an online course", "Practice a musical instrument", "Write regularly", "Learn about my own health", "Play strategy games", "Limit multitasking", "Teach someone what I know", "Follow a daily curiosity habit", "Improve decision making"],
  },
]

export const GOAL_TOTAL = CATEGORIES.reduce((n, c) => n + c.goals.length, 0)

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

/** A chosen goal with its icon, for step 2 (/goals-record). */
// A goal saved under its old bracketed name ("Improve metabolic health (blood
// sugar, A1C)") still finds its icon.
export const goalOf = (label: string): Goal => GOALS.find((g) => g.label === label.replace(/\s*\(.*\)$/, "")) ?? ownGoal(label)
