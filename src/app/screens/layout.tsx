import { PortalFontLock } from "@/components/portal/portal-font-lock"

/** Every portal screen: Inter only, regardless of the design-system font. */
export default function ScreensLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PortalFontLock />
      {children}
    </>
  )
}
