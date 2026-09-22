"use client"

import { HugeiconsIcon } from "@hugeicons/react"

import { COMPONENT_ICONS } from "@/design-system/component-icons"

export function ComponentIcon({
  slug,
  className,
}: {
  slug: string
  className?: string
}) {
  const icon = COMPONENT_ICONS[slug]
  if (!icon) return null
  return <HugeiconsIcon icon={icon} className={className} aria-hidden />
}
