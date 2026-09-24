"use client"

import { IconCheck } from "@/design-system/icons"

import { cn } from "@/lib/utils"
import { DME_ACCENTS } from "@/lib/dme-brand"
import { setDmeAccent } from "@/components/dme/use-dme-accent"

/** The primary colour swatches; `large` is the Customization page's card grid. */
export function DmeAccentPicker({ value, large = false }: { value: string; large?: boolean }) {
  return (
    <div className={cn("grid gap-2", large ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-7" : "grid-cols-4")}>
      {DME_ACCENTS.map((accent) => {
        const active = accent.name === value
        return (
          <button
            key={accent.name}
            type="button"
            aria-pressed={active}
            onClick={() => setDmeAccent(accent.name)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border bg-card text-xs font-medium transition-colors hover:bg-surface-hover",
              large ? "p-3" : "p-2",
              active && "border-primary ring-1 ring-primary"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-full text-white",
                large ? "size-12" : "size-7"
              )}
              style={{ backgroundColor: accent.swatch }}
            >
              {active && <IconCheck className={large ? "size-5" : "size-3.5"} />}
            </span>
            {accent.label}
          </button>
        )
      })}
    </div>
  )
}
