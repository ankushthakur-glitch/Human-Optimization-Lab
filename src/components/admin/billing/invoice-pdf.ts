import {
  type Invoice,
  invoiceSubtotal,
  invoiceTotal,
  money,
} from "@/components/admin/billing/billing-data"

/* The invoice as a document: the same lines and summary as the invoice
   page, laid out on a letter page under the Inlay lockup. It prints from a
   hidden frame, so "Save as PDF" in the print dialog is the download, and
   the file takes the invoice number as its name. Both portals use it; the
   provider's copy may name patients, everyone else sees the ID. */

const day = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const esc = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!
  )

function invoiceHtml(invoice: Invoice, patient: (code: string) => string) {
  const row = (label: string, value: string, strong = false) =>
    `<tr${strong ? ' class="strong"' : ""}><td>${esc(label)}</td><td>${esc(value)}</td></tr>`
  const lines = invoice.lines
    .map(
      (l) => `<tr>
        <td>${day(l.date)}</td>
        <td>${esc(patient(l.patient))}</td>
        <td class="test">${esc(l.test)}<span>${esc(l.vendor)}</span></td>
        <td>${esc(l.provider)}</td>
        <td class="num">${money(l.price)}</td>
      </tr>`
    )
    .join("")
  const summary = [
    row("Subtotal", money(invoiceSubtotal(invoice))),
    ...invoice.credits.map((c) => row(`Credit note ${c.id}`, money(-c.amount))),
    row("Tax", money(0)),
    ...(invoice.lateFee > 0 ? [row("Late fee", money(invoice.lateFee))] : []),
    row(
      invoice.status === "Paid" ? "Paid" : "Amount due",
      money(invoiceTotal(invoice)),
      true
    ),
  ].join("")

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(invoice.id)}</title>
<style>
  @page { size: letter; margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 12px/1.5 Inter, -apple-system, "Segoe UI", sans-serif; color: #1f2328; }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #01837E; }
  header img { height: 28px; }
  header h1 { margin: 0; font-size: 22px; font-weight: 600; text-align: right; }
  header p { margin: 2px 0 0; color: #6b7076; text-align: right; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
  .label { color: #6b7076; margin-bottom: 4px; }
  .name { font-weight: 600; font-size: 13px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 16px; margin: 0; }
  dt { color: #6b7076; } dd { margin: 0; text-align: right; }
  table { width: 100%; border-collapse: collapse; }
  .lines th { text-align: left; font-weight: 500; color: #6b7076; background: #f4f4f3; padding: 8px 10px; }
  .lines td { padding: 8px 10px; border-bottom: 1px solid #e7e7e5; vertical-align: top; }
  .lines .num, .lines th:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .test span { display: block; color: #6b7076; }
  .summary { width: 280px; margin: 16px 0 0 auto; }
  .summary td { padding: 4px 0; } .summary td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .summary .strong td { border-top: 1px solid #1f2328; padding-top: 10px; font-weight: 600; font-size: 15px; }
  footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e7e7e5; color: #6b7076; }
</style></head><body>
<header>
  <img src="${location.origin}/brand/inlay/lockup-light.svg" alt="Inlay Health">
  <div><h1>Invoice</h1><p>${esc(invoice.id)}</p></div>
</header>
<section class="parties">
  <div>
    <div class="label">Billed to</div>
    <div class="name">${esc(invoice.practiceName)}</div>
    <div>Period: ${esc(invoice.period)}</div>
  </div>
  <dl>
    <dt>Issued</dt><dd>${day(invoice.issued)}</dd>
    <dt>Due</dt><dd>${day(invoice.due)}</dd>
    <dt>Terms</dt><dd>${esc(invoice.terms)}</dd>
    <dt>Payment</dt><dd>${esc(invoice.method)}</dd>
    <dt>Status</dt><dd>${esc(invoice.status)}</dd>
  </dl>
</section>
<table class="lines">
  <thead><tr><th>Date</th><th>Patient</th><th>Test</th><th>Ordered by</th><th>Price</th></tr></thead>
  <tbody>${lines}</tbody>
</table>
<table class="summary"><tbody>${summary}</tbody></table>
<footer>Inlay Health. A ${invoice.grace} day grace period applies after the due date, then the practice's late fee.</footer>
</body></html>`
}

/** Opens the print dialog on the invoice document, to save as a PDF. */
export function downloadInvoice(
  invoice: Invoice,
  patient: (code: string) => string = (code) => code
) {
  const frame = document.createElement("iframe")
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;"
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(invoiceHtml(invoice, patient))
  doc.close()
  const print = () => {
    frame.contentWindow!.focus()
    frame.contentWindow!.print()
    setTimeout(() => frame.remove(), 1000)
  }
  const logo = doc.querySelector("img")
  if (logo && !logo.complete) logo.onload = logo.onerror = print
  else print()
}
