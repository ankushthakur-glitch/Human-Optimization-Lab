"use client"

import {
  Illustration,
  type IllustrationName,
} from "@/components/illustrations/illustration"
import { AdminShell, type AdminModule } from "@/components/admin/admin-shell"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/design-system/ui/empty"

/* Admin modules that are in the nav but not built yet. They open on their
   empty state rather than doing nothing when clicked. */
export function ComingSoon({
  active,
  illustration,
  title,
  description,
}: {
  active: AdminModule
  illustration: IllustrationName
  title: string
  description: string
}) {
  return (
    <AdminShell active={active}>
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia>
            <Illustration name={illustration} />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </AdminShell>
  )
}
