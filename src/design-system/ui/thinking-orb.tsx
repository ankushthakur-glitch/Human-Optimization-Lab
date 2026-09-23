"use client"

import {
  ThinkingOrb as ThinkingOrbPrimitive,
  type OrbSize,
  type OrbState,
  type OrbTheme,
  type ThinkingOrbProps,
} from "thinking-orbs"

// `theme="auto"` already resolves from a `dark`/`light` class on an ancestor —
// the convention next-themes sets here — so no bridging is needed, and the orb
// paints a single static frame under `prefers-reduced-motion` on its own.
function ThinkingOrb(props: ThinkingOrbProps) {
  return <ThinkingOrbPrimitive data-slot="thinking-orb" {...props} />
}

export { ThinkingOrb }
export type { OrbSize, OrbState, OrbTheme, ThinkingOrbProps }
