"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { useMounted } from "@/hooks/use-mounted"

/**
 * Figma-prototype behaviour for the running app: a click that lands on dead
 * space flashes the things that actually take you somewhere. Clients walking a
 * flow on their own get the same "where can I go from here?" answer they get in
 * a Figma share link, without anyone having to narrate it for them.
 *
 * The flash is drawn as a throwaway overlay of absolutely positioned washes,
 * never as styling on the elements themselves: nothing in the page is mutated,
 * so a highlight can never disturb layout, focus or a component's own ring.
 */

// What a hotspot is: something that opens a screen, a modal, a menu or a panel.
// Controls that only rearrange what is already in front of you — sort headers,
// filter checkboxes, a badge that explains itself on hover — are deliberately
// left out, because lighting them up promises a door that is not there.
const ROUTE_SELECTOR = [
  // Every route in this app is a Link. Phone and mail hand off to the OS rather
  // than move the prototype on, so they are not part of the flow.
  "a[href]:not([href^='tel:']):not([href^='mailto:']):not([href^='#'])",
  // Menus, popovers, selects and comboboxes announce what they open.
  "[aria-haspopup]:not([aria-haspopup='false'])",
  "[aria-expanded]",
  "[role='tab']",
  "[role='menuitem']",
  "[role='menuitemcheckbox']",
  "[role='menuitemradio']",
  "[role='option']",
  "summary",
  // Tooltips are the one trigger that opens nothing you can act on.
  "[data-slot$='-trigger']:not([data-slot='tooltip-trigger'])",
  // A dialog's own footer and close button are how the client gets back out.
  "[data-slot$='-close']",
  "[data-slot='dialog-footer'] button",
  "[data-slot='sheet-footer'] button",
  // Opt-in for the buttons that open a dialog from their own state, which no
  // attribute in the markup would otherwise give away.
  "[data-hotspot]",
].join(",")

// Anything that visibly answers a click, hotspot or not. Used only to decide
// whether the click was aimed at something — sorting a column is not a route
// through the flow, but it is not dead space either.
const ACTIONABLE_SELECTOR = [
  ROUTE_SELECTOR,
  "a[href]",
  "button",
  "select",
  "textarea",
  "input:not([type='hidden'])",
  "label[for]",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='combobox']",
  "[role='slider']",
  "[contenteditable='true']",
  // A dialog or sheet backdrop closes on click, so it answers too.
  "[data-slot$='-overlay']",
].join(",")

// Gestures the overlay stays out of entirely: the review layer is tooling
// rather than product, so a click on it is neither a hotspot nor blank space.
const IGNORED_SELECTOR = ".dcc,[data-hotspot-ignore]"

// Focusable, but nothing happens on click. A chart takes tabindex so keyboard
// users can reach it and a tooltip trigger is a button only so it can be
// focused — aiming at either is the client asking "what can I do here?", so
// both count as dead space.
const PASSIVE_SELECTOR = ".recharts-wrapper,[data-slot='tooltip-trigger']"

// A hotspot that is switched off is not a route through the flow, so it stays
// dark rather than promising something the click will not deliver.
const DISABLED_SELECTOR = ":disabled,[aria-disabled='true'],[data-disabled]"

// Subtrees the overlay never reads: a modal's background is left both inert and
// aria-hidden while it is open.
const EXCLUDED_SELECTOR = `[inert],[aria-hidden='true'],${IGNORED_SELECTOR},${PASSIVE_SELECTOR}`

// When the click happens inside a dialog, menu or popover, only that layer is
// reachable — highlighting the page behind it would point at doors the client
// cannot open until they close what is in front of them.
const LAYER_SELECTOR = [
  "[role='dialog']",
  "[role='alertdialog']",
  "[role='menu']",
  "[role='listbox']",
  "[data-slot='dialog-content']",
  "[data-slot='sheet-content']",
  "[data-slot='popover-content']",
].join(",")

const MAX_MARKS = 300
const MIN_SIDE = 8
const FLASH_MS = 700

type Box = { top: number; left: number; right: number; bottom: number }

type Mark = {
  key: string
  box: Box
  radius: string
}

/**
 * The element's rect after every clipping ancestor and the viewport have had
 * their say — a row scrolled out of a table's own scroller has a perfectly good
 * bounding rect, and highlighting it would smear a wash across the header.
 */
function visibleBox(el: Element, clips: Map<Element, DOMRect | null>): Box | null {
  const rect = el.getBoundingClientRect()
  const box: Box = { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom }

  for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    let clip = clips.get(parent)
    if (clip === undefined) {
      const style = getComputedStyle(parent)
      const scrolls = style.overflowX !== "visible" || style.overflowY !== "visible"
      clip = scrolls ? parent.getBoundingClientRect() : null
      clips.set(parent, clip)
    }
    if (!clip) continue
    box.top = Math.max(box.top, clip.top)
    box.left = Math.max(box.left, clip.left)
    box.right = Math.min(box.right, clip.right)
    box.bottom = Math.min(box.bottom, clip.bottom)
  }

  box.top = Math.max(box.top, 0)
  box.left = Math.max(box.left, 0)
  box.right = Math.min(box.right, window.innerWidth)
  box.bottom = Math.min(box.bottom, window.innerHeight)

  if (box.right - box.left < MIN_SIDE || box.bottom - box.top < MIN_SIDE) return null
  return box
}

function isVisible(el: Element) {
  const check = (el as Element & { checkVisibility?: (options?: object) => boolean }).checkVisibility
  if (typeof check !== "function") return true
  return check.call(el, {
    opacityProperty: true,
    visibilityProperty: true,
    contentVisibilityAuto: true,
  })
}

function collect(root: ParentNode, flash: number): Mark[] {
  const clips = new Map<Element, DOMRect | null>()
  const seen = new Set<string>()
  const marks: Mark[] = []

  for (const el of root.querySelectorAll(ROUTE_SELECTOR)) {
    if (marks.length >= MAX_MARKS) break
    if (el.matches(DISABLED_SELECTOR) || el.closest(EXCLUDED_SELECTOR)) continue
    if (!isVisible(el)) continue

    const box = visibleBox(el, clips)
    if (!box) continue

    // A link wrapping a button is marked once, not twice on the same box.
    const key = `${Math.round(box.top)}:${Math.round(box.left)}:${Math.round(box.right)}:${Math.round(box.bottom)}`
    if (seen.has(key)) continue
    seen.add(key)

    const style = getComputedStyle(el)

    marks.push({
      key: `${flash}-${key}`,
      box,
      radius: style.borderRadius === "0px" ? "5px" : style.borderRadius,
    })
  }

  return marks
}

export function PrototypeHotspots() {
  const [marks, setMarks] = React.useState<Mark[] | null>(null)
  const mounted = useMounted()

  React.useEffect(() => {
    let flash = 0

    // Capture phase, so a component that stops propagation on its own container
    // cannot swallow the gesture before we see where it landed.
    function onClick(event: MouseEvent) {
      // `detail` is 0 for clicks dispatched from code or from the keyboard;
      // those are not someone poking at the screen looking for a way forward.
      if (event.button !== 0 || event.detail === 0) return

      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(IGNORED_SELECTOR)) return

      // Blank space is anywhere the click gets no answer of its own: nothing
      // actionable underneath, or something focusable that does nothing.
      const hit = target.closest(ACTIONABLE_SELECTOR)
      if (hit && (hit.matches(ROUTE_SELECTOR) || !hit.closest(PASSIVE_SELECTOR))) return
      // Finishing a text selection lands on blank space too, and answering that
      // with a screen-wide flash feels like a misfire.
      if (window.getSelection()?.toString().trim()) return

      const found = collect(target.closest(LAYER_SELECTOR) ?? document.body, ++flash)
      if (found.length) setMarks(found)
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  React.useEffect(() => {
    if (!marks) return

    const clear = () => setMarks(null)
    const timer = window.setTimeout(clear, FLASH_MS + 100)
    // The marks are a snapshot of where things were. The moment the page moves
    // or the layer changes underneath them they are lying, so they go.
    window.addEventListener("scroll", clear, true)
    window.addEventListener("resize", clear)
    window.addEventListener("keydown", clear)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("scroll", clear, true)
      window.removeEventListener("resize", clear)
      window.removeEventListener("keydown", clear)
    }
  }, [marks])

  if (!mounted || !marks) return null

  return createPortal(
    <div className="hotspot-layer" aria-hidden>
      {marks.map((mark) => (
        <span
          key={mark.key}
          className="hotspot-mark"
          style={{
            top: mark.box.top,
            left: mark.box.left,
            width: mark.box.right - mark.box.left,
            height: mark.box.bottom - mark.box.top,
            borderRadius: mark.radius,
          }}
        />
      ))}
    </div>,
    document.body
  )
}
