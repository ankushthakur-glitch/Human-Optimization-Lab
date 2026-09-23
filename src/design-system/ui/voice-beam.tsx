"use client"

import { useTheme } from "next-themes"
import {
  VoiceBeam as VoiceBeamPrimitive,
  useMicrophone,
  type VoiceBeamColorVariant,
  type VoiceBeamLevel,
  type VoiceBeamProps as VoiceBeamPrimitiveProps,
  type VoiceBeamType,
} from "voice-glow"

function VoiceBeam({ theme, ...props }: VoiceBeamPrimitiveProps) {
  const { resolvedTheme } = useTheme()

  // The beam's own `auto` follows prefers-color-scheme, which can disagree with
  // an explicitly chosen app theme — so resolve from next-themes instead.
  // `resolvedTheme` is undefined on the server and on the first client render,
  // and the beam defaults to dark anyway, so hydration stays consistent.
  const beamTheme = theme ?? (resolvedTheme === "light" ? "light" : "dark")

  return <VoiceBeamPrimitive data-slot="voice-beam" theme={beamTheme} {...props} />
}

export { VoiceBeam, useMicrophone }
export type { VoiceBeamColorVariant, VoiceBeamLevel, VoiceBeamType }
export type VoiceBeamProps = VoiceBeamPrimitiveProps
