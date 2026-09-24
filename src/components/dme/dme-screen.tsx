"use client"

import * as React from "react"

import { EhrShellOverride, type EhrShellFrame } from "@/components/ehr-shell"
import { PatientsWorklist } from "@/components/patients-worklist"
import { DmeSideFrame, DmeTopFrame } from "@/components/dme/dme-frames"
import { useDmeAccent } from "@/components/dme/use-dme-accent"

const SIDE: EhrShellFrame = (props) => <DmeSideFrame {...props} />
const TOP: EhrShellFrame = (props) => <DmeTopFrame {...props} />

/** The patients worklist in one of the two DME frames. */
export function DmeScreen({ layout }: { layout: "side" | "top" }) {
  useDmeAccent()

  // The worklist links into the original product; the demo stays on this screen.
  const stayOnScreen = (event: React.MouseEvent) => {
    const href = (event.target as HTMLElement).closest("a")?.getAttribute("href")
    if (href?.startsWith("/") && !href.startsWith("/dme")) event.preventDefault()
  }

  return (
    <EhrShellOverride.Provider value={layout === "side" ? SIDE : TOP}>
      <div className="contents" onClickCapture={stayOnScreen}>
        <PatientsWorklist />
      </div>
    </EhrShellOverride.Provider>
  )
}
