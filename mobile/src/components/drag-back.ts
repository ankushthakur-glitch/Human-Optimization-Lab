import { useNavigation } from "expo-router"
import * as React from "react"
import { Platform } from "react-native"

type Animation = "none" | "slide_from_bottom"

type Nav = {
  setOptions: (options: { animation: Animation | "default" }) => void
  dispatch: (action: unknown) => void
  addListener: (
    event: "transitionStart" | "transitionEnd" | "gestureCancel" | "beforeRemove",
    listener: (e: { data: { closing?: boolean; action?: { type: string } }; preventDefault: () => void }) => void,
  ) => () => void
}

/** Going back, the screen leaves the way it came in. */
const LEAVING = new Set(["GO_BACK", "POP", "POP_TO", "POP_TO_TOP"])

/** For a screen that opens with its own animation (the tabs over home with
    none, the assistant rising from the bottom): on iOS a screen like that
    is not dragged by the left edge swipe, it just vanishes once the swipe
    starts. So once it is open it takes the native slide, which follows the
    finger, and a back in code (the Home tab, a close button) puts its own
    animation back first, so it still leaves the way it came. */
export function useDragBack(openWith: Animation, on = true) {
  const navigation = useNavigation() as unknown as Nav
  React.useEffect(() => {
    if (Platform.OS !== "ios" || !on) return
    // The swipe has already begun to take it away by the time the stack
    // hears of it; only a back in code is held for the animation swap.
    let swiping = false
    let letGo = false
    const off = [
      navigation.addListener("transitionStart", (e) => {
        if (e.data.closing) swiping = true
      }),
      navigation.addListener("transitionEnd", (e) => {
        if (e.data.closing) return
        swiping = false
        navigation.setOptions({ animation: "default" })
      }),
      navigation.addListener("gestureCancel", () => {
        swiping = false
      }),
      navigation.addListener("beforeRemove", (e) => {
        const action = e.data.action
        if (swiping || letGo || !action || !LEAVING.has(action.type)) return
        e.preventDefault()
        letGo = true
        navigation.setOptions({ animation: openWith })
        // Two frames: the old animation has to reach the native screen
        // before it is taken off.
        requestAnimationFrame(() => requestAnimationFrame(() => navigation.dispatch(action)))
      }),
    ]
    return () => off.forEach((stop) => stop())
  }, [navigation, openWith, on])
}
