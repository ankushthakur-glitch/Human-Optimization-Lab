import "@/app/dme-themes.css"
import { DmeShell } from "@/components/dme/dme-shell"
import { DME_NAME, PAINT_ACCENT } from "@/lib/dme-brand"

export const metadata = {
  title: { default: `${DME_NAME} | Design System`, template: `%s | ${DME_NAME}` },
  description: `Design system and component library for ${DME_NAME}.`,
  icons: { icon: "/dme/favicon.svg", apple: "/dme/favicon.svg" },
}

export default function DmeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PAINT_ACCENT }} />
      <DmeShell>{children}</DmeShell>
    </>
  )
}
