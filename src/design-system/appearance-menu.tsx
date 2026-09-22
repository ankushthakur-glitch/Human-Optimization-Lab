"use client"

import { cn } from "cn"
import { useTheme } from "next-themes"

import { IconComputer, IconMoon, IconSun } from "@/design-system/icons"
import { useDesignSystem } from "@/design-system/providers/design-system-provider"
import { ACCENT_THEMES } from "@/design-system/tokens/themes"
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/design-system/ui/dropdown-menu"

/**
 * The appearance controls that sit inside an account menu.
 *
 * The design system has a full customizer — fonts, radius, base palette, icon
 * stroke — but that is a tool for building the product, not something to hand
 * a clinician mid-shift. What a person actually reaches for is the two things
 * here: light or dark, and the colour the app is painted in. Both write the
 * same store the customizer does, so the two never disagree.
 *
 * These are menu radio items rather than plain buttons on purpose. Base UI
 * keeps them in the menu's own arrow-key and typeahead order, gives them
 * `menuitemradio` semantics, and — unlike a menu *item* — leaves the menu open
 * when one is chosen, so a colour can be compared against the next one without
 * reopening anything.
 */

const MODES = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "system", label: "Auto", icon: IconComputer },
] as const

/* Walked around the wheel rather than listed alphabetically: a strip of colour
   is read as a spectrum, and an A-Z order makes neighbouring swatches look
   like mistakes. The near-black accents the customizer offers (stone, zinc,
   mauve, olive, mist, taupe) are left out — side by side at this size they are
   six indistinguishable dark circles, and "neutral" already stands for that
   whole idea. Anyone who wants the exact one still has the customizer. */
const ACCENT_ORDER = [
  "neutral",
  "red",
  "rose",
  "pink",
  "fuchsia",
  "purple",
  "violet",
  "indigo",
  "blue",
  "sky",
  "cyan",
  "teal",
  "emerald",
  "green",
  "lime",
  "yellow",
  "amber",
  "orange",
]

const MENU_ACCENTS = ACCENT_ORDER.flatMap((name) => {
  const accent = ACCENT_THEMES.find((theme) => theme.name === name)
  return accent ? [accent] : []
})

/* The radio item ships as a full-width row — a gutter for its tick, padding
   for a label. A tile and a swatch are neither, so both reset that geometry
   and mark themselves instead: the tile by inverting, the swatch by a ring.
   The checked tile's colours are forced, because the popup highlights whatever
   the pointer is over with a descendant rule that would otherwise strip the
   fill off the selected tile the moment you hovered it. */
const tileClass =
  "flex-col justify-center gap-1 rounded-2xl border border-border/70 px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors data-checked:border-transparent data-checked:bg-primary! data-checked:text-primary-foreground! data-checked:**:text-primary-foreground!"

/* The fill is an inline style, which no class can outrank, so the ring is free
   to mean exactly one thing: this is the accent in use. */
const swatchClass =
  "size-6 justify-center rounded-full p-0 ring-offset-2 ring-offset-popover transition-transform hover:scale-110 data-highlighted:scale-110 data-checked:ring-2 data-checked:ring-ring data-highlighted:ring-2 data-highlighted:ring-foreground/40"

export function AppearanceMenuSection() {
  const { theme, setTheme } = useTheme()
  const { config, setConfig } = useDesignSystem()

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="pb-1.5">Appearance</DropdownMenuLabel>

      <DropdownMenuRadioGroup
        /* Undefined until next-themes has read storage. The menu only ever
           renders after a click, by which point it has. */
        value={theme ?? "system"}
        onValueChange={(next) => setTheme(String(next))}
        className="grid grid-cols-3 gap-1.5 px-1.5"
      >
        {MODES.map((mode) => (
          <DropdownMenuRadioItem
            key={mode.value}
            value={mode.value}
            indicator={false}
            className={tileClass}
          >
            <mode.icon className="size-4" aria-hidden />
            {mode.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>

      <DropdownMenuLabel className="pt-3 pb-1.5">Accent color</DropdownMenuLabel>

      <DropdownMenuRadioGroup
        value={config.accent}
        onValueChange={(next) => setConfig({ accent: String(next) })}
        className="grid grid-cols-9 gap-x-1 gap-y-2.5 px-2.5 pt-0.5 pb-1.5"
      >
        {MENU_ACCENTS.map((accent) => (
          <DropdownMenuRadioItem
            key={accent.name}
            value={accent.name}
            indicator={false}
            aria-label={accent.label}
            label={accent.label}
            className={cn(swatchClass, accent.name === "neutral" && "border border-border")}
            style={{ backgroundColor: accent.swatch }}
          />
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  )
}
