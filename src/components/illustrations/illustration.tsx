"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ILLUSTRATIONS, type IllustrationName } from "./art.generated"

/* The empty-state art, inlined rather than loaded through <img>: CSS custom
   properties do not cross into an image document, and the --il-* tokens in
   globals.css are what make it follow the accent and dark mode. Each render
   gets its own id suffix so two on one page never share a mask or filter. */
export function Illustration({
  name,
  className,
}: {
  name: IllustrationName
  className?: string
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  return (
    <span
      aria-hidden
      data-slot="illustration"
      className={cn("block size-36 [&>svg]:size-full", className)}
      dangerouslySetInnerHTML={{
        __html: ILLUSTRATIONS[name]
          .replaceAll("__UID__", uid)
          // A size- class keeps host styles (Button sizes bare svgs to 16px) off it.
          .replace("<svg ", '<svg class="block size-full" '),
      }}
    />
  )
}

export type { IllustrationName }
