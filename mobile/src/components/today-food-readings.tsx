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
const WRAP = food("wrap", "Turkey wrap", "1 wrap", { calories: 360, protein: 26, fiber: 4, addedSugar: 2, sodium: 900, satFat: 3, calcium: 110 }, ["Half a wrap", 0.5], ["1 large wrap", 1.3], "medium")
const APPLE = food("apple", "Apple", "1 medium", { calories: 95, protein: 1, fiber: 4, addedSugar: 0, sodium: 2, satFat: 0, calcium: 11 }, ["Half an apple", 0.5], ["1 large", 1.25])

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

/** What she said: "I had a turkey wrap and an apple". */
export const VOICE: Reading = {
  how: "voice",
  transcript: "I had a turkey wrap and an apple",
  title: "Turkey wrap and an apple",
  foods: [WRAP, APPLE],
  fat: {
    question: "Was there mayo or a spread in the wrap? About how much?",
    name: "Mayo or spread",
    per: { calories: 90, protein: 0, fiber: 0, addedSugar: 0, sodium: 90, satFat: 1.5, calcium: 0 },
    unsure: "Spread not known. Totals may be 50 to 100 kcal higher.",
  },
}

/* The foods the prototype knows by name when she types, longest words
   first so "turkey wrap" is one food, not two. */
const KNOWN: { words: string[]; food: DraftFood }[] = [
  { words: ["turkey wrap", "wrap"], food: WRAP },
  { words: ["turkey sandwich", "sandwich"], food: food("sandwich", "Turkey sandwich", "1 sandwich", { calories: 380, protein: 22, fiber: 4, addedSugar: 4, sodium: 1050, satFat: 2.5, calcium: 90 }, ["Half a sandwich", 0.5], ["1 large sandwich", 1.3], "medium") },
  { words: ["chicken"], food: CHICKEN },
  { words: ["salmon"], food: food("salmon", "Salmon", "About 5 oz", { calories: 290, protein: 30, fiber: 0, addedSugar: 0, sodium: 90, satFat: 2.5, calcium: 15 }, ["About 3 oz", 0.6], ["About 7 oz", 1.4]) },
  { words: ["eggs", "egg"], food: food("eggs", "Eggs", "2 eggs", { calories: 155, protein: 13, fiber: 0, addedSugar: 0, sodium: 140, satFat: 3.3, calcium: 56 }, ["1 egg", 0.5], ["3 eggs", 1.5]) },
  { words: ["greek yogurt", "yogurt", "yoghurt"], food: food("yogurt", "Greek yogurt", "1 cup", { calories: 150, protein: 20, fiber: 0, addedSugar: 0, sodium: 70, satFat: 0.5, calcium: 230 }, ["Half a cup", 0.5], ["1 and a half cups", 1.5]) },
  { words: ["oatmeal", "oats", "porridge"], food: food("oats", "Oatmeal", "1 cup cooked", { calories: 160, protein: 6, fiber: 4, addedSugar: 0, sodium: 115, satFat: 0.6, calcium: 20 }, ["Half a cup", 0.5], ["1 and a half cups", 1.5]) },
  { words: ["toast", "bread"], food: food("toast", "Whole grain toast", "1 slice", { calories: 80, protein: 4, fiber: 2, addedSugar: 1, sodium: 130, satFat: 0.3, calcium: 30 }, ["Half a slice", 0.5], ["2 slices", 2]) },
  { words: ["quinoa"], food: QUINOA },
  { words: ["black beans", "beans", "lentils"], food: BEANS },
  { words: ["rice"], food: food("rice", "Rice", "About 1 cup", { calories: 205, protein: 4, fiber: 1, addedSugar: 0, sodium: 2, satFat: 0.1, calcium: 16 }, ["About half a cup", 0.5], ["About 1 and a half cups", 1.5]) },
  { words: ["salad", "greens"], food: GREENS },
  { words: ["avocado"], food: food("avocado", "Avocado", "A quarter", { calories: 60, protein: 1, fiber: 3, addedSugar: 0, sodium: 3, satFat: 0.8, calcium: 5 }, ["A thin slice", 0.5], ["Half an avocado", 2]) },
  { words: ["apple"], food: APPLE },
  { words: ["banana"], food: food("banana", "Banana", "1 medium", { calories: 105, protein: 1, fiber: 3, addedSugar: 0, sodium: 1, satFat: 0.1, calcium: 6 }, ["Half a banana", 0.5], ["1 large", 1.25]) },
  { words: ["berries", "strawberries", "raspberries", "blueberries"], food: food("berries", "Berries", "Half a cup", { calories: 35, protein: 1, fiber: 3, addedSugar: 0, sodium: 1, satFat: 0, calcium: 12 }, ["A quarter cup", 0.5], ["1 cup", 2]) },
  { words: ["hummus"], food: food("hummus", "Hummus", "3 tablespoons", { calories: 105, protein: 3, fiber: 3, addedSugar: 0, sodium: 240, satFat: 1, calcium: 18 }, ["2 tablespoons", 0.67], ["Half a cup", 2.67]) },
  { words: ["carrots", "carrot"], food: food("carrots", "Baby carrots", "8 carrots", { calories: 30, protein: 1, fiber: 2, addedSugar: 0, sodium: 60, satFat: 0, calcium: 26 }, ["4 carrots", 0.5], ["12 carrots", 1.5]) },
  { words: ["almonds", "nuts"], food: food("almonds", "Almonds", "A small handful", { calories: 160, protein: 6, fiber: 3, addedSugar: 0, sodium: 0, satFat: 1, calcium: 75 }, ["A few almonds", 0.5], ["A large handful", 1.5]) },
]

/** Typed meals: anything cooked may have taken some oil or butter. */
const COOKED: HiddenFat = {
  question: "Was anything cooked in oil or butter? About how much?",
  name: "Oil or butter",
  per: { calories: 120, protein: 0, fiber: 0, addedSugar: 0, sodium: 0, satFat: 2, calcium: 0 },
  unsure: "Oil or butter not known. Totals may be 40 to 120 kcal higher.",
}

const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** What she typed, read against the foods the prototype knows, in the
    order she wrote them. A meal it cannot place is kept as she wrote it,
    with its nutrients unknown. The hidden fats question fits the meal: a
    salad's dressing, a wrap's spread, or what anything was cooked in. */
export function readTyped(text: string): Reading {
  const said = text.trim().replace(/\.+$/, "")
  const title = said.charAt(0).toUpperCase() + said.slice(1)
  const lower = ` ${said.toLowerCase()} `
  let rest = lower
  const found: { at: number; food: DraftFood }[] = []
  for (const k of KNOWN) {
    const hit = k.words.find((w) => new RegExp(`\\b${escape(w)}\\b`).test(rest))
    if (!hit) continue
    const at = rest.search(new RegExp(`\\b${escape(hit)}\\b`))
    rest = rest.replace(new RegExp(`\\b${escape(hit)}\\b`, "g"), (w) => " ".repeat(w.length))
    if (!found.some((f) => f.food.key === k.food.key)) found.push({ at, food: k.food })
  }
  const foods = found.sort((a, b) => a.at - b.at).map((f) => f.food)
  if (!foods.length)
    foods.push({
      key: "typed",
      name: title,
      confidence: "low",
      nutrients: {},
      portions: { less: { words: "A small serving", factor: 0.6 }, right: { words: "1 serving", factor: 1 }, more: { words: "A large serving", factor: 1.5 } },
    })
  const fat = /\bsalad\b/.test(lower) ? PHOTO.fat : /\b(wrap|sandwich)\b/.test(lower) ? VOICE.fat : COOKED
  return { how: "typed", title, foods, fat, transcript: said }
}

/** A logged meal back as a reading, to change portions or remove a food.
    The hidden fats were answered when it was logged, so no question. */
export function readingOf(meal: Meal, title: string): Reading {
  return {
    how: meal.how,
    title,
    foods: meal.foods.map((f, i) => ({
      key: `${i}`,
      name: f.name,
      confidence: f.confidence,
      nutrients: f.nutrients,
      portions: { less: { words: "A smaller portion", factor: 0.75 }, right: { words: f.portion, factor: 1 }, more: { words: "A larger portion", factor: 1.25 } },
    })),
  }
}

/** Nutrients times a share, to one decimal; unknown ones stay unknown. */
export function scaled(n: Nutrients, factor: number): Nutrients {
  const out: Nutrients = {}
  for (const [id, v] of Object.entries(n) as [keyof Nutrients, number | undefined][]) if (v !== undefined) out[id] = Math.round(v * factor * 10) / 10
  return out
}
