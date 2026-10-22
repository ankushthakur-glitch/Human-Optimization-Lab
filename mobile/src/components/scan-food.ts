import type { Nutrients } from "@/lib/member"

import { scaled } from "@/components/today-food-readings"

/* Scan food: a packaged food found by its barcode, then how much she had.
   The way food apps do it (MyFitnessPal, Cronometer, Lose It!, Yazio):
   the label's own serving is the starting point, the amount can be given
   in servings, in grams or millilitres, or as part of the package, and
   the nutrients follow the amount live. Label values are exact, so the
   meal saves as checked, not estimated. A nutrient the label does not
   list stays unknown, never zero (M-17). The real build looks the code up
   in a product database; the prototype knows the few products below.
   Sample values for the sample patient. */

export type Unit = "serving" | "g" | "ml" | "package"

export type Product = {
  barcode: string
  name: string
  brand?: string
  /** What the serving is measured in: solids in grams, drinks in millilitres. */
  measure: "g" | "ml"
  /** The label's serving: "1 pot (170 g)". */
  serving: { amount: number; words: string }
  /** How many servings the package holds, when the label says. */
  perPackage?: number
  /** For one serving; a nutrient the label does not list is left out. */
  nutrients: Nutrients
  /** Typed in by her rather than found. */
  custom?: boolean
}

export const PRODUCTS: Product[] = [
  { barcode: "5000000000011", name: "Greek yogurt, plain", brand: "Fjord Farms", measure: "g", serving: { amount: 170, words: "1 pot (170 g)" }, perPackage: 1, nutrients: { calories: 100, protein: 17, fiber: 0, addedSugar: 0, sodium: 65, satFat: 0.5, calcium: 190 } },
  { barcode: "5000000000028", name: "Oat and honey granola", brand: "Hearth & Co", measure: "g", serving: { amount: 45, words: "1/2 cup (45 g)" }, perPackage: 8, nutrients: { calories: 190, protein: 5, fiber: 4, addedSugar: 6, sodium: 45, satFat: 1.5, calcium: 20 } },
  { barcode: "5000000000035", name: "Unsweetened almond milk", brand: "Orchard Lane", measure: "ml", serving: { amount: 240, words: "1 cup (240 ml)" }, perPackage: 4, nutrients: { calories: 30, protein: 1, fiber: 0, addedSugar: 0, sodium: 170, satFat: 0, calcium: 450 } },
  { barcode: "5000000000042", name: "Peanut butter bar", brand: "Trailhead", measure: "g", serving: { amount: 40, words: "1 bar (40 g)" }, perPackage: 1, nutrients: { calories: 200, protein: 8, fiber: 3, addedSugar: 7, sodium: 140, satFat: 3, calcium: 30 } },
  { barcode: "5000000000059", name: "Whole grain crackers", brand: "Hearth & Co", measure: "g", serving: { amount: 30, words: "6 crackers (30 g)" }, perPackage: 7, nutrients: { calories: 130, protein: 3, fiber: 3, addedSugar: 0, sodium: 190, satFat: 0.5, calcium: 20 } },
  { barcode: "5000000000066", name: "Orange juice", brand: "Sunvale", measure: "ml", serving: { amount: 240, words: "1 cup (240 ml)" }, perPackage: 6, nutrients: { calories: 110, protein: 2, fiber: 0, addedSugar: 0, sodium: 0, satFat: 0, calcium: 27 } },
]

/** The product the prototype's camera finds. */
export const SCANNED = PRODUCTS[0]

/** A barcode is 8 to 14 digits (UPC-A 12, EAN-13 13, EAN-8 8). */
export const isBarcode = (text: string) => /^\d{8,14}$/.test(text)

/** Looks a code up. The real build asks the product database; resolves
    undefined when nobody has it. */
export async function lookupBarcode(code: string): Promise<Product | undefined> {
  return PRODUCTS.find((p) => p.barcode === code)
}

/** Products whose name or brand has every word she typed. */
export function searchProducts(text: string): Product[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return PRODUCTS.filter((p) => words.every((w) => `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(w)))
}

/* ------------------------------------------------------------ amount -- */

/** The units this product can be counted in: its servings, grams or
    millilitres, and the package when the label gives its servings. */
export function unitsOf(p: Product): { value: Unit; label: string }[] {
  const units: { value: Unit; label: string }[] = [
    { value: "serving", label: "Serving" },
    { value: p.measure, label: p.measure },
  ]
  if (p.perPackage && p.perPackage > 1) units.push({ value: "package", label: "Package" })
  return units
}

/** What one tap of + or − adds: half a serving, ten grams or millilitres,
    a quarter of a package. */
export const stepOf = (unit: Unit) => (unit === "serving" ? 0.5 : unit === "package" ? 0.25 : 10)

/** Servings in an amount, the one number every nutrient is scaled by. */
export function servingsOf(p: Product, qty: number, unit: Unit): number {
  if (unit === "serving") return qty
  if (unit === "package") return qty * (p.perPackage ?? 1)
  return qty / p.serving.amount
}

/** An amount in a unit, from servings: the same food counted another way. */
export function amountIn(p: Product, servings: number, unit: Unit): number {
  const raw = unit === "serving" ? servings : unit === "package" ? servings / (p.perPackage ?? 1) : servings * p.serving.amount
  // Grams and millilitres to whole numbers, servings to a quarter, packages
  // to two decimals (one serving of eight is 0.13 of a package).
  return unit === "serving" ? Math.round(raw * 4) / 4 : unit === "package" ? Math.round(raw * 100) / 100 : Math.round(raw)
}

/** More than this many servings in one go is worth a second look. */
export const MANY = 10

/** Her typed amount: digits and one point, up to four digits. */
export const amountText = (text: string) => {
  const clean = text.replace(/[^\d.]/g, "")
  const [whole = "", ...rest] = clean.split(".")
  return (rest.length ? `${whole.slice(0, 4)}.${rest.join("").slice(0, 2)}` : whole.slice(0, 4))
}

export const nutrientsFor = (p: Product, servings: number): Nutrients => scaled(p.nutrients, servings)

/** "1.5 servings", "60 g", "Half a package": how the saved food names
    its amount, with the measure beside it. */
export function portionWords(p: Product, qty: number, unit: Unit): string {
  const servings = servingsOf(p, qty, unit)
  const n = (v: number) => String(Math.round(v * 100) / 100)
  const measure = `${n(servings * p.serving.amount)} ${p.measure}`
  if (unit === "serving") return `${n(qty)} ${qty === 1 ? "serving" : "servings"} (${measure})`
  if (unit === "package") return `${n(qty)} ${qty === 1 ? "package" : "packages"} (${measure})`
  return `${n(qty)} ${unit} (${n(servings)} ${servings === 1 ? "serving" : "servings"})`
}
