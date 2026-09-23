import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SCRATCH = path.join(PROJECT, "scripts", ".cache")
fs.mkdirSync(SCRATCH, { recursive: true })

const DIST = path.join(PROJECT, "node_modules/@hugeicons/core-free-icons/dist/esm")

const available = new Set(
  fs
    .readdirSync(DIST)
    .filter((f) => f.endsWith(".js") && !f.endsWith(".map"))
    .map((f) => f.replace(/\.js$/, ""))
)

// slug -> candidates, most apt first. Each icon should read as the thing itself.
const MAP = {
  // Actions
  button: ["MouseLeftClick01Icon", "Cursor01Icon"],
  "button-group": ["RectangleHorizontalIcon", "Menu05Icon"],
  toggle: ["ToggleOffIcon", "ToggleLeftIcon"],
  "toggle-group": ["TableCellsMergeIcon", "ToggleRightIcon"],
  kbd: ["KeyboardIcon"],

  // Form controls
  field: ["FormsIcon", "Note01Icon", "Book01Icon"],
  label: ["Tag01Icon"],
  input: ["TextFieldIcon", "ResizeFieldRectangleIcon", "RectangleHorizontalIcon"],
  "input-group": ["TableCellsSplitIcon", "ResizeFieldIcon"],
  "input-otp": ["SquareLock01Icon", "LockPasswordIcon", "SecurityLockIcon", "CircleLock01Icon"],
  textarea: ["LeftToRightBlockQuoteIcon", "Note02Icon", "Note01Icon"],
  select: ["DropdownFieldTypeIcon", "ArrowDown01Icon"],
  "native-select": ["ArrowDown01Icon", "DropdownFieldTypeIcon"],
  combobox: ["SearchList01Icon", "Search02Icon", "Search01Icon"],
  checkbox: ["CheckmarkSquare01Icon"],
  "radio-group": ["RadioButtonIcon", "RadioIcon"],
  switch: ["ToggleOnIcon"],
  slider: ["SlidersHorizontalIcon"],
  calendar: ["Calendar01Icon"],

  // Layout
  card: ["RectangleVerticalIcon", "Square01Icon"],
  item: ["LeftToRightListBulletIcon", "BulletIcon"],
  separator: ["LineIcon", "MinusIcon"],
  "aspect-ratio": ["AspectRatioIcon"],
  "scroll-area": ["MouseScroll01Icon", "MouseScroll02Icon"],
  resizable: ["HorizontalResizeIcon", "Resize01Icon"],
  collapsible: ["CollapseIcon", "ListCollapseIcon"],
  accordion: ["ListCollapseIcon", "MenuCollapseIcon"],
  tabs: ["Folder01Icon", "Layout02Icon"],

  // Data display
  table: ["Table01Icon"],
  chart: ["BarChartIcon", "Chart01Icon"],
  avatar: ["UserCircleIcon"],
  badge: ["Tag02Icon"],
  progress: ["BarChartHorizontalIcon", "Loading01Icon"],
  skeleton: ["Layout03Icon", "Layout01Icon"],
  empty: ["InboxIcon", "FolderOpenIcon"],
  carousel: ["CarouselHorizontalIcon"],

  // Navigation
  breadcrumb: ["Link02Icon", "Link01Icon"],
  pagination: ["RectangleEllipsisIcon", "MoreHorizontalIcon"],
  "navigation-menu": ["Menu01Icon"],
  menubar: ["MenuSquareIcon", "Menu02Icon"],
  command: ["CommandIcon"],

  // Overlays
  dialog: ["Layers01Icon", "WindowsNewIcon", "Square01Icon"],
  "alert-dialog": ["AlertSquareIcon", "AlertDiamondIcon"],
  sheet: ["SidebarRightIcon"],
  drawer: ["SidebarBottomIcon"],
  popover: ["Message02Icon", "Message01Icon"],
  "hover-card": ["Cursor02Icon", "Cursor01Icon"],
  tooltip: ["InformationCircleIcon"],
  "dropdown-menu": ["Menu03Icon", "ArrowDown01Icon"],
  "context-menu": ["MouseRightClick01Icon", "Mouse02Icon"],

  // Feedback
  alert: ["Alert01Icon", "AlertCircleIcon"],
  sonner: ["Notification01Icon"],
  toast: ["Notification03Icon", "Notification02Icon"],
  spinner: ["Loading03Icon"],
  marker: ["HighlighterIcon"],
  "border-beam": ["SparklesIcon", "FlashIcon", "Stars02Icon", "MagicWand01Icon"],

  // Conversational
  attachment: ["Attachment01Icon", "AttachmentIcon"],
  bubble: ["BubbleChatIcon", "Chat01Icon"],
  questionnaire: ["ChatQuestionIcon", "BubbleChatQuestionIcon", "HelpCircleIcon"],
  "thinking-orb": ["AiBrain01Icon", "Atom01Icon", "AiBrain04Icon"],
  "voice-beam": ["AudioWave01Icon", "VoiceIcon", "Mic01Icon"],
  // Agent UI
  "loading-state": ["Loading01Icon", "Loading02Icon"],
  thinking: ["BrainIcon", "AiBrain02Icon"],
  "streaming-text": ["TypeCursorIcon", "TextIcon"],
  "tool-chips": ["Wrench01Icon", "ToolsIcon"],
  "task-rows": ["CheckListIcon", "TaskDone01Icon"],
  "approval-card": ["CheckmarkBadge01Icon", "ShieldKeyIcon"],
  "prompt-bar": ["SentIcon", "PromptIcon"],
  chat: ["Chatting01Icon", "Chat01Icon"],
  "agent-screen": ["RoboticIcon", "ComputerIcon"],

  // Agent data
  "recommendation-card": ["Idea01Icon", "Bulb01Icon"],
  "context-cards": ["FolderLibraryIcon", "Folder02Icon"],
  "insight-cards": ["AnalyticsUpIcon", "ChartLineData02Icon"],
  "fine-tune-card": ["SlidersVerticalIcon", "Settings02Icon"],
  "code-block": ["SourceCodeIcon", "CodeIcon"],
  search: ["Search01Icon", "Search02Icon"],
  "selection-actions": ["CursorMagicSelection01Icon", "SelectAllIcon"],
}

const resolved = {}
const unresolved = []
for (const [slug, candidates] of Object.entries(MAP)) {
  const hit = candidates.find((c) => available.has(c))
  if (hit) resolved[slug] = hit
  else unresolved.push({ slug, candidates })
}

// Guard against two components sharing an icon — the whole point is distinguishability.
const byIcon = {}
for (const [slug, icon] of Object.entries(resolved)) {
  ;(byIcon[icon] ??= []).push(slug)
}
const dupes = Object.entries(byIcon).filter(([, slugs]) => slugs.length > 1)

console.error(`resolved ${Object.keys(resolved).length}/${Object.keys(MAP).length}`)
if (unresolved.length) console.error("UNRESOLVED:", JSON.stringify(unresolved, null, 1))
if (dupes.length) console.error("DUPLICATES:", JSON.stringify(dupes))

if (unresolved.length || dupes.length) {
  process.exit(1)
}

const icons = [...new Set(Object.values(resolved))].sort()
const file = `// Generated by scripts/gen-component-icons — do not edit by hand.
// One distinct icon per component so the index and sidebar read visually.
import type { HugeiconsIconProps } from "@hugeicons/react"
import {
${icons.map((i) => `  ${i},`).join("\n")}
} from "@hugeicons/core-free-icons"

type IconData = HugeiconsIconProps["icon"]

export const COMPONENT_ICONS: Record<string, IconData> = {
${Object.entries(resolved)
  .map(([slug, icon]) => `  "${slug}": ${icon},`)
  .join("\n")}
}
`

fs.writeFileSync(`${PROJECT}/src/design-system/component-icons.ts`, file)
console.error(`wrote components/component-icons.ts — ${icons.length} distinct icons`)
