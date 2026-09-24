import { PortalProvider } from "@/components/practice/portal"

/** A provider's portal: the practice's patient screens in the provider's frame. */
export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PortalProvider portal="provider">{children}</PortalProvider>
}
