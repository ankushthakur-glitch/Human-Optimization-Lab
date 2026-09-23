import * as React from "react"

const subscribe = () => () => {}

/**
 * False on the server and during hydration, true once the client has taken
 * over. Use it to gate output that can only be known in the browser, so the
 * first client render still matches the server HTML.
 */
export function useMounted() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
