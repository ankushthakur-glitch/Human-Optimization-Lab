import type { Metadata } from "next"
import { Suspense } from "react"

import { TasksScreen } from "@/components/provider/tasks/tasks"
import { LogoLoader } from "@/design-system/ui/logo-loader"

export const metadata: Metadata = { title: "Tasks" }

/* The screen reads ?new=1 (the palette's shortcut), and a component that
   reads search params needs a Suspense boundary to prerender. */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <LogoLoader kind="ripple" label="Loading tasks" />
        </div>
      }
    >
      <TasksScreen />
    </Suspense>
  )
}
