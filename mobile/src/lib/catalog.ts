import { addDays } from "@/lib/member"

/* The Care tab's catalog (client deck "Patient Journey_14", screens 52 to
   54, stage 07 "Catalog and ordering"): everything Inlay can order for a
   patient, priced. Nine categories drawn from the vetted partner
   directory, each naming the national partner behind it and the price it
   starts at; every category opens the list of its items, each ordered on
   its own from its page. An item has what it does, what it
   cannot tell you, who writes the order, and one button that orders and
   pays; a test or scan then goes straight to a time.

   Cash prices, nothing billed to insurance; every clinical item needs the
   patient's own physician's order (screen 52's footnote). The multi-cancer
   screening is the client's own copy (screen 53). Every other item's words
   are sample copy for clinical review, in the same plain voice. */

export type Hue = "teal" | "blue" | "amber" | "green" | "red" | "violet" | "neutral"

export type Category = {
  id: string
  title: string
  /** The line under the title: what is in it and who is behind it. */
  meta: string
  /** The price it starts at; `exact` when there is one price ("Sleep"). */
  price: number
  exact?: boolean
  hue: Hue
  /** What one item in it is called, and many: the list's heading and count. */
  noun: readonly [string, string]
}

/** Screen 52's nine categories, in the client's order. */
export const CATEGORIES: readonly Category[] = [
  { id: "lab", title: "Laboratory", meta: "12 panels · Quest, Labcorp, Boston Heart", price: 39, hue: "teal", noun: ["panel", "panels"] },
  { id: "body", title: "Body composition & metabolism", meta: "DEXA, RMR, VO₂ max · Fitnescity", price: 129, hue: "red", noun: ["test", "tests"] },
  { id: "imaging", title: "Imaging", meta: "MRI, CT, whole-body · SimonMed, RAYUS", price: 99, hue: "teal", noun: ["scan", "scans"] },
  { id: "cancer", title: "Cancer screening", meta: "Galleri, Shield, hereditary · GRAIL, Guardant", price: 249, hue: "red", noun: ["test", "tests"] },
  { id: "brain", title: "Brain health", meta: "AD-Detect, ApoE, ATN · Quest, Labcorp", price: 149, hue: "amber", noun: ["test", "tests"] },
  { id: "sleep", title: "Sleep", meta: "Two-night home study · Lofta", price: 299, exact: true, hue: "amber", noun: ["study", "studies"] },
  { id: "devices", title: "Devices & wearables", meta: "CGM, ring, cuff, scale · Dexcom, Oura", price: 79, hue: "teal", noun: ["device", "devices"] },
  { id: "programmes", title: "Programmes", meta: "SMART, nutrition, movement · Benson–Henry", price: 100, hue: "green", noun: ["programme", "programmes"] },
  { id: "home", title: "Home & care products", meta: "Supplies, meals, transport · Medline", price: 19, hue: "blue", noun: ["product", "products"] },
]

/** A test or scan is booked at a site; a device, a programme or supplies
    are shipped or started, so they have no time to pick. */
export type Fulfil = "visit" | "ship"

export type Item = {
  id: string
  category: string
  name: string
  /** The small badge beside the name: "Screening". */
  tag: string
  /** Who is behind it and how long it takes, one or two sentences. */
  intro: string
  /** What the price card says under the price. */
  priceNote: string
  member: number
  /** The standard price, struck through, when the member price saves. */
  standard?: number
  /** The card's right side: "RESULTS 2–3 wks". */
  when: { label: string; value: string }
  /** `**bold**` marks the words to weigh. */
  does: readonly string[]
  cannot: readonly string[]
  /** What Inlay does after the physician signs: "connects you to GRAIL,
      schedules the draw and carries the result back". */
  inlay: string
  fulfil: Fulfil
  /** A test or scan: the partner whose sites are listed, the word for the
      visit ("draw", "scan"), and what to know about it. */
  site?: string
  visit?: { noun: string; about: string; bring: string }
}

export const ITEMS: readonly Item[] = [
  {
    id: "blood-panel",
    category: "lab",
    name: "Comprehensive blood panel",
    tag: "Laboratory",
    intro: "Quest Diagnostics. One blood draw, results in a few days.",
    priceNote: "Member price · drawn at any Quest site",
    member: 89,
    when: { label: "Results", value: "1–3 days" },
    does: [
      "Measures **blood sugar, cholesterol, and kidney and liver markers** in one draw.",
      "The result lands in your longitudinal record and is read beside everything else, not in isolation.",
    ],
    cannot: [
      "**It is not a diagnosis.** A value outside its range is a reason to look closer, not an answer.",
      "**It shows one day.** Food, sleep and illness can move a single result.",
    ],
    inlay: "connects you to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Fasting, if needed, is on your physician's order." },
  },
  {
    id: "lipid-advanced",
    category: "lab",
    name: "Advanced lipid panel",
    tag: "Laboratory",
    intro: "Boston Heart. LDL particles, ApoB and Lp(a) in one draw.",
    priceNote: "Member price · drawn at any Quest site",
    member: 129,
    when: { label: "Results", value: "2–4 days" },
    does: [
      "Counts **ApoB, LDL particles and Lp(a)**, which say more about heart risk than LDL alone.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**Lp(a) is mostly inherited.** One result is usually enough for life.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "a1c",
    category: "lab",
    name: "HbA1c and fasting insulin",
    tag: "Laboratory",
    intro: "Quest Diagnostics. Your average blood sugar over three months.",
    priceNote: "Member price · drawn at any Quest site",
    member: 49,
    when: { label: "Results", value: "1–2 days" },
    does: [
      "Shows your **average blood sugar over three months** and how hard insulin is working.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**It does not show daily swings.** A glucose monitor does that.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Fasting for eight hours." },
  },
  {
    id: "thyroid",
    category: "lab",
    name: "Thyroid panel",
    tag: "Laboratory",
    intro: "Quest Diagnostics. TSH, free T4, free T3 and antibodies.",
    priceNote: "Member price · drawn at any Quest site",
    member: 79,
    when: { label: "Results", value: "1–3 days" },
    does: [
      "Checks **how your thyroid is working** and whether antibodies are present.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**Results move with illness and some supplements.** Biotin can skew it.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "vitamin-d",
    category: "lab",
    name: "Vitamin D",
    tag: "Laboratory",
    intro: "Quest Diagnostics. One marker, one draw.",
    priceNote: "Member price · drawn at any Quest site",
    member: 39,
    when: { label: "Results", value: "1–2 days" },
    does: [
      "Measures your **vitamin D level**, which affects bone, muscle and mood.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**It changes with the seasons.** Compare readings from the same time of year.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "hormones",
    category: "lab",
    name: "Hormone panel",
    tag: "Laboratory",
    intro: "Labcorp. Testosterone, estradiol, SHBG, DHEA-S and cortisol.",
    priceNote: "Member price · drawn at any Quest site",
    member: 149,
    when: { label: "Results", value: "2–4 days" },
    does: [
      "Measures the **sex and stress hormones** behind energy, sleep and body composition.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**Levels change through the day.** A morning draw is best.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "A morning draw, before 10 am." },
  },
  {
    id: "inflammation",
    category: "lab",
    name: "Inflammation panel",
    tag: "Laboratory",
    intro: "Quest Diagnostics. hs-CRP and homocysteine.",
    priceNote: "Member price · drawn at any Quest site",
    member: 59,
    when: { label: "Results", value: "1–3 days" },
    does: [
      "Measures **low grade inflammation** linked to heart and metabolic health.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**A cold or a hard workout can raise it** for a few days.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "iron",
    category: "lab",
    name: "Iron and ferritin",
    tag: "Laboratory",
    intro: "Quest Diagnostics. Iron, ferritin, TIBC and saturation.",
    priceNote: "Member price · drawn at any Quest site",
    member: 45,
    when: { label: "Results", value: "1–2 days" },
    does: [
      "Shows whether your **iron stores** are low, normal or high.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**Ferritin rises with inflammation**, so it can look normal when stores are low.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "kidney",
    category: "lab",
    name: "Kidney function",
    tag: "Laboratory",
    intro: "Labcorp. Cystatin C, creatinine and urine albumin.",
    priceNote: "Member price · drawn at any Quest site",
    member: 69,
    when: { label: "Results", value: "1–3 days" },
    does: [
      "Measures **how well your kidneys filter**, with a marker that muscle mass does not skew.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**One reading is a snapshot.** Kidney function is judged over months.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "liver",
    category: "lab",
    name: "Liver panel",
    tag: "Laboratory",
    intro: "Quest Diagnostics. ALT, AST, GGT, bilirubin and albumin.",
    priceNote: "Member price · drawn at any Quest site",
    member: 39,
    when: { label: "Results", value: "1–2 days" },
    does: [
      "Checks **liver enzymes and function**, which alcohol, weight and medicines can move.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**It does not show liver fat directly.** An ultrasound does that.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "omega-3",
    category: "lab",
    name: "Omega-3 index",
    tag: "Laboratory",
    intro: "Boston Heart. The share of omega-3 in your red cells.",
    priceNote: "Member price · drawn at any Quest site",
    member: 89,
    when: { label: "Results", value: "1–2 wks" },
    does: [
      "Shows how much **omega-3** your diet actually delivers.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**It reflects the last few months**, not what you ate this week.",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "micronutrients",
    category: "lab",
    name: "Micronutrient panel",
    tag: "Laboratory",
    intro: "Labcorp. B12, folate, magnesium and zinc.",
    priceNote: "Member price · drawn at any Quest site",
    member: 99,
    when: { label: "Results", value: "2–4 days" },
    does: [
      "Checks the **vitamins and minerals** most often low in adults.",
      "The result lands in your longitudinal record and is read beside everything else.",
    ],
    cannot: [
      "**It is not a diagnosis.** Your physician reads it with your history.",
      "**Blood levels do not always match what is in your tissues.**",
    ],
    inlay: "sends the order to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "dexa",
    category: "body",
    name: "DEXA body composition scan",
    tag: "Body composition",
    intro: "Fitnescity. One scan, results the same day.",
    priceNote: "Member price · done at any Fitnescity site",
    member: 129,
    when: { label: "Results", value: "Same day" },
    does: [
      "Measures **body fat, lean mass and bone density** in one short scan.",
      "Shows where fat sits, so progress is more than the number on a scale.",
    ],
    cannot: [
      "**It does not diagnose bone disease** on its own. Your physician reads it with your history.",
      "**Small changes between scans can be noise.** Compare scans a few months apart.",
    ],
    inlay: "connects you to Fitnescity, schedules the scan and carries the result back",
    fulfil: "visit",
    site: "Fitnescity",
    visit: { noun: "scan", about: "One visit, about fifteen minutes.", bring: "Wear clothes without metal." },
  },
  {
    id: "whole-body-mri",
    category: "imaging",
    name: "Whole-body MRI",
    tag: "Imaging",
    intro: "SimonMed. One scan with no radiation, read by a radiologist.",
    priceNote: "Member price · done at any SimonMed site",
    member: 699,
    when: { label: "Results", value: "1–2 wks" },
    does: [
      "Looks at **organs and soft tissue** from head to pelvis without radiation.",
      "A radiologist reads it and your physician goes through it with you.",
    ],
    cannot: [
      "**It does not rule disease out.** A clear scan is not a clean bill of health.",
      "**Findings are common and most are harmless**, but some need follow-up tests.",
    ],
    inlay: "connects you to SimonMed, schedules the scan and carries the result back",
    fulfil: "visit",
    site: "SimonMed",
    visit: { noun: "scan", about: "One visit, about an hour.", bring: "Nothing metal on you." },
  },
  {
    id: "multi-cancer",
    category: "cancer",
    name: "Multi-cancer blood screening",
    tag: "Screening",
    intro: "Galleri, by GRAIL. One blood draw, results in two to three weeks.",
    priceNote: "Member price · drawn at any Quest site",
    member: 854,
    standard: 949,
    when: { label: "Results", value: "2–3 wks" },
    does: [
      "Looks for a DNA signal shed by tumours, shared by **more than fifty cancers** — many of which have no routine screening test at all.",
      "When a signal is found, the report **predicts where it came from**, so your physician knows which follow-up to order first.",
      "The result lands in your longitudinal record and is read beside everything else, not in isolation.",
    ],
    cannot: [
      "**It does not rule cancer out.** A negative result is not a clean bill of health, and it never will be.",
      "**A positive signal is not a diagnosis.** It is a reason to investigate, and some signals turn out to be nothing.",
      "It **does not replace** mammography, colonoscopy or any screening your physician already recommends.",
    ],
    inlay: "connects you to GRAIL, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes, no fasting.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "ad-detect",
    category: "brain",
    name: "Alzheimer’s blood biomarker",
    tag: "Brain health",
    intro: "Quest AD-Detect. One blood draw, results in one to two weeks.",
    priceNote: "Member price · drawn at any Quest site",
    member: 199,
    when: { label: "Results", value: "1–2 wks" },
    does: [
      "Looks for **blood markers linked to Alzheimer's disease** years before memory changes show.",
      "Gives your physician a baseline to track over time.",
    ],
    cannot: [
      "**It does not diagnose dementia.** It is one input for your physician, not a verdict.",
      "**A normal result does not mean you are protected** in the years ahead.",
    ],
    inlay: "connects you to Quest, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes, no fasting.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "sleep-study",
    category: "sleep",
    name: "Two-night home sleep study",
    tag: "Sleep",
    intro: "Lofta. A small kit you wear in your own bed, results in about a week.",
    priceNote: "Member price · sent to your door",
    member: 299,
    when: { label: "Results", value: "About 1 wk" },
    does: [
      "Records **breathing, oxygen and sleep stages** across two nights at home.",
      "Comes with simple set-up steps, so there is nothing to book.",
    ],
    cannot: [
      "**It does not replace an overnight lab study** if your physician wants one.",
      "**Two nights are a snapshot.** One unusual night can skew the picture.",
    ],
    inlay: "connects you to Lofta, sends the kit and carries the result back",
    fulfil: "ship",
  },
  {
    id: "cgm",
    category: "devices",
    name: "Continuous glucose monitor",
    tag: "Devices",
    intro: "Dexcom. A small sensor on your arm that reads glucose day and night.",
    priceNote: "Member price · sent to your door",
    member: 99,
    when: { label: "Arrives", value: "3–5 days" },
    does: [
      "Reads **glucose around the clock**, with no finger sticks.",
      "Shows how meals, sleep and movement move your glucose, beside the rest of your record.",
    ],
    cannot: [
      "**It does not diagnose diabetes.** Your physician does that with a blood test.",
      "**Readings can lag the blood by several minutes.**",
    ],
    inlay: "connects you to Dexcom, sends the sensor and brings the readings into your record",
    fulfil: "ship",
  },
  {
    id: "smart",
    category: "programmes",
    name: "SMART mind–body programme",
    tag: "Programme",
    intro: "Benson–Henry. Short guided sessions you do on your own time.",
    priceNote: "Member price · starts in the app",
    member: 100,
    when: { label: "Starts", value: "This week" },
    does: [
      "Teaches **stress, sleep and movement skills** in short guided sessions.",
      "Your progress shows up beside the rest of your health data.",
    ],
    cannot: [
      "**It is not treatment** for a medical condition.",
      "**It works through practice.** What you get depends on showing up.",
    ],
    inlay: "connects you to Benson–Henry and starts the programme in the app",
    fulfil: "ship",
  },
  {
    id: "home-care",
    category: "home",
    name: "Home and care supplies",
    tag: "Home & care",
    intro: "Medline. Everyday supplies, meals and transport, sent to you.",
    priceNote: "Member price · sent to your door",
    member: 19,
    when: { label: "Arrives", value: "2–4 days" },
    does: [
      "Brings **everyday care supplies, meals and transport** from one vetted partner.",
      "Order what you need, when you need it, with no calls.",
    ],
    cannot: [
      "**It is not medical advice.** Ask your physician what suits you.",
      "**Stock and delivery times vary** by item and address.",
    ],
    inlay: "connects you to Medline and sends your order",
    fulfil: "ship",
  },
  {
    id: "rmr",
    category: "body",
    name: "Resting metabolic rate test",
    tag: "Metabolism",
    intro: "Fitnescity. Ten minutes of quiet breathing, results the same day.",
    priceNote: "Member price · done at any Fitnescity site",
    member: 149,
    when: { label: "Results", value: "Same day" },
    does: [
      "Measures **how many calories you burn at rest** from the air you breathe out.",
      "Gives your eating plan a number that is yours, not an estimate from a formula.",
    ],
    cannot: [
      "**It does not count what you burn moving.** Activity adds to it.",
      "**Food, caffeine and poor sleep can skew it.** Come rested and fasted.",
    ],
    inlay: "connects you to Fitnescity, schedules the test and carries the result back",
    fulfil: "visit",
    site: "Fitnescity",
    visit: { noun: "test", about: "One visit, about thirty minutes.", bring: "Come fasted, with no caffeine that morning." },
  },
  {
    id: "vo2-max",
    category: "body",
    name: "VO₂ max test",
    tag: "Fitness",
    intro: "Fitnescity. A short graded run or ride with a mask, results the same day.",
    priceNote: "Member price · done at any Fitnescity site",
    member: 199,
    when: { label: "Results", value: "Same day" },
    does: [
      "Measures **how much oxygen your body can use** at its hardest effort.",
      "One of the strongest single markers of fitness, and a number to train against.",
    ],
    cannot: [
      "**It is not a heart check.** Your physician decides if you need one first.",
      "**One test is one day.** Retest after a few months of training.",
    ],
    inlay: "connects you to Fitnescity, schedules the test and carries the result back",
    fulfil: "visit",
    site: "Fitnescity",
    visit: { noun: "test", about: "One visit, about forty five minutes.", bring: "Wear clothes and shoes you can run in." },
  },
  {
    id: "calcium-ct",
    category: "imaging",
    name: "Coronary calcium CT",
    tag: "Imaging",
    intro: "RAYUS. A ten minute scan of the heart, results in a few days.",
    priceNote: "Member price · done at any RAYUS site",
    member: 99,
    when: { label: "Results", value: "2–3 days" },
    does: [
      "Counts **calcium in the heart's arteries**, a sign of plaque built up over years.",
      "Helps your physician weigh heart risk beside your lipid results.",
    ],
    cannot: [
      "**It does not see soft plaque** that has not yet hardened.",
      "**It uses a small dose of radiation**, so it is not repeated often.",
    ],
    inlay: "connects you to RAYUS, schedules the scan and carries the result back",
    fulfil: "visit",
    site: "RAYUS",
    visit: { noun: "scan", about: "One visit, about fifteen minutes.", bring: "No caffeine for four hours before." },
  },
  {
    id: "brain-mri",
    category: "imaging",
    name: "Brain MRI",
    tag: "Imaging",
    intro: "SimonMed. One scan with no radiation, read by a radiologist.",
    priceNote: "Member price · done at any SimonMed site",
    member: 499,
    when: { label: "Results", value: "1 wk" },
    does: [
      "Looks at **the brain's structure and blood vessels** without radiation.",
      "Gives your physician a baseline to compare against later.",
    ],
    cannot: [
      "**It does not measure memory or thinking.** Those need other tests.",
      "**Small harmless findings are common** and may need a second look.",
    ],
    inlay: "connects you to SimonMed, schedules the scan and carries the result back",
    fulfil: "visit",
    site: "SimonMed",
    visit: { noun: "scan", about: "One visit, about forty minutes.", bring: "Nothing metal on you." },
  },
  {
    id: "shield",
    category: "cancer",
    name: "Colorectal cancer blood test",
    tag: "Screening",
    intro: "Shield, by Guardant. One blood draw, results in about two weeks.",
    priceNote: "Member price · drawn at any Quest site",
    member: 249,
    when: { label: "Results", value: "About 2 wks" },
    does: [
      "Looks for **signs of colorectal cancer in the blood**, with no prep and no stool sample.",
      "An option for people who keep putting off a colonoscopy.",
    ],
    cannot: [
      "**It does not replace a colonoscopy.** A positive result leads to one.",
      "**It misses most precancerous polyps**, which a colonoscopy can remove.",
    ],
    inlay: "connects you to Guardant, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes, no fasting.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "hereditary",
    category: "cancer",
    name: "Hereditary cancer gene panel",
    tag: "Genetics",
    intro: "Quest Diagnostics. One blood draw, results in two to three weeks.",
    priceNote: "Member price · drawn at any Quest site",
    member: 299,
    when: { label: "Results", value: "2–3 wks" },
    does: [
      "Checks **genes linked to inherited cancer risk**, such as BRCA1 and BRCA2.",
      "Comes with a genetic counsellor to talk the result through.",
    ],
    cannot: [
      "**It does not tell you if you have cancer.** It tells you about inherited risk.",
      "**Most cancers are not inherited**, so a clear result does not mean low risk.",
    ],
    inlay: "connects you to Quest, schedules the draw and books your counsellor",
    fulfil: "visit",
    site: "Quest Diagnostics",
    visit: { noun: "draw", about: "One visit, about ten minutes, no fasting.", bring: "Quest has the order before you arrive." },
  },
  {
    id: "apoe",
    category: "brain",
    name: "ApoE genotype",
    tag: "Genetics",
    intro: "Labcorp. One blood draw, results in about a week.",
    priceNote: "Member price · drawn at any Labcorp site",
    member: 149,
    when: { label: "Results", value: "About 1 wk" },
    does: [
      "Shows **which ApoE gene variants you carry**, which shape Alzheimer's and heart risk.",
      "Helps your physician decide how closely to watch the years ahead.",
    ],
    cannot: [
      "**It does not predict who gets Alzheimer's.** Many carriers never do.",
      "**The result cannot change**, so think it through with your physician first.",
    ],
    inlay: "connects you to Labcorp, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Labcorp",
    visit: { noun: "draw", about: "One visit, about ten minutes, no fasting.", bring: "Labcorp has the order before you arrive." },
  },
  {
    id: "atn",
    category: "brain",
    name: "ATN amyloid and tau panel",
    tag: "Brain health",
    intro: "Labcorp. One blood draw, results in one to two weeks.",
    priceNote: "Member price · drawn at any Labcorp site",
    member: 399,
    when: { label: "Results", value: "1–2 wks" },
    does: [
      "Measures **amyloid, tau and nerve damage markers** together in the blood.",
      "Gives a fuller picture than one marker, for a physician weighing memory concerns.",
    ],
    cannot: [
      "**It does not diagnose Alzheimer's.** It is read beside an exam and history.",
      "**It is newer testing**, so results are best tracked over time.",
    ],
    inlay: "connects you to Labcorp, schedules the draw and carries the result back",
    fulfil: "visit",
    site: "Labcorp",
    visit: { noun: "draw", about: "One visit, about ten minutes, no fasting.", bring: "Labcorp has the order before you arrive." },
  },
  {
    id: "oura",
    category: "devices",
    name: "Smart ring",
    tag: "Devices",
    intro: "Oura. A ring that tracks sleep, heart rate and activity.",
    priceNote: "Member price · sent to your door",
    member: 299,
    when: { label: "Arrives", value: "3–5 days" },
    does: [
      "Tracks **sleep, resting heart rate and heart rate variability** every night.",
      "Brings the readings into your record beside everything else.",
    ],
    cannot: [
      "**It is not a medical device.** It shows trends, not diagnoses.",
      "**Sleep stages are estimates**, not a sleep study.",
    ],
    inlay: "connects you to Oura, sends the ring and brings the readings into your record",
    fulfil: "ship",
  },
  {
    id: "bp-cuff",
    category: "devices",
    name: "Blood pressure cuff",
    tag: "Devices",
    intro: "Withings. An upper arm cuff that syncs each reading.",
    priceNote: "Member price · sent to your door",
    member: 79,
    when: { label: "Arrives", value: "3–5 days" },
    does: [
      "Takes **blood pressure at home**, where readings are often truer than in a clinic.",
      "Each reading lands in your record, so your physician sees the trend.",
    ],
    cannot: [
      "**One high reading is not a diagnosis.** Patterns matter.",
      "**Position and cuff fit change the number.** Follow the set-up steps.",
    ],
    inlay: "connects you to Withings, sends the cuff and brings the readings into your record",
    fulfil: "ship",
  },
  {
    id: "smart-scale",
    category: "devices",
    name: "Smart scale",
    tag: "Devices",
    intro: "Withings. Weight and body composition every morning.",
    priceNote: "Member price · sent to your door",
    member: 99,
    when: { label: "Arrives", value: "3–5 days" },
    does: [
      "Logs **weight and body fat** each time you step on.",
      "Sends each weigh-in to your record, so there is nothing to type.",
    ],
    cannot: [
      "**Body fat at home is an estimate.** A DEXA scan is far more exact.",
      "**Weight moves day to day** with water and food. Watch the trend.",
    ],
    inlay: "connects you to Withings, sends the scale and brings the readings into your record",
    fulfil: "ship",
  },
  {
    id: "nutrition",
    category: "programmes",
    name: "Nutrition coaching",
    tag: "Programme",
    intro: "A registered dietitian, four video sessions over two months.",
    priceNote: "Member price · starts in the app",
    member: 150,
    when: { label: "Starts", value: "This week" },
    does: [
      "Builds **eating habits around your results**, not a generic diet.",
      "Your dietitian sees your record and checks in between sessions.",
    ],
    cannot: [
      "**It is not a meal plan.** It teaches choices you make yourself.",
      "**Change takes weeks**, not one session.",
    ],
    inlay: "matches you with a dietitian and books your first session",
    fulfil: "ship",
  },
  {
    id: "movement",
    category: "programmes",
    name: "Movement programme",
    tag: "Programme",
    intro: "Short guided workouts, built up week by week.",
    priceNote: "Member price · starts in the app",
    member: 120,
    when: { label: "Starts", value: "This week" },
    does: [
      "Builds **strength and stamina** with short sessions at home or the gym.",
      "Steps up as you get stronger, logged beside the rest of your data.",
    ],
    cannot: [
      "**It is not physical therapy** for an injury.",
      "**It works through practice.** What you get depends on showing up.",
    ],
    inlay: "starts the programme in the app",
    fulfil: "ship",
  },
  {
    id: "meals",
    category: "home",
    name: "Prepared meals",
    tag: "Home & care",
    intro: "Medline. A week of balanced meals, sent to your door.",
    priceNote: "Member price · sent to your door",
    member: 59,
    when: { label: "Arrives", value: "2–4 days" },
    does: [
      "Sends **ready meals** for the days cooking is hard.",
      "Choose from plain options with the nutrition on every label.",
    ],
    cannot: [
      "**It is not medical nutrition.** Ask your physician about special diets.",
      "**Menus vary** by week and address.",
    ],
    inlay: "connects you to Medline and sends your order",
    fulfil: "ship",
  },
  {
    id: "transport",
    category: "home",
    name: "Ride to an appointment",
    tag: "Home & care",
    intro: "Medline. A booked ride there and back.",
    priceNote: "Member price · each round trip",
    member: 25,
    when: { label: "Booked", value: "Within 1 day" },
    does: [
      "Books **a ride to and from** a test, scan or visit.",
      "The driver has the address and time, so there is nothing to arrange.",
    ],
    cannot: [
      "**It is not an ambulance.** For an emergency, call 911.",
      "**Rides need a day's notice** in most areas.",
    ],
    inlay: "connects you to Medline and books your ride",
    fulfil: "ship",
  },
]

export const item = (id: string) => ITEMS.find((i) => i.id === id)

/** Every item in a category, in catalog order: the list a category opens. */
export const itemsIn = (category: string) => ITEMS.filter((i) => i.category === category)

/** "$854" */
export const money = (n: number) => `$${n.toLocaleString("en-US")}`

/** "Multi-cancer blood screening" as "Multi-cancer blood screening"; the
    page title over an item: its category. */
export const categoryOf = (it: Item) => CATEGORIES.find((c) => c.id === it.category)

/** Matches a search: the category's words and its item's. */
export function matches(c: Category, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [c.title, c.meta, ...itemsIn(c.id).flatMap((it) => [it.name, it.intro])].some((s) => s?.toLowerCase().includes(q))
}

/* ------------------------------------------------------------- booking -- */

/** Where a test or scan can be done: the three nearest sites of its
    partner, as the deck draws them (screen 54, sample addresses). `soonest`
    is the days until its next opening. */
export type Site = { id: string; town: string; address: string; miles: number; soonest: number }

export const SITES: readonly Site[] = [
  { id: "clarkston", town: "Clarkston", address: "6880 Dixie Hwy", miles: 2.1, soonest: 1 },
  { id: "waterford", town: "Waterford", address: "5885 Highland Rd", miles: 4.8, soonest: 2 },
  { id: "auburn-hills", town: "Auburn Hills", address: "3100 Walton Blvd", miles: 9.3, soonest: 0 },
]

/** The times a site offers each morning. */
export const SLOTS = ["7:00", "7:30", "8:00", "8:15", "9:00", "9:45", "10:30", "11:15"] as const

/** Times already taken, by day: they stay on the grid, shown as gone. */
const GONE: readonly (readonly string[])[] = [["7:00", "7:30", "8:00"], ["7:00", "7:30"], [], ["9:45"]]

export const goneOn = (day: number, time: string) => GONE[day % GONE.length].includes(time)

/** A day counted from today, moved off a Sunday, when the sites are
    closed. */
export function openDay(days: number, now: Date = new Date()) {
  const day = addDays(now, days)
  return day.getDay() === 0 ? addDays(day, 1) : day
}

/** The four days offered from a site's first opening, Sundays skipped. */
export function bookingDays(site: Site, now: Date = new Date()): Date[] {
  const days: Date[] = [openDay(site.soonest, now)]
  while (days.length < 4) {
    const next = addDays(days[days.length - 1], 1)
    days.push(next.getDay() === 0 ? addDays(next, 1) : next)
  }
  return days
}

/** "Today", "Tomorrow", or the weekday. */
export function nextWord(site: Site, now: Date = new Date()) {
  const day = openDay(site.soonest, now)
  const diff = Math.round((new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
  return diff <= 0 ? "Today" : diff === 1 ? "Tomorrow" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.getDay()]
}

/** The first time still open on a day, or none. */
export const firstOpen = (day: number) => SLOTS.find((t) => !goneOn(day, t))

/** A day and a "8:15" as a date. */
export function atSlot(day: Date, time: string) {
  const [h, m] = time.split(":").map(Number)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
}
