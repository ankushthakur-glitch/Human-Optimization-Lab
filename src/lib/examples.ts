export type ExampleItem = {
  slug: string
  title: string
  /** One-line summary shown under the page title. */
  description: string
  /** When to reach for it in this product. */
  guidance: string
  /** Slug on ui.shadcn.com/docs/components; omit when there is no upstream page. */
  docs?: string
}

export type ExampleGroup = {
  name: string
  items: ExampleItem[]
}

export const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    name: "Actions",
    items: [
      {
        slug: "button",
        title: "Button",
        description: "Triggers an action or navigates. Six variants across five sizes.",
        guidance:
          "One primary button per view — the single most likely next action. Everything else is outline or ghost. Use destructive only for actions that lose clinical data.",
        docs: "button",
      },
      {
        slug: "button-group",
        title: "Button Group",
        description: "Joins related buttons into a single segmented control.",
        guidance:
          "Good for mutually exclusive view switches like comfortable/compact density or table/card layout. Not a replacement for tabs — it switches presentation, not content.",
        docs: "button-group",
      },
      {
        slug: "toggle",
        title: "Toggle",
        description: "A two-state button that stays pressed.",
        guidance:
          "Use for a binary view option applied immediately, such as pinning a patient banner. If the state needs a label, prefer Switch.",
        docs: "toggle",
      },
      {
        slug: "toggle-group",
        title: "Toggle Group",
        description: "A set of toggles supporting single or multiple selection.",
        guidance:
          "Use for quick filters that sit inline above a worklist — for example filtering encounters by care setting.",
        docs: "toggle-group",
      },
      {
        slug: "kbd",
        title: "Kbd",
        description: "Renders a keyboard key.",
        guidance:
          "Surface shortcuts wherever clinicians repeat an action — command palette, save, and sign. Keyboard use is a major speed factor in charting.",
        docs: "kbd",
      },
    ],
  },
  {
    name: "Form controls",
    items: [
      {
        slug: "field",
        title: "Field",
        description: "The label, control, description, and error wrapper for every input.",
        guidance:
          "This replaces the old Form component in this style. Wrap every input in a Field so labels, help text, and validation stay consistent and accessible.",
        docs: "field",
      },
      {
        slug: "label",
        title: "Label",
        description: "An accessible caption bound to a control.",
        guidance:
          "Never rely on placeholder text as a label — it disappears on focus and fails accessibility checks.",
        docs: "label",
      },
      {
        slug: "input",
        title: "Input",
        description: "Single-line text entry.",
        guidance:
          "Set the right type and inputMode for clinical data so mobile keyboards match — numeric for vitals, tel for phone.",
        docs: "input",
      },
      {
        slug: "input-group",
        title: "Input Group",
        description: "An input with attached icons, prefixes, suffixes, or buttons.",
        guidance:
          "Use for units that never change — mg, mmHg, kg — and for search fields with a leading icon.",
        docs: "input-group",
      },
      {
        slug: "input-otp",
        title: "Input OTP",
        description: "Fixed-length one-time-code entry.",
        guidance:
          "Used for step-up authentication before high-risk actions like e-prescribing controlled substances.",
        docs: "input-otp",
      },
      {
        slug: "textarea",
        title: "Textarea",
        description: "Multi-line text entry.",
        guidance:
          "The workhorse for clinical narrative. Give it generous height — a four-row box for a SOAP note invites truncated documentation.",
        docs: "textarea",
      },
      {
        slug: "select",
        title: "Select",
        description: "A styled dropdown for choosing one option from a short list.",
        guidance:
          "Best under about fifteen options. Past that, use Combobox so the list can be searched.",
        docs: "select",
      },
      {
        slug: "native-select",
        title: "Native Select",
        description: "The browser's own select element, styled to match.",
        guidance:
          "Prefer this on mobile and inside dense table rows, where the native picker is faster and more reliable.",
        docs: "native-select",
      },
      {
        slug: "combobox",
        title: "Combobox",
        description: "A searchable select with autocomplete.",
        guidance:
          "The right control for long coded vocabularies — ICD-10 diagnoses, medications, providers, facilities.",
        docs: "combobox",
      },
      {
        slug: "checkbox",
        title: "Checkbox",
        description: "A binary choice, or one of many in a set.",
        guidance:
          "Use for multi-select in tables and for attestations. Supports an indeterminate state for partially selected groups.",
        docs: "checkbox",
      },
      {
        slug: "radio-group",
        title: "Radio Group",
        description: "One choice from a small visible set.",
        guidance:
          "Use when seeing all options matters — acuity, laterality, consent status. Always preselect a safe default or none at all.",
        docs: "radio-group",
      },
      {
        slug: "switch",
        title: "Switch",
        description: "An immediate on/off control.",
        guidance:
          "Use only when the change applies instantly. If it needs a save step, use a Checkbox instead.",
        docs: "switch",
      },
      {
        slug: "slider",
        title: "Slider",
        description: "Selects a value or range along a track.",
        guidance:
          "Good for bounded clinical scales such as pain 0–10. Pair with a numeric readout — a slider alone is imprecise.",
        docs: "slider",
      },
      {
        slug: "calendar",
        title: "Calendar",
        description: "Date and date-range picking.",
        guidance:
          "Compose with Popover to build a date picker. For dates of birth, allow typed entry too — scrolling back decades is slow.",
        docs: "calendar",
      },
    ],
  },
  {
    name: "Layout",
    items: [
      {
        slug: "card",
        title: "Card",
        description: "A titled surface grouping related content.",
        guidance:
          "The default container for a chart section — vitals, allergies, problem list. Avoid nesting cards inside cards.",
        docs: "card",
      },
      {
        slug: "item",
        title: "Item",
        description: "A single row of content with media, text, and actions.",
        guidance:
          "Use for list rows that are not tabular — care team members, attached documents, recent activity.",
        docs: "item",
      },
      {
        slug: "separator",
        title: "Separator",
        description: "A horizontal or vertical divider.",
        guidance:
          "Prefer spacing to separate content; add a rule only when proximity alone is ambiguous.",
        docs: "separator",
      },
      {
        slug: "aspect-ratio",
        title: "Aspect Ratio",
        description: "Constrains content to a fixed ratio.",
        guidance:
          "Keeps imaging thumbnails and scanned documents from shifting layout as they load.",
        docs: "aspect-ratio",
      },
      {
        slug: "scroll-area",
        title: "Scroll Area",
        description: "A scrollable region with consistent cross-platform scrollbars.",
        guidance:
          "Use for bounded panels such as a long problem list, so the page itself does not scroll away from the patient header.",
        docs: "scroll-area",
      },
      {
        slug: "resizable",
        title: "Resizable",
        description: "Panels the user can drag to resize.",
        guidance:
          "The backbone of master–detail review screens — a worklist beside a chart, sized to the clinician's preference.",
        docs: "resizable",
      },
      {
        slug: "collapsible",
        title: "Collapsible",
        description: "A single show/hide region.",
        guidance:
          "Use for group headers in sectioned lists, and to hide detail that most users skip.",
        docs: "collapsible",
      },
      {
        slug: "accordion",
        title: "Accordion",
        description: "A stack of collapsible sections.",
        guidance:
          "Good for a long chart split into named sections. Do not hide safety-critical information such as allergies behind a closed panel.",
        docs: "accordion",
      },
      {
        slug: "tabs",
        title: "Tabs",
        description: "Switches between peer views in place. Default and line variants.",
        guidance:
          "Use for peer sections of one record — Summary, Vitals, Medications. Not for steps in a sequence; use a stepper for that.",
        docs: "tabs",
      },
    ],
  },
  {
    name: "Data display",
    items: [
      {
        slug: "table",
        title: "Table",
        description: "Primitives for rows and columns.",
        guidance:
          "The core of every worklist. Right-align numerics, keep identifiers monospaced, and never let a table render blank — see Data patterns.",
        docs: "table",
      },
      {
        slug: "chart",
        title: "Chart",
        description: "Recharts wrappers bound to the theme's chart tokens.",
        guidance:
          "Use the chart-1…5 tokens so series re-theme with the product. Trends over time, not precise values — pair with a table when numbers matter.",
        docs: "chart",
      },
      {
        slug: "avatar",
        title: "Avatar",
        description: "A person or entity image with fallback initials.",
        guidance:
          "Use for care team and authorship. Never use an avatar alone to identify a patient — always pair with name and MRN.",
        docs: "avatar",
      },
      {
        slug: "badge",
        title: "Badge",
        description: "A compact status or count label.",
        guidance:
          "The primary way status reads in a worklist. Keep the vocabulary small and consistent, and never rely on color alone.",
        docs: "badge",
      },
      {
        slug: "progress",
        title: "Progress",
        description: "A composed progress bar with track, indicator, label, and value.",
        guidance:
          "Use for determinate work such as bulk exports or chart imports. For unknown duration use Spinner or Skeleton.",
        docs: "progress",
      },
      {
        slug: "skeleton",
        title: "Skeleton",
        description: "A placeholder matching the shape of loading content.",
        guidance:
          "Preferred over a spinner for tables and cards — it preserves layout and reduces perceived wait.",
        docs: "skeleton",
      },
      {
        slug: "empty",
        title: "Empty",
        description: "A structured empty state with icon, message, and action.",
        guidance:
          "Every list needs one. Say why it is empty and what to do next — 'No results for these filters. Clear filters.'",
        docs: "empty",
      },
      {
        slug: "carousel",
        title: "Carousel",
        description: "A horizontally paged set of items.",
        guidance:
          "Narrow use in clinical software — imaging series review. Avoid for navigation, since off-screen items are easy to miss.",
        docs: "carousel",
      },
    ],
  },
  {
    name: "Navigation",
    items: [
      {
        slug: "breadcrumb",
        title: "Breadcrumb",
        description: "Shows position in a hierarchy, with truncation support.",
        guidance:
          "Essential once a clinician is three levels deep — Patients › Okafor › Encounter › Orders.",
        docs: "breadcrumb",
      },
      {
        slug: "pagination",
        title: "Pagination",
        description: "Page controls for long result sets.",
        guidance:
          "Prefer explicit paging over infinite scroll for clinical lists — a stable page number is auditable and easier to return to.",
        docs: "pagination",
      },
      {
        slug: "navigation-menu",
        title: "Navigation Menu",
        description: "A top-level menu bar supporting mega-menu panels.",
        guidance:
          "Use for the product's primary areas when the shell is top-navigation rather than sidebar.",
        docs: "navigation-menu",
      },
      {
        slug: "menubar",
        title: "Menubar",
        description: "A desktop-application menu bar with submenus and shortcuts.",
        guidance:
          "Fits clinical workstations where power users expect File/Edit/View conventions and keyboard access.",
        docs: "menubar",
      },
      {
        slug: "command",
        title: "Command",
        description: "A searchable command palette.",
        guidance:
          "The fastest route through a large EHR — jump to a patient, place an order, open a note. Bind it to ⌘K everywhere.",
        docs: "command",
      },
      {
        slug: "sidebar",
        title: "Sidebar",
        description: "The full application shell: collapsible sidebar, header, and content area.",
        guidance:
          "The default shell for this product. Deep, stable navigation stays visible while the clinician works.",
        docs: "sidebar",
      },
      {
        slug: "sidebar-icon",
        title: "Sidebar — Icon",
        description: "The shell collapsed to an icon rail.",
        guidance:
          "Reclaims horizontal space for wide tables while keeping navigation one click away.",
        docs: "sidebar",
      },
      {
        slug: "sidebar-inset",
        title: "Sidebar — Inset",
        description: "The content area floats as an inset card beside the sidebar.",
        guidance:
          "Reads as a calmer, more modern shell. Costs a little horizontal space, so weigh it against dense tables.",
        docs: "sidebar",
      },
      {
        slug: "sidebar-floating",
        title: "Sidebar — Floating",
        description: "The sidebar floats detached from the viewport edge.",
        guidance:
          "The most spacious variant. Best for dashboards and lighter screens rather than data-dense worklists.",
        docs: "sidebar",
      },
    ],
  },
  {
    name: "Overlays",
    items: [
      {
        slug: "dialog",
        title: "Dialog",
        description: "A focused modal layer.",
        guidance:
          "Use for a short, self-contained task. Anything longer than one screen belongs on a page, not in a modal.",
        docs: "dialog",
      },
      {
        slug: "alert-dialog",
        title: "Alert Dialog",
        description: "A modal that interrupts and requires a decision.",
        guidance:
          "Reserve for irreversible or clinically significant actions — discontinuing an order, voiding a signed note.",
        docs: "alert-dialog",
      },
      {
        slug: "sheet",
        title: "Sheet",
        description: "A panel sliding in from an edge.",
        guidance:
          "Good for secondary detail that should not lose the current context, such as order details beside a worklist.",
        docs: "sheet",
      },
      {
        slug: "drawer",
        title: "Drawer",
        description: "A bottom sheet tuned for touch.",
        guidance:
          "The mobile counterpart to Sheet — rounding, bedside, and tablet workflows.",
        docs: "drawer",
      },
      {
        slug: "popover",
        title: "Popover",
        description: "A small floating panel anchored to a trigger.",
        guidance:
          "Use for filter panels, date pickers, and quick edits. For read-only hints use Tooltip or Hover Card.",
        docs: "popover",
      },
      {
        slug: "hover-card",
        title: "Hover Card",
        description: "A preview shown on hover.",
        guidance:
          "Ideal for peeking at a patient or provider without leaving a worklist. Never put required information here — it is invisible on touch.",
        docs: "hover-card",
      },
      {
        slug: "tooltip",
        title: "Tooltip",
        description: "A short label on hover or focus.",
        guidance:
          "Label icon-only buttons, which are common in dense toolbars. Keep to a few words and never hide essential text.",
        docs: "tooltip",
      },
      {
        slug: "dropdown-menu",
        title: "Dropdown Menu",
        description: "A menu opened from a button, with submenus and shortcuts.",
        guidance:
          "The standard row-actions menu in worklists, and the user menu in the shell header.",
        docs: "dropdown-menu",
      },
      {
        slug: "context-menu",
        title: "Context Menu",
        description: "A right-click menu.",
        guidance:
          "A power-user accelerator only. Always provide the same actions somewhere visible — right-click is undiscoverable.",
        docs: "context-menu",
      },
    ],
  },
  {
    name: "Feedback",
    items: [
      {
        slug: "alert",
        title: "Alert",
        description: "An inline message that stays on the page.",
        guidance:
          "Use for persistent conditions — drug interactions, overdue results. Because it does not dismiss, it suits safety messaging.",
        docs: "alert",
      },
      {
        slug: "sonner",
        title: "Sonner",
        description: "Transient toast notifications.",
        guidance:
          "Confirm background actions such as 'Note signed'. Never deliver clinical warnings by toast — they vanish.",
        docs: "sonner",
      },
      {
        slug: "toast",
        title: "Toast",
        description: "The older toast primitive, kept for completeness.",
        guidance: "Prefer Sonner for new work; this remains for parity with the registry.",
        docs: "toast",
      },
      {
        slug: "spinner",
        title: "Spinner",
        description: "An indeterminate loading indicator.",
        guidance:
          "Use inline inside buttons during submit. For page and table loads, Skeleton reads better.",
        docs: "spinner",
      },
      {
        slug: "marker",
        title: "Marker",
        description: "Highlights and annotates a span of content.",
        guidance:
          "Useful for calling out matched terms in search results or flagged phrases inside a clinical note.",
      },
    ],
  },
  {
    name: "Conversational",
    items: [
      {
        slug: "attachment",
        title: "Attachment",
        description: "A file attached to a message or record.",
        guidance:
          "Represents uploaded documents — referrals, scanned insurance cards, outside records.",
      },
      {
        slug: "bubble",
        title: "Bubble",
        description: "A chat message bubble.",
        guidance:
          "For secure messaging between care team members, and for AI assistant replies.",
      },
      {
        slug: "questionnaire",
        title: "Questionnaire",
        description: "A structured question-and-answer flow.",
        guidance:
          "Fits intake forms and standardised instruments such as PHQ-9 or GAD-7.",
      },
    ],
  },
]

export const ALL_EXAMPLES = EXAMPLE_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ ...i, group: g.name }))
)

export function getExample(slug: string) {
  return ALL_EXAMPLES.find((e) => e.slug === slug)
}

export function getExampleNeighbours(slug: string) {
  const index = ALL_EXAMPLES.findIndex((e) => e.slug === slug)
  return {
    previous: index > 0 ? ALL_EXAMPLES[index - 1] : null,
    next: index >= 0 && index < ALL_EXAMPLES.length - 1 ? ALL_EXAMPLES[index + 1] : null,
  }
}
