"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  BorderBeam as BorderBeamPrimitive,
  type BorderBeamColorVariant,
  type BorderBeamProps as BorderBeamPrimitiveProps,
  type BorderBeamSize,
} from "border-beam"

// The pulse presets ship their own `prefers-reduced-motion` block; the rotate
// presets leave that to the consumer, so we pause them here instead.
const ROTATE_SIZES = new Set<BorderBeamSize>(["sm", "md", "line"])

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setPrefersReducedMotion(mql.matches)
    mql.addEventListener("change", onChange)
    setPrefersReducedMotion(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return prefersReducedMotion
}

/* Which radius the customizer is on. The value itself is not useful here —
   it is a change signal, telling the beam to measure its child again. */
function useRadiusToken() {
  const [token, setToken] = React.useState<string | null>(null)

  React.useEffect(() => {
    const el = document.documentElement
    const read = () => setToken(el.getAttribute("data-radius"))
    read()
    const observer = new MutationObserver(read)
    observer.observe(el, { attributes: true, attributeFilter: ["data-radius"] })
    return () => observer.disconnect()
  }, [])

  return token
}

function BorderBeam({
  size = "md",
  theme,
  active = true,
  borderRadius,
  ...props
}: BorderBeamPrimitiveProps) {
  const { resolvedTheme } = useTheme()
  const prefersReducedMotion = usePrefersReducedMotion()
  const radiusToken = useRadiusToken()
  const ref = React.useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = React.useState<number | null>(null)

  /* The primitive detects its child's corner itself, but it keeps the reading
     only when it is above zero (`!isNaN(p) && p > 0`) and otherwise falls back
     to a 16px size preset — so under `radius: none` the beam traces a rounded
     corner around a square card, and it never re-measures after mount either.
     Measuring here keeps 0 as a real answer and repeats on a token change; the
     primitive stands aside as soon as it is handed an explicit radius. */
  React.useEffect(() => {
    if (borderRadius != null) return
    // `firstElementChild` is typed Element, which has no transition events.
    const child = ref.current?.firstElementChild
    if (!(child instanceof HTMLElement)) return

    const measure = () => {
      const px = parseFloat(getComputedStyle(child).borderTopLeftRadius)
      if (!Number.isNaN(px)) setMeasured(px)
    }
    measure()

    /* A child that animates its corner — Button carries `transition-all` —
       reports the frame it is on rather than the one it is heading for, so
       that first read lands mid-flight. Take it again once it arrives. */
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName.includes("radius")) measure()
    }
    child.addEventListener("transitionend", onTransitionEnd)
    return () => child.removeEventListener("transitionend", onTransitionEnd)
  }, [borderRadius, radiusToken, size])

  // `resolvedTheme` is undefined until next-themes hydrates, and the beam
  // defaults to dark anyway — so both renders agree and hydration stays quiet.
  const beamTheme = theme ?? (resolvedTheme === "light" ? "light" : "dark")
  const shouldAnimate =
    active && !(prefersReducedMotion && ROTATE_SIZES.has(size))

  return (
    <BorderBeamPrimitive
      ref={ref}
      data-slot="border-beam"
      size={size}
      theme={beamTheme}
      active={shouldAnimate}
      // Undefined on the first pass only, while the primitive's own detection
      // covers the frame before the measurement lands.
      borderRadius={borderRadius ?? measured ?? undefined}
      {...props}
    />
  )
}

export { BorderBeam }
export type { BorderBeamColorVariant, BorderBeamSize }
export type BorderBeamProps = BorderBeamPrimitiveProps
