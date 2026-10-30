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

  "/screens/handoff/illustrations": [GLOBAL, "Design System", "Illustration handoff: usage and downloads"],

  "/screens/errors": [GLOBAL, "Error States (web)", "All error states"],
  "/screens/errors/permission-denied": [GLOBAL, "Error States (web)", "Permission denied"],
  "/screens/errors/offline": [GLOBAL, "Error States (web)", "No internet connection"],
  "/screens/session-expired": [GLOBAL, "Error States (web)", "Session expired"],

  "/screens/admin": [ADMIN, "", "", { skip: true }],
  "/screens/admin/dashboard": [ADMIN, "Dashboard", "Dashboard: all regions"],
  "/screens/admin/practices": [ADMIN, "Practices", "Practice list"],
  "/screens/admin/practices/[id]": [ADMIN, "Practices", "Practice details", { url: "/screens/admin/practices/593892" }],
  "/screens/admin/practices/[id]/providers/[providerId]": [ADMIN, "Practices", "Provider adoption", { url: "/screens/admin/practices/593892/providers/PR4775" }],
  "/screens/admin/billing": [ADMIN, "Billing", "Billing dashboard"],
  "/screens/admin/billing/invoices/[id]": [ADMIN, "Billing", "Invoice details", { url: "/screens/admin/billing/invoices/INV-202609-001" }],
  "/screens/admin/reports": [ADMIN, "Reports", "Reports (practices and billing)"],
  "/screens/admin/settings": [ADMIN, "Settings", "Settings home"],
  // Each settings page is [group]/[page]; SETTINGS below lists them.
  "/screens/admin/settings/[group]/[page]": [ADMIN, "Settings", "", { skip: true }],


  // The clinic manager's practice portal.
  "/screens/practice": [MANAGER, "", "", { skip: true }],
  "/screens/practice/dashboard": [MANAGER, "Dashboard", "Practice dashboard (enrollment, activation, encounters, outcomes, alerts, value)"],
  ...variations(MANAGER, "/screens/practice/dashboard", ["operations", "activity", "growth", "team", "locations"]),
  "/screens/practice/users": [MANAGER, "Users", "Users: providers tab (list, bulk add)"],
  "/screens/practice/users/providers/new": [MANAGER, "Users", "Add provider"],
  "/screens/practice/users/providers/[id]": [MANAGER, "Users", "Provider profile", { url: "/screens/practice/users/providers/PR3132" }],
  "/screens/practice/users/providers/[id]/edit": [MANAGER, "Users", "Edit provider", { url: "/screens/practice/users/providers/PR3132/edit" }],
  "/screens/practice/patients": [MANAGER, "Patients", "Patients (list, status tabs, bulk add)"],
  "/screens/practice/patients/new": [MANAGER, "Patients", "Add patient"],
  "/screens/practice/patients/[id]": [MANAGER, "Patients", "Patient profile", { url: "/screens/practice/patients/P10240" }],
  "/screens/practice/patients/[id]/edit": [MANAGER, "Patients", "Edit patient", { url: "/screens/practice/patients/P10240/edit" }],
  "/screens/practice/patients/duplicates": [MANAGER, "Patients", "Possible duplicates queue"],
  "/screens/practice/patients/duplicates/[id]": [MANAGER, "Patients", "Review possible duplicate", { url: "/screens/practice/patients/duplicates/DR1001" }],
  "/screens/practice/locations": [MANAGER, "Locations", "Locations (list)"],
  "/screens/practice/locations/new": [MANAGER, "Locations", "Add location"],
  "/screens/practice/locations/[id]": [MANAGER, "Locations", "Location details", { url: "/screens/practice/locations/LOC1001" }],
  "/screens/practice/locations/[id]/edit": [MANAGER, "Locations", "Edit location", { url: "/screens/practice/locations/LOC1001/edit" }],
  "/screens/practice/reports": [MANAGER, "Reports", "Reports (enrollment, encounters, outcomes, alerts, value and renewal, membership)"],
  "/screens/practice/billing": [MANAGER, "Billing", "Billing overview"],
  "/screens/patients/billing": [PROVIDER, "Billing", "Billing overview (view only)"],
  "/screens/patients/billing/invoices/[id]": [PROVIDER, "Billing", "Invoice details", { url: "/screens/patients/billing/invoices/INV-202609-002" }],
  "/screens/practice/billing/invoices/[id]": [MANAGER, "Billing", "Invoice details", { url: "/screens/practice/billing/invoices/INV-202609-002" }],
  "/screens/practice/settings": [MANAGER, "Settings", "Settings home"],
  "/screens/practice/settings/[group]/[page]": [MANAGER, "Settings", "", { skip: true }],
  // A provider's portal, reached from the provider invite.
  "/screens/patients/dashboard": [PROVIDER, "Dashboard", "Dashboard: overview and worklist (abnormal results)"],
  ...variations(PROVIDER, "/screens/patients/dashboard", ["queue", "activity", "practice", "clinic day", "panel", "briefing", "workspace"]),
  "/screens/patients": [PROVIDER, "Patients", "Patients (list, status tabs, last sync)"],
  "/screens/patients/tasks": [PROVIDER, "Tasks", "Tasks (all and my tasks, task details)"],
  "/screens/patients/communication": [PROVIDER, "Communication", "Provider chats"],
  "/screens/patients/reports": [PROVIDER, "Reports", "Reports (report types, period, filters, export)"],
  "/screens/patients/schedule": [PROVIDER, "Schedule", "Schedule (calendar and list, appointment details)"],
  "/screens/patients/settings": [PROVIDER, "Settings", "Settings home"],
  "/screens/patients/settings/[group]/[page]": [PROVIDER, "Settings", "", { skip: true }],
  "/screens/patients/new": [PROVIDER, "Patients", "Add patient and send invite"],
  "/screens/patients/[id]": [PROVIDER, "Patient Chart", "Dashboard: free member", { url: "/screens/patients/P10240" }],
  "/screens/patients/[id]/edit": [PROVIDER, "Patients", "Edit patient", { url: "/screens/patients/P10240/edit" }],
}

/** A dashboard's design variations (v1, v2, ...), offered for review
    beside the dashboard until one is picked. */
function variations(portal, base, names) {
  return Object.fromEntries(
    names.map((name, i) => [`${base}/v${i + 1}`, [portal, "Dashboard", `Dashboard variation ${i + 1}: ${name}`]]),
  )
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

/** One record item as the Record tab opens it (record/item reads it from `d`). */
const SAMPLE_ITEM = {"title": "Knee arthroscopy, right", "provenance": "clinician", "details": [["Date", "Feb 2019"], ["Where", "Scripps Memorial Hospital"]], "source": [["Source", "Scripps Memorial Hospital"], ["System", "Epic"], ["Last updated", "Feb 2019"]]}

/** Pages that aren't a page.tsx of their own: [portal, feature, sub, url,
    at?]. `at` -1 puts a row above the portal's listed pages; a route puts it
    just after that route's row. */
const EXTRA = [
  [GLOBAL, "Design System", "Icon library", "/icons", "/"],
  [GLOBAL, "Design System", "Illustration library", "/illustrations", "/"],
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
  [PROVIDER, "Patient Chart", "Care plan: plan", "/screens/patients/P10240?section=care-plan", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Care plan: quarterly review", "/screens/patients/P10240?section=care-plan&tab=review", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Care plan: history", "/screens/patients/P10240?section=care-plan&tab=history", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Care plan: plan edited by the physician (version 2)", "/screens/patients/P10318?section=care-plan", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Care plan: history with versions", "/screens/patients/P10318?section=care-plan&tab=history", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Care plan: no plan yet", "/screens/patients/P10257?section=care-plan", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Encounters", "/screens/patients/P10240?section=encounters", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Appointments: upcoming", "/screens/patients/P10240?section=appointments", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Appointments: past", "/screens/patients/P10240?section=appointments&tab=past", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Diagnoses", "/screens/patients/P10240?section=diagnoses", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Medications: active", "/screens/patients/P10240?section=medications", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Medications: past", "/screens/patients/P10240?section=medications&tab=past", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Allergies", "/screens/patients/P10240?section=allergies", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Vitals: card view", "/screens/patients/P10240?section=vitals", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Vitals: table view", "/screens/patients/P10240?section=vitals&tab=table", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Vitals: trend view", "/screens/patients/P10318?section=vitals&tab=trends", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Lab results: reports", "/screens/patients/P10240?section=labs", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Lab results: lab orders (order a test, priced)", "/screens/patients/P10240?section=labs&tab=orders", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Family history", "/screens/patients/P10240?section=family", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Sticky notes", "/screens/patients/P10240?section=notes", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Profile", "/screens/patients/P10240?section=profile", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Before consent", "/screens/patients/P10257", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Record building", "/screens/patients/P10750", "/screens/patients/[id]"],
  [PROVIDER, "Patient Chart", "Sync failed", "/screens/patients/P10665", "/screens/patients/[id]"],

  [ADMIN, "Dashboard", "Dashboard: one region", "/screens/admin/dashboard?region=Arizona", "/screens/admin/dashboard"],
  [ADMIN, "Practices", "Add practice", "/screens/admin/practices?new=1", "/screens/admin/practices"],
  [ADMIN, "Practices", "Practice details: providers tab", "/screens/admin/practices/593892?tab=providers", "/screens/admin/practices/[id]"],
  [ADMIN, "Practices", "Practice details: users tab", "/screens/admin/practices/593892?tab=users", "/screens/admin/practices/[id]"],

  ...authFor(MANAGER, "clinic-manager", WEB_AUTH),
  [MANAGER, "Users", "Users: non-clinical users tab (list, view and edit side sheet)", "/screens/practice/users?tab=staff"],
  [MANAGER, "Users", "Add user", "/screens/practice/users?tab=staff&new=1"],
  [MANAGER, "Patients", "Bulk add patients", "/screens/practice/patients?import=1", "/screens/practice/patients"],

  ...authFor(PROVIDER, "provider", WEB_AUTH),
  ...[
    ["Urgent action needed", "urgent"],
    ["Medication changes", "medications"],
    ["Overdue orders", "orders"],
    ["Care gaps", "care-gaps"],
    ["Reviews due", "reviews"],
    ["All types", "all"],
  ].map(([sub, tab]) => [PROVIDER, "Dashboard", sub, `/screens/patients/dashboard?tab=${tab}`, "/screens/patients/dashboard"]),
  [PROVIDER, "Patients", "Patients: filtered by sync failed", "/screens/patients?record=Sync%20failed", "/screens/patients"],
  [PROVIDER, "Patients", "Bulk add patients", "/screens/patients?import=1", "/screens/patients"],
  [PROVIDER, "Tasks", "Add task", "/screens/patients/tasks?new=1", "/screens/patients/tasks"],

  [PROVIDER, "Billing", "Orders", "/screens/patients/billing?tab=orders", "/screens/patients/billing"],
  [PROVIDER, "Billing", "Invoices and statements", "/screens/patients/billing?tab=invoices", "/screens/patients/billing"],
  [MANAGER, "Billing", "Orders", "/screens/practice/billing?tab=orders", "/screens/practice/billing"],
  [MANAGER, "Billing", "Invoices and statements", "/screens/practice/billing?tab=invoices", "/screens/practice/billing"],
  [ADMIN, "Billing", "Invoices", "/screens/admin/billing?tab=invoices", "/screens/admin/billing"],
  [ADMIN, "Billing", "Vendor payouts", "/screens/admin/billing?tab=payouts", "/screens/admin/billing"],
  [ADMIN, "Billing", "Physician review fees", "/screens/admin/billing?tab=reviews", "/screens/admin/billing"],
  [ADMIN, "Billing", "Profit and loss", "/screens/admin/billing?tab=pnl", "/screens/admin/billing"],

  ...settingsPages(ADMIN, "/screens/admin/settings", [
    ["Roles and permissions", "roles/permissions"],
    ["Optimization plans: test intervals", "plans/intervals"],
    ["Optimization plans: limits", "plans/limits"],
    ["Pricing: membership", "pricing/membership"],
    ["Pricing: AI credit top ups", "pricing/top-ups"],
    ["Billing: catalogue and pricing", "billing/catalogue"],
    ["Billing: patient payments", "billing/patients"],
    ["Billing: cancellations", "billing/cancellations"],
    ["AI credit", "ai/credit"],
    ["Clinical catalog: biomarkers", "clinical/biomarkers"],
    ["Clinical catalog: ranges", "clinical/ranges"],
    ["Clinical catalog: sex and age rules", "clinical/sex-age"],
    ["Alert rules", "rules/alerts"],
    ["Test cases", "rules/cases"],
    ["Partners", "partners/list"],
    ["Consent documents", "consent/documents"],
    ["Audit log", "security/audit-log"],
  ]),
  ...settingsPages(MANAGER, "/screens/practice/settings", [
    ["Patient flags", "patients/flags"],
    ["Employer accounts", "employers/list"],
    ["Patient invitation: channels", "invitations/channels"],
    ["Patient invitation: reminders", "invitations/reminders"],
    ["Alerts: notifications", "alerts/notifications"],
    ["Audit log", "security/audit-log"],
    ["Import history", "security/import-history"],
    ["Import history: patients sheet", "security/import-history/IM20481"],
  ]),
  ...settingsPages(PROVIDER, "/screens/patients/settings", [
    ["Patient flags", "account/flags"],
    ["Alerts: notifications", "alerts/notifications"],
    ["Audit log", "security/audit-log"],
    ["Import history", "security/import-history"],
    ["Import history: patients sheet", "security/import-history/IM20433"],
  ]),

  // A patient has no web invitation: they activate on the mobile app.
  // The app's signed-out screens, served from public/app. Set password and
  // home sit behind the app's session, so they have no link of their own.
  [PATIENT, AUTH, "Activate account (mobile app)", "/app/activate", -1],
  [PATIENT, AUTH, "Set password (mobile app)", "/app/set-password", -1],
  [PATIENT, AUTH, "Sign in (mobile app)", "/app/sign-in", -1],
  ...patientApp(),
]

/** A portal's settings pages ([group]/[page]), listed after its settings home. */
function settingsPages(portal, base, subs) {
  return subs.map(([sub, path]) => [portal, "Settings", sub, `${base}/${path}`, base])
}

/** The patient app's screens, linked plainly (the demo seed links were
    removed 16 Oct 2026). Each link opens its own screen as the sample
    patient (mobile/src/lib/storage.ts); the bare /app starts at
    activation, so Home is /app?home=1. */
function patientApp() {
  const at = (to) => `/app${to}`
  const ONBOARDING = "Patient Onboarding"
  const HOME = "Mobile App: Home"
  const TODO = "Mobile App: To Do"
  const RECORD = "Mobile App: Record"
  const CONNECT = "Mobile App: Connect Records"
  const AI = "Mobile App: Ask Inlay"
  const UPGRADE = "Mobile App: Upgrade and Plan Set Up"
  const MEMBER = "Mobile App: Optimization Member"
  const CARE = "Mobile App: Care"
  const PROFILE = "Mobile App: Profile and Settings"
  return [
    [ONBOARDING, "Is this you?", at("/onboarding/about-you")],
    [ONBOARDING, "Consent: records", at("/onboarding/consent")],
    [ONBOARDING, "Connect your health records", at("/onboarding/connect-records")],
    [ONBOARDING, "Updates about your care: texts and signature", at("/onboarding/consent-texts")],
    [ONBOARDING, "Your why", at("/onboarding/your-why")],
    [ONBOARDING, "Record building", at("/onboarding/syncing")],
    [ONBOARDING, "What matters most", at("/onboarding/life")],
    [ONBOARDING, "Record ready", at("/onboarding/syncing?ready=1")],
    [HOME, "Home", at("?home=1")],
    [HOME, "Your biological age", at("?age=1")],
    [HOME, "Notifications", at("/notifications")],
    [TODO, "To do tab", at("/gaps")],
    [TODO, "Care gap (mammogram)", at("/task/mammogram")],
    [TODO, "Lab order", at("/order/labs-nov")],
    [TODO, "Book with a partner", at("/book/labs-nov")],
    [TODO, "Upcoming appointment", at("/visit/cardio-follow-up")],
    [TODO, "Record review by Dr. Patel", at("/visit/review-dec")],
    [RECORD, "Record tab", at("/results")],
    [RECORD, "Biomarker trend (A1c)", at("/biomarker/a1c")],
    [RECORD, "Biomarker trend (LDL)", at("/biomarker/ldl")],
    [RECORD, "Imaging report viewer (echo)", at("/report/2026-03-10-echo-pacific-heart")],
    [RECORD, "Your medicines (with dose differences)", at("/medications")],
    [RECORD, "Medicine details", at("/medicine/atorvastatin")],
    [RECORD, "Visit details", at("/visit/annual")],
    [RECORD, "Outside visit (urgent care)", at("/visit/urgent")],
    [RECORD, "Record item details (procedure)", at(`/record/item?d=${encodeURIComponent(JSON.stringify(SAMPLE_ITEM))}`)],
    [RECORD, "Add to your record (medicine form)", at("/record/add?kind=medicines")],
    [RECORD, "Tell us something", at("/tell-us")],
    [CONNECT, "Connect your records", at("/connect")],
    [CONNECT, "Connect your records: texts and signature", at("/connect-texts")],
    [CONNECT, "Record building after connecting", at("/building")],
    [AI, "Ask Inlay (optimization member)", at("/assistant?demo=paid")],
    [UPGRADE, "Plan tab: what an optimization plan adds (free patient)", at("/plan")],
    [UPGRADE, "Step 1: your nine opportunities", at("/opportunities")],
    [UPGRADE, "Opportunity details (sleep and apnoea)", at("/opportunity/sleep")],
    [UPGRADE, "Step 2: what all nine need (tests and prices)", at("/plan-tests")],
    [UPGRADE, "Step 3: complete your enrollment", at("/enrollment")],
    [UPGRADE, "Step 4: payment method (card, HSA or FSA)", at("/payment")],
    [UPGRADE, "You're enrolled", at("/enrolled")],
    [UPGRADE, "Schedule your tests", at("/schedule-tests")],
    [UPGRADE, "Your tests are scheduled", at("/schedule-confirmed")],
    [UPGRADE, "Tell us about you", at("/health-profile")],
    [UPGRADE, "Are you flourishing? (video)", at("/flourishing")],
    [UPGRADE, "Flourishing questions", at("/flourishing-questions")],
    [UPGRADE, "Your flourishing result", at("/flourishing-result")],
    [UPGRADE, "Sleep apnea questions", at("/sleep-questions")],
    [UPGRADE, "Your sleep result", at("/sleep-result")],
    [UPGRADE, "Your plan is ready", at("/plan-ready")],
    [UPGRADE, "Set your starting point", at("/starting-point")],
    [MEMBER, "Home (paid member)", at("?demo=paid")],
    [MEMBER, "Plan tab: Today", at("/plan?demo=paid")],
    [MEMBER, "Plan tab: History", at("/plan?demo=paid&section=history")],
    [MEMBER, "Plan tab: Progress", at("/plan?demo=paid&section=progress")],
    [MEMBER, "Plan tab: Outlook", at("/plan?demo=paid&section=outlook")],
    [MEMBER, "Exercise", at("/topic/exercise")],
    [MEMBER, "Lift details and progression (goblet squat)", at("/lift/goblet-squat")],
    [MEMBER, "Eat (log a meal, alcohol)", at("/topic/eat")],
    [MEMBER, "Sleep", at("/topic/sleep")],
    [MEMBER, "Mind", at("/topic/mind")],
    [MEMBER, "Medication and supplements", at("/topic/medication")],
    [MEMBER, "Measure (weigh-in, waist)", at("/topic/measure")],
    [MEMBER, "Diet plan", at("/diet")],
    [MEMBER, "Yesterday in numbers", at("/yesterday")],
    [MEMBER, "History trends", at("/history-trends")],
    [MEMBER, "Exercise history", at("/topic-history/exercise")],
    [MEMBER, "Eat history", at("/topic-history/eat")],
    [MEMBER, "Progress", at("/progress")],
    [CARE, "Care tab (catalog categories)", at("/care")],
    [CARE, "Category: Laboratory (select panels)", at("/catalog/category/lab")],
    [CARE, "Category: Devices and wearables", at("/catalog/category/devices")],
    [CARE, "Item: test booked at a visit", at("/catalog/blood-panel")],
    [CARE, "Item: device shipped home", at("/catalog/cgm")],
    [CARE, "Book a time", at("/catalog/book/blood-panel")],
    [PROFILE, "Profile", at("/profile")],
    [PROFILE, "Access (connected records)", at("/access")],
    [PROFILE, "Renew sharing", at("/access?sheet=renew")],
    [PROFILE, "Membership and billing", at("/membership")],
    [PROFILE, "Pay your membership (monthly or yearly)", at("/membership-pay")],
    [PROFILE, "Add AI credit (top up)", at("/ai-credit")],
    [PROFILE, "Plan settings (reminders, notifications, units)", at("/plan-settings")],
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
