import { DmeShell } from "@/components/dme/dme-shell"
import { DME_ACCENT, DME_NAME } from "@/lib/dme-brand"

export const metadata = {
  title: { default: `${DME_NAME} | Design System`, template: `%s | ${DME_NAME}` },
  description: `Design system and component library for ${DME_NAME}.`,
  icons: { icon: "/dme/favicon.svg", apple: "/dme/favicon.svg" },
}

// Paints cyan before hydration so the teal default never flashes.
const PAINT_ACCENT = `document.documentElement.setAttribute("data-accent",${JSON.stringify(DME_ACCENT)})`

export default function DmeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PAINT_ACCENT }} />
      <DmeShell>{children}</DmeShell>
    </>
  )
}
