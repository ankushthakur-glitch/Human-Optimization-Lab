import type { Food, Meal, Nutrients } from "@/lib/member"

/* What the prototype reads from a photo, from her voice or from what she
   typed (FINAL-SPEC C.22): the foods, a drafted portion for each with the
   words for a little less or a little more, and the one question about
   the hidden fats a reading cannot see (M-16). The real build gets these
   from the photo and voice analysis. Nothing here is saved until she has
   checked it, and a nutrient a reading has no value for stays unknown,
   never zero (M-17). Sample values for the sample patient. */

export type Portion = "less" | "right" | "more"

/** A food as read, before she checks it. */
export type DraftFood = {
  key: string
  name: string
  confidence: Food["confidence"]
  /** The amount read ("right"), and the words and share for less or more. */
  portions: Record<Portion, { words: string; factor: number }>
  /** For the amount read; a nutrient with no value is left out. */
  nutrients: Nutrients
}

/** The one question about what the reading cannot see. */
export type HiddenFat = {
  /** "Was there dressing or oil? About how much?" */
  question: string
  /** The name it is saved under: "Dressing". */
  name: string
  /** What one tablespoon adds. */
  per: Nutrients
  /** Kept beside the totals after "Not sure". */
  unsure: string
}

export type Reading = {
  how: Meal["how"]
  /** The meal's name once saved: "Chicken, quinoa and black bean bowl". */
  title: string
  foods: DraftFood[]
  fat?: HiddenFat
  /** What she said, for a voice reading. */
  transcript?: string
}

/** The answers to the hidden fats question, in the order shown. */
export const FAT_ANSWERS = [
  { id: "none", label: "None", spoons: 0 },
  { id: "one", label: "About 1 tablespoon", spoons: 1 },
  { id: "two", label: "About 2 tablespoons", spoons: 2 },
  { id: "unsure", label: "Not sure", spoons: undefined },
] as const

export type FatAnswer = (typeof FAT_ANSWERS)[number]["id"]

function food(
  key: string,
  name: string,
  portion: string,
  nutrients: Nutrients,
  less: [string, number],
  more: [string, number],
  confidence: Food["confidence"] = "high"
): DraftFood {
  return {
    key,
    name,
    confidence,
    nutrients,
    portions: { less: { words: less[0], factor: less[1] }, right: { words: portion, factor: 1 }, more: { words: more[0], factor: more[1] } },
  }
}

const CHICKEN = food("chicken", "Grilled chicken", "About 4 oz", { calories: 190, protein: 35, fiber: 0, addedSugar: 0, sodium: 360, satFat: 1.2, calcium: 15 }, ["About 3 oz", 0.75], ["About 6 oz", 1.5])
const QUINOA = food("quinoa", "Quinoa", "About half a cup", { calories: 110, protein: 4, fiber: 3, addedSugar: 0, sodium: 7, satFat: 0.1, calcium: 15 }, ["About a third of a cup", 0.67], ["About a cup", 2])
const BEANS = food("beans", "Black beans", "About a third of a cup", { calories: 75, protein: 5, fiber: 5, addedSugar: 0, sodium: 130, satFat: 0, calcium: 15 }, ["About a quarter of a cup", 0.75], ["About half a cup", 1.5])
const GREENS = food("greens", "Mixed greens and tomatoes", "About 2 cups", { calories: 30, protein: 2, fiber: 3, addedSugar: 0, sodium: 35, satFat: 0, calcium: 60 }, ["About 1 cup", 0.5], ["About 3 cups", 1.5])
/** The photo of her lunch: about 405 kcal before any dressing (C.22). */
export const PHOTO: Reading = {
  how: "photo",
  title: "Chicken, quinoa and black bean bowl",
  foods: [CHICKEN, QUINOA, BEANS, GREENS],
  fat: {
    question: "Was there dressing or oil? About how much?",
    name: "Dressing",
    per: { calories: 120, protein: 0, fiber: 0, addedSugar: 2, sodium: 140, satFat: 1.5, calcium: 0 },
    unsure: "Dressing not known. Totals may be 60 to 120 kcal higher.",
  },
}

/** Nutrients times a share, to one decimal; unknown ones stay unknown. */
export function scaled(n: Nutrients, factor: number): Nutrients {
  const out: Nutrients = {}
  for (const [id, v] of Object.entries(n) as [keyof Nutrients, number | undefined][]) if (v !== undefined) out[id] = Math.round(v * factor * 10) / 10
  return out
}
