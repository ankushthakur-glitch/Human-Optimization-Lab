"use client"

import * as React from "react"
import { IconCheck, IconPalette, IconRefresh } from "@/design-system/icons"
import { useTheme } from "next-themes"

import { BASE_PALETTES, RADIUS_OPTIONS } from "@/design-system/tokens/themes"
import { ALL_ACCENT_THEMES } from "@/design-system/tokens/accents"
import { BODY_FONTS, HEADING_FONTS } from "@/design-system/tokens/fonts"
import { cn } from "@/lib/utils"
import { useDesignSystem } from "@/design-system/providers/design-system-provider"
import { Button } from "@/design-system/ui/button"
import { Label } from "@/design-system/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/ui/popover"
import { ScrollArea } from "@/design-system/ui/scroll-area"
import { Separator } from "@/design-system/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/ui/tooltip"

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Label className="text-xs font-semibold">{label}</Label>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Swatch({
  active,
  color,
  title,
  onClick,
}: {
  active: boolean
  color: string
  title: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={title}
            aria-pressed={active}
            onClick={onClick}
            className={cn(
              "relative flex size-7 items-center justify-center rounded-full border transition-transform hover:scale-110",
              active ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "border-border"
            )}
            style={{ backgroundColor: color }}
          >
            {active && <IconCheck className="size-3.5 text-white mix-blend-difference" />}
          </button>
        }
      />
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
        active
          ? "border-primary bg-primary-surface font-medium text-foreground"
          : "border-border text-muted-foreground hover:bg-surface-hover"
      )}
    >
      {children}
    </button>
  )
}

export function ThemeCustomizer() {
  const { config, setConfig, reset } = useDesignSystem()
  const { theme, setTheme } = useTheme()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <IconPalette /> Customize
          </Button>
        }
      />
      <PopoverContent align="end" className="w-90 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Theme</p>
            <p className="text-[11px] text-muted-foreground">
              Applies live across every component.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Reset to defaults" onClick={reset}>
            <IconRefresh />
          </Button>
        </div>
        <Separator />

        <ScrollArea className="h-[26rem]">
          <div className="flex flex-col gap-5 p-4">
            <Group label="Mode">
              <div className="grid grid-cols-3 gap-2">
                {["light", "dark", "system"].map((m) => (
                  <OptionButton key={m} active={theme === m} onClick={() => setTheme(m)}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </OptionButton>
                ))}
              </div>
            </Group>

            <Group label="Accent color" hint="Drives primary, accent, and chart series.">
              <div className="flex flex-wrap gap-2">
                {ALL_ACCENT_THEMES.map((t) => (
                  <Swatch
                    key={t.name}
                    active={config.accent === t.name}
                    color={t.swatch}
                    title={t.label}
                    onClick={() => setConfig({ accent: t.name })}
                  />
                ))}
              </div>
            </Group>

            <Group label="Base palette" hint="Surfaces, borders, and body text neutrals.">
              <div className="grid grid-cols-2 gap-2">
                {BASE_PALETTES.map((b) => (
                  <OptionButton
                    key={b.name}
                    active={config.base === b.name}
                    onClick={() => setConfig({ base: b.name })}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full border"
                        style={{ backgroundColor: b.swatch }}
                      />
                      {b.label}
                    </span>
                  </OptionButton>
                ))}
              </div>
            </Group>

            <Group label="Body font">
              <div className="grid gap-1.5">
                {BODY_FONTS.map((f) => (
                  <OptionButton
                    key={f.name}
                    active={config.font === f.name}
                    onClick={() => setConfig({ font: f.name })}
                  >
                    <span className="flex flex-col">
                      <span className="text-xs font-medium">{f.label}</span>
                      <span className="text-[10px] text-muted-foreground">{f.note}</span>
                    </span>
                  </OptionButton>
                ))}
              </div>
            </Group>

            <Group label="Heading font">
              <div className="grid grid-cols-2 gap-1.5">
                {HEADING_FONTS.map((f) => (
                  <OptionButton
                    key={f.name}
                    active={config.heading === f.name}
                    onClick={() => setConfig({ heading: f.name })}
                  >
                    {f.label}
                  </OptionButton>
                ))}
              </div>
            </Group>

            <Group label="Icon stroke" hint="Hugeicons, stroke rounded. Regular is the default.">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "light", label: "Light" },
                  { name: "regular", label: "Regular" },
                  { name: "bold", label: "Bold" },
                ].map((s) => (
                  <OptionButton
                    key={s.name}
                    active={config.iconStroke === s.name}
                    onClick={() => setConfig({ iconStroke: s.name })}
                  >
                    {s.label}
                  </OptionButton>
                ))}
              </div>
            </Group>

            <Group label="Radius">
              <div className="grid grid-cols-5 gap-1.5">
                {RADIUS_OPTIONS.map((r) => (
                  <OptionButton
                    key={r.name}
                    active={config.radius === r.name}
                    onClick={() => setConfig({ radius: r.name })}
                  >
                    {r.name === "default" ? "Def." : r.name[0].toUpperCase() + r.name.slice(1, 3)}
                  </OptionButton>
                ))}
              </div>
            </Group>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
