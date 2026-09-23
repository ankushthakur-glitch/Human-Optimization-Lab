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

import { useMounted } from "@/hooks/use-mounted"

function VoiceBeam({ theme, ...props }: VoiceBeamPrimitiveProps) {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()

  // The beam's own `auto` follows prefers-color-scheme, which can disagree with
  // an explicitly chosen app theme — so resolve from next-themes instead.
  // next-themes knows the theme on the first client render but the server does
  // not, so hold the beam's dark default until hydration is done.
  const beamTheme =
    theme ?? (mounted && resolvedTheme === "light" ? "light" : "dark")

  return <VoiceBeamPrimitive data-slot="voice-beam" theme={beamTheme} {...props} />
}

export { VoiceBeam, useMicrophone }
export type { VoiceBeamColorVariant, VoiceBeamLevel, VoiceBeamType }
export type VoiceBeamProps = VoiceBeamPrimitiveProps
