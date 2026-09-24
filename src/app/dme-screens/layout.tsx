import "@/app/dme-themes.css"
import { DME_NAME, PAINT_ACCENT } from "@/lib/dme-brand"

export const metadata = {
  title: `Patients | ${DME_NAME}`,
  icons: { icon: "/dme/favicon.svg", apple: "/dme/favicon.svg" },
}

export default function DmeScreensLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PAINT_ACCENT }} />
      {children}
    </>
  )
}
