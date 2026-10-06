import { BIOMARKERS, MEDICATIONS, PROBLEMS } from "@/lib/record"

/* The AI check on a supplement the patient adds (tell-us). It reads what
   she typed against her own record: the medicines she takes, her problems
   and her latest labs, and says when to talk to her doctor first. Rules
   stand in for the model in the prototype; each one only fires when her
   record gives it a reason, so a plain "Magnesium" stays quiet. The
   warning is soft: she can still add it, and her doctor checks it like
   anything else she tells us. */

export type SupplementWarning = {
  /** "Calcium", as the rule names it. */
  name: string
  /** "Talk to your doctor: calcium can affect your kidneys" */
  title: string
  /** Why, from her record. */
  why: string
}

type Facts = {
  takes: (id: string) => boolean
  has: (id: string) => boolean
  latest: (id: string) => number | undefined
}

type Rule = {
  name: string
  match: RegExp
  check: (r: Facts) => { title: string; why: string } | undefined
}

const talk = (what: string) => `Talk to your doctor: ${what}`

const RULES: Rule[] = [
  {
    name: "Calcium",
    match: /\bcalcium\b|\bcal[- ]?mag\b|\btums\b/i,
    check: (r) => {
      const egfr = r.latest("egfr")
      if (egfr !== undefined && egfr < 60)
        return { title: talk("calcium can affect your kidneys"), why: `Your last eGFR was ${egfr}, so your kidneys may clear extra calcium slowly.` }
      if (r.takes("vitamin-d"))
        return {
          title: talk("calcium can affect your kidneys"),
          why: "You already take Vitamin D3, which helps your body take in calcium. Together they can raise your calcium and the chance of kidney stones.",
        }
      return undefined
    },
  },
  {
    name: "Potassium",
    match: /\bpotassium\b|\bk[- ]?citrate\b|\bsalt substitute\b/i,
    check: (r) =>
      r.takes("lisinopril")
        ? { title: talk("potassium can build up with lisinopril"), why: "Lisinopril keeps potassium in your blood. Adding more can push it too high for your heart." }
        : undefined,
  },
  {
    name: "Red yeast rice",
    match: /\bred yeast\b/i,
    check: (r) =>
      r.takes("atorvastatin")
        ? { title: talk("red yeast rice works like your statin"), why: "It acts like atorvastatin, so taking both is like a double dose and can hurt your muscles and liver." }
        : undefined,
  },
  {
    name: "St. John's wort",
    match: /\bst\.? ?john'?s\b|\bhypericum\b/i,
    check: (r) =>
      r.takes("atorvastatin")
        ? { title: talk("St. John's wort can weaken atorvastatin"), why: "It makes your body clear atorvastatin faster, so your cholesterol may rise." }
        : undefined,
  },
  {
    name: "Niacin",
    match: /\bniacin\b|\bnicotinic\b|\bvitamin b3\b/i,
    check: (r) =>
      r.has("prediabetes")
        ? { title: talk("niacin can raise your blood sugar"), why: "You have prediabetes, and high doses of niacin can push your A1c up." }
        : undefined,
  },
  {
    name: "Licorice",
    match: /\blicorice\b|\bliquorice\b/i,
    check: (r) =>
      r.has("bp") || r.takes("lisinopril")
        ? { title: talk("licorice can raise your blood pressure"), why: "Your blood pressure is already raised, and licorice root can push it higher." }
        : undefined,
  },
  {
    name: "Ginkgo",
    match: /\bginkgo\b|\bgingko\b/i,
    check: (r) =>
      r.takes("fish-oil")
        ? { title: talk("ginkgo can make you bleed more easily"), why: "With the fish oil you take, ginkgo thins your blood further." }
        : undefined,
  },
  {
    name: "Vitamin E",
    match: /\bvitamin e\b/i,
    check: (r) =>
      r.takes("fish-oil")
        ? { title: talk("vitamin E can make you bleed more easily"), why: "With the fish oil you take, high doses of vitamin E thin your blood further." }
        : undefined,
  },
  {
    name: "Vitamin D",
    match: /\bvitamin d\d?\b|\bcholecalciferol\b|\bd3\b/i,
    check: (r) =>
      r.takes("vitamin-d")
        ? { title: talk("you may be doubling your vitamin D"), why: "You already take Vitamin D3, 2,000 IU a day. Too much can raise your calcium." }
        : undefined,
  },
]

/** Her record as the rules read it. */
const RECORD: Facts = {
  takes: (id) => MEDICATIONS.some((m) => m.id === id && !m.resolved),
  has: (id) => PROBLEMS.some((p) => p.id === id),
  latest: (id) => BIOMARKERS.find((b) => b.id === id)?.points.at(-1)?.value,
}

/** The first warning for what she typed, or nothing. */
export function checkSupplement(text: string, record: Facts = RECORD): SupplementWarning | undefined {
  const words = text.trim()
  if (words.length < 3) return undefined
  for (const rule of RULES) {
    if (!rule.match.test(words)) continue
    const hit = rule.check(record)
    if (hit) return { name: rule.name, ...hit }
  }
  return undefined
}
