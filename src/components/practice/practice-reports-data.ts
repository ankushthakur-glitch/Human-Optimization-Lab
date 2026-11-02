/* The clinic manager's membership numbers: free to paid on the practice's
   own panel. No longer a report (the practice's Reports are the Executive
   Health KPIs, 2 Nov); both portals' dashboards read it. Built on the
   Reports engine, numbers seeded by row and period. */

import {
  type Report,
  per,
  rate,
  raw,
  scaled,
  shareOf,
} from "@/components/provider/reports/reports-data"

/* Free to paid is the whole commercial case (28 Oct), so the practice sees
   whether it works on its own panel. Counts, not revenue: the monthly and
   annual prices are still open. */
export const MEMBERSHIP: Report = {
  id: "membership",
  name: "Membership and conversion",
  typeFilter: false,
  tiles: ["activated", "paid", "conversion", "members"],
  columns: [
    { id: "invited", header: "Patients invited", format: "count", value: raw("invited") },
    { id: "activated", header: "Free app activations", format: "count", value: raw("activated") },
    { id: "paid", header: "Paid enrolments", format: "count", value: raw("paid") },
    { id: "conversion", header: "Conversion rate", format: "percent", value: rate("paid", "activated") },
    { id: "monthly", header: "Monthly", format: "count", value: raw("monthly") },
    { id: "annual", header: "Annual", format: "count", value: raw("annual") },
    { id: "cancelled", header: "Cancellations", format: "count", value: raw("cancelled") },
    { id: "members", header: "Active members at period end", format: "count", value: raw("members") },
    { id: "days", header: "Average days to enrol", format: "days", value: per("days", "paid") },
  ],
  filters: [
    {
      id: "employer",
      label: "Employer",
      all: "All employers",
      options: ({ employers }) => employers.map((e) => ({ label: e.name, value: e.id })),
    },
    {
      id: "plan",
      label: "Membership type",
      all: "Monthly and annual",
      options: [
        { label: "Monthly", value: "Monthly" },
        { label: "Annual", value: "Annual" },
      ],
    },
  ],
  counts: ({ id, n, size, part, rand, filters }) => {
    const invited = n(40, 90)
    const activated = part(invited, 0.5, 0.8)
    const paid = part(activated, 0.1, 0.25)
    const annualShare = 0.25 + rand() * 0.3
    const annual = Math.round(paid * annualShare)
    const members = size(60, 140)
    const cancelled = n(3, 9)
    const days = paid * (6 + rand() * 34)
    const plan = filters.plan
    const keep = plan === "Annual" ? annualShare : plan === "Monthly" ? 1 - annualShare : 1
    const c = {
      invited, activated, days,
      paid: plan === "Annual" ? annual : plan === "Monthly" ? paid - annual : paid,
      monthly: plan === "Annual" ? 0 : paid - annual,
      annual: plan === "Monthly" ? 0 : annual,
      cancelled: Math.round(cancelled * keep),
      members: Math.round(members * keep),
    }
    return scaled(c, shareOf(id, filters.employer, 0.1, 0.35))
  },
}
