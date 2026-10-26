import { Platform, Share } from "react-native"

import { firstMonth, planName } from "@/components/enrollment-kit"
import { dollarsExact } from "@/lib/baseline-tests"
import type { State } from "@/lib/onboarding"
import { priceLabel } from "@/lib/plans"

/* The itemized receipt for the set-up's payment (16 Oct call: HSA and FSA
   administrators ask for one): the membership, each baseline test, the
   yearly discount and the total, with the card that paid. The web build
   saves it as a file; a phone opens the share sheet, so she can save it to
   Files or send it on. */

export type Receipt = {
  number: string
  date: string
  paidWith: string
  lines: { label: string; amount: string }[]
  total: string
  /** The total in dollars, for the popup's count up. */
  amount: number
}

export function receiptOf(onboarding: State): Receipt {
  const m = onboarding.membership
  const billing = m?.billing ?? "yearly"
  const cost = firstMonth(onboarding.baselinePicks, billing, onboarding.addOns, onboarding.testPay)
  const at = new Date(m?.startedAt ?? Date.now())
  return {
    number: `INL-${at.getTime().toString().slice(-8)}`,
    date: at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    paidWith: m?.card ?? "Card",
    lines: [
      { label: `${planName(onboarding.goals)}, ${priceLabel(billing)}`, amount: dollarsExact(cost.membership) },
      // Tests paid after her physician's review are on a receipt of their own.
      ...(cost.later
        ? []
        : [
            ...cost.tests.map((t) => ({ label: t.name, amount: dollarsExact(t.price) })),
            ...cost.addOns.map((a) => ({ label: a.name, amount: dollarsExact(a.price) })),
            ...(cost.discount ? [{ label: "Yearly discount on tests", amount: `-${dollarsExact(cost.discount)}` }] : []),
          ]),
    ],
    total: dollarsExact(cost.total),
    amount: cost.total,
  }
}

function receiptText(r: Receipt) {
  return [
    "Inlay Health receipt",
    `Receipt ${r.number}`,
    `Date: ${r.date}`,
    `Paid with: ${r.paidWith}`,
    "",
    ...r.lines.map((l) => `${l.label}: ${l.amount}`),
    "",
    `Total paid: ${r.total}`,
  ].join("\n")
}

function receiptHtml(r: Receipt) {
  const row = (a: string, b: string, strong = false) =>
    `<tr${strong ? ' class="total"' : ""}><td>${a}</td><td class="amt">${b}</td></tr>`
  return `<!doctype html><html><head><meta charset="utf-8"><title>Inlay Health receipt ${r.number}</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d2939;max-width:560px;margin:40px auto;padding:0 16px}
h1{font-size:20px;margin:0 0 4px;color:#01837E}p{margin:2px 0;color:#475467;font-size:14px}
table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}td{padding:10px 0;border-bottom:1px solid #eaecf0}
.amt{text-align:right}.total td{font-weight:600;border-bottom:0}</style></head><body>
<h1>Inlay Health</h1><p>Receipt ${r.number}</p><p>Date: ${r.date}</p><p>Paid with: ${r.paidWith}</p>
<table>${r.lines.map((l) => row(l.label, l.amount)).join("")}${row("Total paid", r.total, true)}</table>
</body></html>`
}

/** Saves the receipt: a file on the web build, the share sheet on a phone. */
export async function downloadReceipt(r: Receipt) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([receiptHtml(r)], { type: "text/html" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `inlay-receipt-${r.number}.html`
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  await Share.share({ title: `Inlay Health receipt ${r.number}`, message: receiptText(r) })
}
