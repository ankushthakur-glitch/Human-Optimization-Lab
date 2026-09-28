import {
  type Patient,
  fullName,
  personAddress,
  usDate,
} from "@/components/practice/practice-data"

/* The signed record consent as a one page PDF, written by hand so the chart
   needs no PDF library: Helvetica text, a rule under the letterhead and a
   signature box. Sample wording until the real form comes from the app. */

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 56
const TEXT_W = PAGE_W - MARGIN * 2
const INK = "0.09 0.09 0.09"
const MUTED = "0.42 0.42 0.42"
const RULE = "0.85 0.85 0.85"

type Font = "F1" | "F2"

/** PDF strings are ASCII here; escape the delimiters and drop the rest. */
function esc(text: string) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/([\\()])/g, "\\$1")
}

/** Wrap on words, measuring with Helvetica's average advance. */
function wrap(text: string, size: number, width = TEXT_W) {
  const perLine = Math.floor(width / (size * 0.5))
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (next.length > perLine && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export function consentPdf(p: Patient, withdrawn: boolean) {
  const ops: string[] = []
  let y = PAGE_H - MARGIN

  const text = (
    s: string,
    x: number,
    at: number,
    size: number,
    font: Font = "F1",
    color = INK
  ) =>
    ops.push(
      `${color} rg BT /${font} ${size} Tf ${x} ${at} Td (${esc(s)}) Tj ET`
    )
  const rule = (at: number, color = RULE, w = 0.75) =>
    ops.push(
      `${color} RG ${w} w ${MARGIN} ${at} m ${PAGE_W - MARGIN} ${at} l S`
    )
  const para = (s: string, size = 10.5, gap = 15) => {
    for (const l of wrap(s, size)) {
      text(l, MARGIN, y, size)
      y -= gap
    }
  }
  const heading = (s: string) => {
    y -= 10
    text(s, MARGIN, y, 12, "F2")
    y -= 18
  }

  // Letterhead
  text("Human Optimization Lab", MARGIN, y, 17, "F2")
  text("Health record access consent", MARGIN, y - 20, 12, "F1", MUTED)
  const status = withdrawn ? "Withdrawn" : "Active"
  text(`Status: ${status}`, PAGE_W - MARGIN - 90, y, 10.5, "F2")
  y -= 36
  rule(y, INK, 1.5)
  y -= 26

  // Patient
  const rows: [string, string][] = [
    ["Patient", fullName(p)],
    ["Date of birth", usDate(p.dob)],
    ["Patient ID", p.id],
    ["Email", p.email || "Not provided"],
    ["Address", personAddress(p) || "Not provided"],
  ]
  for (const [label, value] of rows) {
    text(label, MARGIN, y, 10, "F1", MUTED)
    text(value, MARGIN + 110, y, 10.5)
    y -= 17
  }
  y -= 4
  rule(y)
  y -= 8

  heading("What I agree to")
  para(
    "I allow Human Optimization Lab and my care team to request and view my health records through Health Gorilla, so my provider can review my history and build my care plan."
  )
  heading("What it covers")
  para(
    "Records from hospitals, clinics, labs and imaging centers on Carequality, CommonWell, eHealth Exchange and the lab networks: visits, problems, medications, allergies, immunizations, lab results, imaging and documents. Records are pulled read only; nothing is sent back or changed at the source."
  )
  heading("How long it lasts")
  para(
    "This consent stays valid until I withdraw it. I can withdraw it at any time in the HOL patient app under Settings. Records already retrieved stay in my chart; no new records are pulled after I withdraw."
  )
  heading("My rights")
  para(
    "I can ask for a copy of this form and of the records retrieved. Refusing or withdrawing does not affect my right to care from my provider."
  )

  // Signature
  y -= 16
  const boxH = 74
  ops.push(
    `${RULE} RG 0.75 w ${MARGIN} ${y - boxH} ${TEXT_W} ${boxH} re S`
  )
  const given = p.invitedAt ? usDate(p.invitedAt) : ""
  text("Signed electronically by", MARGIN + 14, y - 22, 10, "F1", MUTED)
  text(fullName(p), MARGIN + 14, y - 40, 13, "F2")
  text(`Given on ${given} in the HOL patient app`, MARGIN + 14, y - 58, 10)
  text("Retrieved through", MARGIN + 300, y - 22, 10, "F1", MUTED)
  text("Health Gorilla", MARGIN + 300, y - 40, 13, "F2")
  y -= boxH

  // Footer
  rule(MARGIN + 14)
  text(`Consent ID CNS-${p.id}`, MARGIN, MARGIN, 9, "F1", MUTED)
  text("Page 1 of 1", PAGE_W - MARGIN - 50, MARGIN, 9, "F1", MUTED)

  const stream = ops.join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    `<< /Title (${esc(`Record consent, ${fullName(p)}`)}) /Producer (Human Optimization Lab) >>`,
  ]

  let out = "%PDF-1.4\n"
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  return new Blob([out], { type: "application/pdf" })
}

export const consentFileName = (p: Patient) =>
  `Record consent ${fullName(p)}.pdf`.replace(/[^\w ,.-]+/g, "")
