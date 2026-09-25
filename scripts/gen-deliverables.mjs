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
  "Provider Portal": "provider-portal",
  "Patient Portal": "patient-portal",
}
const GLOBAL = "Global Pages"
const ADMIN = "Super Admin Portal"
const PROVIDER = "Provider Portal"
const PATIENT = "Patient Portal"

/** route → [portal, feature, sub feature, options]. `url` gives a dynamic
    route a link; `skip` leaves a route out (redirects, internals). */
const PAGES = {
  // The design system is one deliverable: its overview links to every page.
  "/": [GLOBAL, "Design System", "Design system"],

  "/screens/login": [GLOBAL, "Authentication", "Sign in"],
  "/screens/login/verify": [GLOBAL, "Authentication", "Two-factor verification"],
  "/screens/login/two-factor-setup": [GLOBAL, "Authentication", "Two-factor setup"],
  "/screens/login/forgot-password": [GLOBAL, "Authentication", "Forgot password"],
  "/screens/login/reset-code": [GLOBAL, "Authentication", "Reset code sent"],
  "/screens/login/reset-password": [GLOBAL, "Authentication", "Reset password"],
  "/screens/login/set-password": [GLOBAL, "Authentication", "Set password"],
  "/screens/login/activate": [GLOBAL, "Authentication", "Activate account"],
  "/screens/login/invite-email": [GLOBAL, "Authentication", "Invitation email (desktop)"],
  "/screens/login/invite-email/mobile": [GLOBAL, "Authentication", "Invitation email (mobile)"],
  "/screens/session-expired": [GLOBAL, "Session", "Session expired"],

  "/screens/errors": [GLOBAL, "Error States", "All error states"],
  "/screens/errors/permission-denied": [GLOBAL, "Error States", "Permission denied"],
  "/screens/errors/offline": [GLOBAL, "Error States", "No internet connection"],

  "/screens/admin": [ADMIN, "", "", { skip: true }],
  "/screens/admin/practices": [ADMIN, "Practices", "Practice list"],
  "/screens/admin/practices/[id]": [ADMIN, "Practices", "Practice details", { url: "/screens/admin/practices/593892" }],

  "/screens/patients": [PROVIDER, "Patients", "Patient worklist"],
  "/screens/patients/new": [PROVIDER, "Patients", "Register patient"],

  // The clinic manager's practice portal.
  "/screens/practice": [PROVIDER, "", "", { skip: true }],
  "/screens/practice/providers": [PROVIDER, "", "", { skip: true }],
  "/screens/practice/users": [PROVIDER, "Clinic Manager Portal", "Users: providers tab (list, bulk import)"],
  "/screens/practice/users/providers/new": [PROVIDER, "Clinic Manager Portal", "Add provider"],
  "/screens/practice/users/providers/[id]": [PROVIDER, "Clinic Manager Portal", "Provider profile", { url: "/screens/practice/users/providers/PR3132" }],
  "/screens/practice/users/providers/[id]/edit": [PROVIDER, "Clinic Manager Portal", "Edit provider", { url: "/screens/practice/users/providers/PR3132/edit" }],
  "/screens/practice/patients": [PROVIDER, "Clinic Manager Portal", "Patients (list, bulk import)"],
  "/screens/practice/patients/new": [PROVIDER, "Clinic Manager Portal", "Patient onboarding form"],
  "/screens/practice/patients/[id]": [PROVIDER, "Clinic Manager Portal", "Patient profile", { url: "/screens/practice/patients/P10240" }],
  "/screens/practice/patients/[id]/edit": [PROVIDER, "Clinic Manager Portal", "Edit patient", { url: "/screens/practice/patients/P10240/edit" }],
  "/screens/practice/patients/duplicates": [PROVIDER, "Clinic Manager Portal", "Possible duplicates queue"],
  "/screens/practice/patients/duplicates/[id]": [PROVIDER, "Clinic Manager Portal", "Review possible duplicate", { url: "/screens/practice/patients/duplicates/DR1001" }],
  "/screens/practice/locations": [PROVIDER, "Clinic Manager Portal", "Locations (list)"],
  "/screens/practice/locations/new": [PROVIDER, "Clinic Manager Portal", "Add location"],
  "/screens/practice/locations/[id]": [PROVIDER, "Clinic Manager Portal", "Location details", { url: "/screens/practice/locations/LOC1001" }],
  "/screens/practice/locations/[id]/edit": [PROVIDER, "Clinic Manager Portal", "Edit location", { url: "/screens/practice/locations/LOC1001/edit" }],
  // A provider's portal, reached from the provider invite.
  "/screens/provider": [PROVIDER, "", "", { skip: true }],
  "/screens/provider/patients": [PROVIDER, "Provider Portal", "Patients (list, bulk import, send invites)"],
  "/screens/provider/patients/new": [PROVIDER, "Provider Portal", "Add patient and send invite"],
  "/screens/provider/patients/[id]": [PROVIDER, "Provider Portal", "Patient profile", { url: "/screens/provider/patients/P10240" }],
  "/screens/provider/patients/[id]/edit": [PROVIDER, "Provider Portal", "Edit patient", { url: "/screens/provider/patients/P10240/edit" }],
}

/** Pages that aren't a page.tsx of their own: [portal, feature, sub, url]. */
const EXTRA = [
  [GLOBAL, "Error States", "Page not found", "/screens/page-not-found"],
  // A clinic manager's first sign-in: the shared login screens with ?as=.
  ...[
    ["Invitation email (desktop)", "/screens/login/invite-email"],
    ["Invitation email (mobile)", "/screens/login/invite-email/mobile"],
    ["Activate account", "/screens/login/activate"],
    ["Set password", "/screens/login/set-password"],
    ["Two-factor setup", "/screens/login/two-factor-setup"],
  ].map(([sub, url]) => [PROVIDER, "Clinic Manager Onboarding", sub, `${url}?as=clinic-manager`]),
  [PROVIDER, "Clinic Manager Portal", "Users: non-clinical users tab (list, add, view, edit panels)", "/screens/practice/users?tab=staff"],
  // A provider's first sign-in, invited by the clinic manager.
  ...[
    ["Invitation email (desktop)", "/screens/login/invite-email"],
    ["Invitation email (mobile)", "/screens/login/invite-email/mobile"],
    ["Activate account", "/screens/login/activate"],
    ["Set password", "/screens/login/set-password"],
    ["Two-factor setup", "/screens/login/two-factor-setup"],
  ].map(([sub, url]) => [PROVIDER, "Provider Onboarding", sub, `${url}?as=provider`]),
  // A patient's invitation; the rest of their onboarding is in the mobile app.
  ...[
    ["Invitation email (desktop)", "/screens/login/invite-email"],
    ["Invitation email (mobile)", "/screens/login/invite-email/mobile"],
  ].map(([sub, url]) => [PATIENT, "Patient Onboarding", sub, `${url}?as=patient`]),
  // The app's signed-out screens, served from public/app. Set password and
  // home sit behind the app's session, so they have no link of their own.
  [PATIENT, "Patient Onboarding", "Activate account (mobile app)", "/app/activate"],
  [PATIENT, "Patient Onboarding", "Sign in (mobile app)", "/app/sign-in"],
  // The app's error states; errors/ is a review index that opens each one.
  [PATIENT, "Error States (mobile app)", "All error states", "/app/errors"],
  [PATIENT, "Error States (mobile app)", "Page not found", "/app/errors/this-page-does-not-exist"],
  [PATIENT, "Error States (mobile app)", "Session expired", "/app/errors/session-expired"],
  [PATIENT, "Error States (mobile app)", "No internet connection", "/app/errors/offline"],
  [PATIENT, "Error States (mobile app)", "Something went wrong", "/app/errors/crash"],
]

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
  for (const [portal, feature, sub, url] of EXTRA) {
    pages.push({ portal, feature, sub, url: BASE_URL + url, order: order.length })
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

/** A portal tab: a grey row per feature, then its numbered sub features. */
function portalRows(pages) {
  const byFeature = new Map()
  for (const p of [...pages].sort((a, b) => a.order - b.order)) {
    byFeature.set(p.feature, [...(byFeature.get(p.feature) ?? []), p])
  }
  const rows = [["#", "Sub Feature", "Vercel URL"]]
  if (!byFeature.size) rows.push(["", "No pages yet", ""])
  for (const [feature, list] of byFeature) {
    rows.push([feature, "", ""])
    list.forEach((p, i) => rows.push([i + 1, p.sub, p.url]))
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
