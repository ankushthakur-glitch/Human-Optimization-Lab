// Builds the register the "Design Deliverables" Google Sheet reads: one CSV
// per portal tab, written to public/deliverables/. The sheet loads them from
// production with IMPORTDATA, so every push that deploys updates its links.
// Runs as `prebuild`.
//
//   node scripts/gen-deliverables.mjs          write the CSVs
//   node scripts/gen-deliverables.mjs --log    also add today's entry to
//                                              DELIVERABLES-CHANGELOG.md (the
//                                              7:30 PM GitHub Action runs this)
//
// Name a page by adding it to PAGES. A page that isn't listed still lands in
// the sheet, filed by its path and named from its metadata title, so nothing
// goes missing between deploys.

import { execSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const APP = join(ROOT, "src/app")
const OUT = join(ROOT, "public/deliverables")
const CHANGELOG = join(ROOT, "DELIVERABLES-CHANGELOG.md")
const TIME_ZONE = "Asia/Kolkata"

const BASE_URL = (
  process.env.DELIVERABLES_BASE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://human-optimization-lab.vercel.app")
).replace(/\/$/, "")

/** Sheet tab → CSV file, in tab order. */
const PORTALS = {
  "Global Pages": "global-pages",
  "Super Admin Portal": "super-admin-portal",
  "Clinic Manager Portal": "clinic-manager-portal",
  "Provider Portal": "provider-portal",
  "Patient Portal": "patient-portal",
}
const GLOBAL = "Global Pages"
const ADMIN = "Super Admin Portal"
const MANAGER = "Clinic Manager Portal"
const PROVIDER = "Provider Portal"
const PATIENT = "Patient Portal"
const AUTH = "Login and Authentication"

/** route → [portal, feature, sub feature, options]. `url` gives a dynamic
    route a link; `skip` leaves a route out (redirects, internals). */
const PAGES = {
  // The design system is one deliverable: its overview links to every page.
  "/": [GLOBAL, "Design System", "Design system"],

  // The sign-in screens without ?as= are the Super Admin's; the other portals
  // reach the same screens through ?as= (see AUTH_EXTRA).
  "/screens/login/invite-email": [ADMIN, AUTH, "Invitation email (desktop)"],
  "/screens/login/invite-email/mobile": [ADMIN, AUTH, "Invitation email (mobile)"],
  "/screens/login/activate": [ADMIN, AUTH, "Activate account"],
  "/screens/login/set-password": [ADMIN, AUTH, "Set password"],
  "/screens/login/two-factor-setup": [ADMIN, AUTH, "Two-factor setup"],
  "/screens/login": [ADMIN, AUTH, "Sign in"],
  "/screens/login/verify": [ADMIN, AUTH, "Two-factor verification"],
  "/screens/login/forgot-password": [ADMIN, AUTH, "Forgot password"],
  "/screens/login/reset-code": [ADMIN, AUTH, "Reset code sent"],
  "/screens/login/reset-password": [ADMIN, AUTH, "Reset password"],

  "/screens/handoff/illustrations": [GLOBAL, "Illustrations", "Handoff: usage and downloads"],

  "/screens/errors": [GLOBAL, "Error States (web)", "All error states"],
  "/screens/errors/permission-denied": [GLOBAL, "Error States (web)", "Permission denied"],
  "/screens/errors/offline": [GLOBAL, "Error States (web)", "No internet connection"],
  "/screens/session-expired": [GLOBAL, "Error States (web)", "Session expired"],

  "/screens/admin": [ADMIN, "", "", { skip: true }],
  "/screens/admin/practices": [ADMIN, "Practices", "Practice list"],
  "/screens/admin/practices/[id]": [ADMIN, "Practices", "Practice details", { url: "/screens/admin/practices/593892" }],
  "/screens/admin/practices/[id]/providers/[providerId]": [ADMIN, "Practices", "Provider adoption", { url: "/screens/admin/practices/593892/providers/PR4775" }],
  "/screens/admin/dashboard": [ADMIN, "Dashboard", "Dashboard (coming soon)"],
  "/screens/admin/settings": [ADMIN, "Settings", "Settings (coming soon)"],


  // The clinic manager's practice portal.
  "/screens/practice": [MANAGER, "", "", { skip: true }],
  "/screens/practice/providers": [MANAGER, "", "", { skip: true }],
  "/screens/practice/users": [MANAGER, "Users", "Users: providers tab (list, bulk import)"],
  "/screens/practice/users/providers/new": [MANAGER, "Users", "Add provider"],
  "/screens/practice/users/providers/[id]": [MANAGER, "Users", "Provider profile", { url: "/screens/practice/users/providers/PR3132" }],
  "/screens/practice/users/providers/[id]/edit": [MANAGER, "Users", "Edit provider", { url: "/screens/practice/users/providers/PR3132/edit" }],
  "/screens/practice/patients": [MANAGER, "Patients", "Patients (list, bulk import)"],
  "/screens/practice/patients/new": [MANAGER, "Patients", "Patient onboarding form"],
  "/screens/practice/patients/[id]": [MANAGER, "Patients", "Patient profile", { url: "/screens/practice/patients/P10240" }],
  "/screens/practice/patients/[id]/edit": [MANAGER, "Patients", "Edit patient", { url: "/screens/practice/patients/P10240/edit" }],
  "/screens/practice/patients/duplicates": [MANAGER, "Patients", "Possible duplicates queue"],
  "/screens/practice/patients/duplicates/[id]": [MANAGER, "Patients", "Review possible duplicate", { url: "/screens/practice/patients/duplicates/DR1001" }],
  "/screens/practice/locations": [MANAGER, "Locations", "Locations (list)"],
  "/screens/practice/locations/new": [MANAGER, "Locations", "Add location"],
  "/screens/practice/locations/[id]": [MANAGER, "Locations", "Location details", { url: "/screens/practice/locations/LOC1001" }],
  "/screens/practice/locations/[id]/edit": [MANAGER, "Locations", "Edit location", { url: "/screens/practice/locations/LOC1001/edit" }],
  // A provider's portal, reached from the provider invite.
  "/screens/patients/dashboard": [PROVIDER, "Dashboard", "Version 1: work queue (abnormal results)"],
  "/screens/patients": [PROVIDER, "Patients", "Patients (list, health record sync status, bulk import, send invites)"],
  "/screens/patients/new": [PROVIDER, "Patients", "Add patient and send invite"],
  "/screens/patients/[id]": [PROVIDER, "Patient Chart", "Dashboard: free member", { url: "/screens/patients/P10240" }],
  "/screens/patients/[id]/edit": [PROVIDER, "Patients", "Edit patient", { url: "/screens/patients/P10240/edit" }],
}

/** The shared sign-in screens as one portal's user sees them (?as=key). */
const authFor = (portal, key, subs) =>
  subs.map(([sub, url]) => [portal, AUTH, sub, `${url}?as=${key}`, -1])
const WEB_AUTH = [
  ["Invitation email (desktop)", "/screens/login/invite-email"],
  ["Invitation email (mobile)", "/screens/login/invite-email/mobile"],
  ["Activate account", "/screens/login/activate"],
  ["Set password", "/screens/login/set-password"],
  ["Two-factor setup", "/screens/login/two-factor-setup"],
  ["Sign in", "/screens/login"],
  ["Two-factor verification", "/screens/login/verify"],
  ["Forgot password", "/screens/login/forgot-password"],
  ["Reset code sent", "/screens/login/reset-code"],
  ["Reset password", "/screens/login/reset-password"],
]

/** Pages that aren't a page.tsx of their own: [portal, feature, sub, url,
    at?]. `at` -1 puts a row above the portal's listed pages; a route puts it
    just after that route's row. */
const EXTRA = [
  [GLOBAL, "Design System", "Illustration library", "/illustrations"],
  [GLOBAL, "Error States (web)", "Page not found", "/screens/page-not-found"],
  // The patient app's error states; errors/ is a review index that opens each one.
  [GLOBAL, "Error States (mobile app)", "All error states", "/app/errors", "/screens/session-expired"],
  [GLOBAL, "Error States (mobile app)", "Page not found", "/app/errors/this-page-does-not-exist", "/screens/session-expired"],
  [GLOBAL, "Error States (mobile app)", "Session expired", "/app/errors/session-expired", "/screens/session-expired"],
  [GLOBAL, "Error States (mobile app)", "No internet connection", "/app/errors/offline", "/screens/session-expired"],
  [GLOBAL, "Error States (mobile app)", "Something went wrong", "/app/errors/crash", "/screens/session-expired"],

  // The provider's patient chart: sections of /screens/patients/[id].
  // Dashboard is the chart's first section: the free member (P10240) or the
  // optimization member (P10318) view.
  [PROVIDER, "Patient Chart", "Dashboard: optimization member", "/screens/patients/P10318", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Overview: face sheet", "/screens/patients/P10240?section=overview", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Overview: timeline", "/screens/patients/P10240?section=overview&tab=timeline", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Encounters", "/screens/patients/P10240?section=encounters", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Diagnoses", "/screens/patients/P10240?section=diagnoses", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Medications: active", "/screens/patients/P10240?section=medications", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Medications: past", "/screens/patients/P10240?section=medications&tab=past", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Allergies", "/screens/patients/P10240?section=allergies", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Vitals: card view", "/screens/patients/P10240?section=vitals", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Vitals: table view", "/screens/patients/P10240?section=vitals&tab=table", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Lab results: reports", "/screens/patients/P10240?section=labs", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Lab results: biomarker trends", "/screens/patients/P10240?section=labs&tab=trends", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Imaging reports", "/screens/patients/P10240?section=imaging", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Vaccines", "/screens/patients/P10240?section=vaccines", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Documents", "/screens/patients/P10240?section=documents", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Profile", "/screens/patients/P10240?section=profile", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Before consent", "/screens/patients/P10257", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Record building (sync now)", "/screens/patients/P10750", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Sync failed (retry sync)", "/screens/patients/P10665", "/screens/patients/[id]"],

  ...authFor(MANAGER, "clinic-manager", WEB_AUTH),
  [MANAGER, "Users", "Users: non-clinical users tab (list, add, view, edit panels)", "/screens/practice/users?tab=staff"],

  ...authFor(PROVIDER, "provider", WEB_AUTH),
  ...[
    ["Version 1: medication changes", "medications"],
    ["Version 1: overdue orders", "orders"],
    ["Version 1: outside care", "outside-care"],
    ["Version 1: care gaps", "care-gaps"],
    ["Version 1: reviews due", "reviews"],
    ["Version 1: urgent", "urgent"],
    ["Version 1: all", "all"],
  ].map(([sub, tab]) => [PROVIDER, "Dashboard", sub, `/screens/patients/dashboard?tab=${tab}`, "/screens/patients/dashboard"]),
  [PROVIDER, "Dashboard", "Version 2: charting", "/screens/patients/dashboard?v=2", "/screens/patients/dashboard"],

  // A patient signs in on the mobile app; only the invitation is on the web.
  ...authFor(PATIENT, "patient", [
    ["Invitation email (desktop)", "/screens/login/invite-email"],
    ["Invitation email (mobile)", "/screens/login/invite-email/mobile"],
  ]),
  // The app's signed-out screens, served from public/app. Set password and
  // home sit behind the app's session, so they have no link of their own.
  [PATIENT, AUTH, "Activate account (mobile app)", "/app/activate", -1],
  [PATIENT, AUTH, "Sign in (mobile app)", "/app/sign-in", -1],
  [PATIENT, "Patient Onboarding", "Consent (mobile app)", "/app/demo/onboarding-consent"],
  [PATIENT, "Patient Onboarding", "Sign in after creating a password (mobile app)", "/app/demo/onboarding-signin"],
  [PATIENT, "Patient Onboarding", "Returning patient sign in (mobile app)", "/app/demo/returning"],
  ...patientApp(),
]

/** The patient app's signed-in screens. Each opens as a sample patient
    (mobile app/demo/[variant].tsx seeds the device), then lands on `to`. */
function patientApp() {
  const at = (seed, to, query = "") => `/app/demo/${seed}${to || query ? "?" : ""}${[to && `to=${to.includes("?") ? encodeURIComponent(to) : to}`, query].filter(Boolean).join("&")}`
  const HOME = "Mobile App: Home (free)"
  const RECORD = "Mobile App: Record"
  const TODO = "Mobile App: To Do"
  const AI = "Mobile App: Ask Inlay"
  const UPGRADE = "Mobile App: Upgrade and Plan Set Up"
  const MEMBER = "Mobile App: Optimization Member"
  const PROFILE = "Mobile App: Profile and Settings"
  return [
    [HOME, "Home", at("free")],
    [HOME, "Home: first session", at("free-first")],
    [HOME, "Home: Dr. Patel finished the review", at("free-checked")],
    [HOME, "Home: new results arrived", at("free-new-results")],
    [HOME, "Home: readiness 3 of 5", at("free-quiet")],
    [HOME, "Home: readiness 2 of 5", at("free-not-ready")],
    [HOME, "Home: nothing to watch", at("free-steady")],
    [HOME, "Home: everything booked and answered", at("free-caught-up")],
    [HOME, "Home: sharing turned off", at("withdrawn")],
    [HOME, "Home: cancelled member back on the free record", at("cancelled")],
    [HOME, "Notifications", at("free", "/notifications")],
    [RECORD, "Record tab", at("free", "/results")],
    [RECORD, "Biomarker trend (A1c)", at("free", "/biomarker/a1c")],
    [RECORD, "Biomarker trend (LDL)", at("free", "/biomarker/ldl")],
    [RECORD, "Your medicines (with dose differences)", at("free", "/medications")],
    [RECORD, "Medicine details", at("free", "/medicine/atorvastatin")],
    [RECORD, "Visit details", at("free", "/visit/annual")],
    [RECORD, "Outside visit (urgent care)", at("free", "/visit/urgent")],
    [RECORD, "Add to your record (medicine form)", at("free", "/record/add?kind=medicines")],
    [RECORD, "Tell us about a difference", at("free", "/tell-us")],
    [TODO, "To do tab", at("free", "/gaps")],
    [TODO, "Care gap (mammogram)", at("free", "/task/mammogram")],
    [TODO, "Lab order", at("free", "/order/labs-nov")],
    [TODO, "Book with a partner", at("free", "/book/labs-nov")],
    [TODO, "Upcoming appointment", at("free", "/visit/cardio-follow-up")],
    [TODO, "Record review by Dr. Patel", at("free", "/visit/review-dec")],
    [AI, "Ask Inlay", at("free", "/assistant")],
    [AI, "AI credit nearly used", at("free", "/assistant", "credit=high")],
    [AI, "AI credit used up", at("free", "/assistant", "credit=out")],
    [AI, "Borrowed from next week", at("free", "/assistant", "credit=borrowed")],
    [AI, "Member AI credit used up", at("member", "/assistant", "credit=member-out")],
    [UPGRADE, "Upgrade tab", at("free", "/plan")],
    [UPGRADE, "Step 1: goals", at("free", "/goals")],
    [UPGRADE, "Step 2: goals checked against the record", at("free", "/goals-record")],
    [UPGRADE, "Step 3: health profile", at("free", "/health-profile")],
    [UPGRADE, "Step 4: establish your baseline", at("free", "/baseline")],
    [UPGRADE, "Step 5: complete your enrollment", at("free", "/enrollment")],
    [UPGRADE, "Step 6: payment method", at("free", "/payment")],
    [UPGRADE, "You're enrolled", at("member", "/enrolled")],
    [UPGRADE, "Schedule your tests", at("member", "/schedule-tests")],
    [UPGRADE, "Your plan is ready", at("member", "/plan-ready")],
    [MEMBER, "Home", at("member")],
    [MEMBER, "Home: bone plan", at("member-bone")],
    [MEMBER, "Home: nothing logged yesterday", at("member-nothing-logged")],
    [MEMBER, "Home: dinner not logged", at("member-partial")],
    [MEMBER, "Plan version 1 with Dr. Patel", at("member-review")],
    [MEMBER, "New plan version with Dr. Patel", at("member-redraft")],
    [MEMBER, "Plan tab", at("member", "/plan")],
    [MEMBER, "Diet", at("member", "/diet")],
    [MEMBER, "Log a meal", at("member", "/log-meal")],
    [MEMBER, "Exercise", at("member", "/exercise")],
    [MEMBER, "Exercise move", at("member", "/exercise/sit-to-stand")],
    [MEMBER, "Yesterday", at("member", "/day/yesterday")],
    [MEMBER, "Progress", at("member", "/progress")],
    [MEMBER, "History", at("member", "/history")],
    [PROFILE, "Profile", at("free", "/profile")],
    [PROFILE, "Access (connected records and devices)", at("member", "/access")],
    [PROFILE, "Membership", at("member", "/membership")],
    [PROFILE, "Connect your records", at("withdrawn", "/connect")],
  ].map(([feature, sub, url]) => [PATIENT, feature, sub, url])
}

// ── Pages ────────────────────────────────────────────────────────────────

function findPages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return findPages(path)
    return name === "page.tsx" ? [path] : []
  })
}

function routeOf(file) {
  const segments = relative(APP, file).split(sep).slice(0, -1)
  // Route groups "(x)" and private folders "_x" don't appear in the URL.
  const kept = segments.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("_"))
  return "/" + kept.join("/")
}

const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

/** Files an unlisted route by its path, naming it from its metadata title. */
function guess(route, file) {
  const parts = route.split("/").filter(Boolean)
  const portal =
    parts[1] === "admin" ? ADMIN
    : parts[1] === "practice" ? MANAGER
    : parts[1] === "patients" || parts[1] === "provider" ? PROVIDER
    : parts[1] === "patient-portal" || parts[0] === "portal" ? PATIENT
    : GLOBAL
  const title = readFileSync(file, "utf8").match(/metadata[^=]*=\s*\{\s*title:\s*["'`]([^"'`]+)/)?.[1]
  const featureSegment = parts[0] === "screens" ? parts[portal === GLOBAL ? 1 : 2] : parts[0]
  return [portal, titleCase(featureSegment ?? "Home"), title ?? titleCase(parts.at(-1) ?? "Home")]
}

/** Every deliverable page: { portal, feature, sub, url, order }. */
function collectPages() {
  const order = Object.keys(PAGES)
  const pages = []
  for (const file of findPages(APP)) {
    const route = routeOf(file)
    // Design system pages other than its overview roll up into that one row.
    if (relative(APP, file).startsWith("(design-system)") && route !== "/") continue
    const entry = PAGES[route]
    if (!entry && route.includes("[")) continue // needs a sample id in PAGES
    const [portal, feature, sub, opts = {}] = entry ?? guess(route, file)
    if (opts.skip) continue
    const index = entry ? order.indexOf(route) : order.length
    pages.push({ portal, feature, sub, url: BASE_URL + (opts.url ?? route), order: index })
  }
  for (const [portal, feature, sub, url, at] of EXTRA) {
    const index = typeof at === "string" ? order.indexOf(at) + 0.5 : (at ?? order.length)
    pages.push({ portal, feature, sub, url: BASE_URL + url, order: index })
  }
  return pages
}

const pageKey = (p) => `${p.portal} / ${p.feature} / ${p.sub}`

// ── Change log ───────────────────────────────────────────────────────────
// DELIVERABLES-CHANGELOG.md holds one "## DD-Mon-YYYY" section per day.
// "- Added: Portal / Feature / Sub feature" and "- Removed: ..." lines track
// pages; any other "- " line is a note on the day's work.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY = 86_400_000
const formatDate = (d) =>
  `${String(d.getUTCDate()).padStart(2, "0")}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`
function parseDate(s) {
  const [dd, mon, yyyy] = s.split("-")
  return new Date(Date.UTC(+yyyy, MONTHS.indexOf(mon), +dd))
}
/** Today in India, as a UTC midnight date. */
function today() {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date()).split("-")
  return new Date(Date.UTC(+y, +m - 1, +d))
}

function readChangelog() {
  if (!existsSync(CHANGELOG)) return { head: "# Design Deliverables Change Log\n", days: [] }
  const [head, ...sections] = readFileSync(CHANGELOG, "utf8").split(/^## /m)
  const days = sections.map((section) => {
    const [date, ...lines] = section.trim().split("\n")
    const items = lines
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2))
    return {
      date: date.trim(),
      added: items.filter((i) => i.startsWith("Added: ")).map((i) => i.slice(7)),
      removed: items.filter((i) => i.startsWith("Removed: ")).map((i) => i.slice(9)),
      notes: items.filter((i) => !/^(Added|Removed): /.test(i)),
    }
  })
  return { head, days }
}

function writeChangelog({ head, days }) {
  const body = days
    .map((d) =>
      [
        `## ${d.date}`,
        "",
        ...d.notes.map((n) => `- ${n}`),
        ...d.added.map((a) => `- Added: ${a}`),
        ...d.removed.map((r) => `- Removed: ${r}`),
      ].join("\n"),
    )
    .join("\n\n")
  writeFileSync(CHANGELOG, `${head.trimEnd()}\n\n${body}\n`)
}

/** Commit subjects since `since`, as change log notes. Housekeeping commits
    (chore, ci, docs, style, test) are left out. */
function commitNotes(since) {
  try {
    const log = execSync(`git log --since="${since}" --format=%s`, { cwd: ROOT, encoding: "utf8" })
    return log
      .split("\n")
      .filter((s) => s && !/^(chore|ci|docs|style|test)(\(.+\))?!?:/.test(s))
      .map((s) => s.replace(/^\w+(\(.+\))?!?:\s*/, ""))
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .reverse()
  } catch {
    return []
  }
}

/** Adds today's section: pages added or removed since the log last saw them,
    plus the commits made since the previous logged day. */
function logToday(pages) {
  const log = readChangelog()
  const logged = new Set()
  for (const day of log.days) {
    day.added.forEach((a) => logged.add(a))
    day.removed.forEach((r) => logged.delete(r))
  }
  const current = new Set(pages.map(pageKey))
  const date = formatDate(today())
  let day = log.days.find((d) => d.date === date)
  if (!day) log.days.push((day = { date, added: [], removed: [], notes: [] }))

  const previous = log.days.filter((d) => d !== day).at(-1)
  const since = previous
    ? `${new Date(parseDate(previous.date).getTime() + DAY).toISOString().slice(0, 10)}T00:00:00+05:30`
    : "1970-01-01"
  const merge = (list, items) => items.forEach((i) => list.includes(i) || list.push(i))
  merge(day.notes, commitNotes(since))
  merge(day.added, [...current].filter((k) => !logged.has(k)))
  merge(day.removed, [...logged].filter((k) => !current.has(k)))
  writeChangelog(log)
  console.log(`deliverables: logged ${date}, ${day.added.length} added, ${day.removed.length} removed`)
}

// ── Output ───────────────────────────────────────────────────────────────

const csvCell = (c) => {
  const s = String(c)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n"

/** A portal tab: a grey row per feature, then its sub features and links. */
function portalRows(pages) {
  const byFeature = new Map()
  for (const p of [...pages].sort((a, b) => a.order - b.order)) {
    byFeature.set(p.feature, [...(byFeature.get(p.feature) ?? []), p])
  }
  const rows = [["Sub Feature", "Vercel URL"]]
  if (!byFeature.size) rows.push(["No pages yet", ""])
  for (const [feature, list] of byFeature) {
    rows.push([feature, ""])
    list.forEach((p) => rows.push([p.sub, p.url]))
  }
  return rows
}

const pages = collectPages()
if (process.argv.includes("--log")) logToday(pages)

mkdirSync(OUT, { recursive: true })
for (const [portal, file] of Object.entries(PORTALS)) {
  writeFileSync(join(OUT, `${file}.csv`), toCsv(portalRows(pages.filter((p) => p.portal === portal))))
}

console.log(`deliverables: ${pages.length} pages → public/deliverables/ (${BASE_URL})`)
