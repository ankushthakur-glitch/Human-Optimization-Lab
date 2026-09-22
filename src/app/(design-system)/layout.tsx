import { DsShell } from "@/components/ds-shell"

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DsShell>{children}</DsShell>
}
