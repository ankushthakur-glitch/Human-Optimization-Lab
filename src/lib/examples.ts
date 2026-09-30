export type ExampleItem = {
  slug: string
  title: string
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
      },
      {
        slug: "button-group",
        title: "Button Group",
      },
      {
        slug: "toggle",
        title: "Toggle",
      },
      {
        slug: "toggle-group",
        title: "Toggle Group",
      },
      {
        slug: "kbd",
        title: "Kbd",
      },
    ],
  },
  {
    name: "Form controls",
    items: [
      {
        slug: "field",
        title: "Field",
      },
      {
        slug: "label",
        title: "Label",
      },
      {
        slug: "input",
        title: "Input",
      },
      {
        slug: "input-group",
        title: "Input Group",
      },
      {
        slug: "input-otp",
        title: "Input OTP",
      },
      {
        slug: "textarea",
        title: "Textarea",
      },
      {
        slug: "select",
        title: "Select",
      },
      {
        slug: "native-select",
        title: "Native Select",
      },
      {
        slug: "combobox",
        title: "Combobox",
      },
      {
        slug: "checkbox",
        title: "Checkbox",
      },
      {
        slug: "radio-group",
        title: "Radio Group",
      },
      {
        slug: "switch",
        title: "Switch",
      },
      {
        slug: "slider",
        title: "Slider",
      },
      {
        slug: "calendar",
        title: "Calendar",
      },
    ],
  },
  {
    name: "Layout",
    items: [
      {
        slug: "card",
        title: "Card",
      },
      {
        slug: "item",
        title: "Item",
      },
      {
        slug: "separator",
        title: "Separator",
      },
      {
        slug: "aspect-ratio",
        title: "Aspect Ratio",
      },
      {
        slug: "scroll-area",
        title: "Scroll Area",
      },
      {
        slug: "resizable",
        title: "Resizable",
      },
      {
        slug: "collapsible",
        title: "Collapsible",
      },
      {
        slug: "accordion",
        title: "Accordion",
      },
      {
        slug: "tabs",
        title: "Tabs",
      },
    ],
  },
  {
    name: "Data display",
    items: [
      {
        slug: "table",
        title: "Table",
      },
      {
        slug: "chart",
        title: "Chart",
      },
      {
        slug: "avatar",
        title: "Avatar",
      },
      {
        slug: "badge",
        title: "Badge",
      },
      {
        slug: "progress",
        title: "Progress",
      },
      {
        slug: "skeleton",
        title: "Skeleton",
      },
      {
        slug: "empty",
        title: "Empty",
      },
      {
        slug: "carousel",
        title: "Carousel",
      },
    ],
  },
  {
    name: "Navigation",
    items: [
      {
        slug: "breadcrumb",
        title: "Breadcrumb",
      },
      {
        slug: "pagination",
        title: "Pagination",
      },
      {
        slug: "navigation-menu",
        title: "Navigation Menu",
      },
      {
        slug: "menubar",
        title: "Menubar",
      },
      {
        slug: "command",
        title: "Command",
      },
    ],
  },
  {
    name: "Overlays",
    items: [
      {
        slug: "dialog",
        title: "Dialog",
      },
      {
        slug: "alert-dialog",
        title: "Alert Dialog",
      },
      {
        slug: "sheet",
        title: "Sheet",
      },
      {
        slug: "drawer",
        title: "Drawer",
      },
      {
        slug: "popover",
        title: "Popover",
      },
      {
        slug: "hover-card",
        title: "Hover Card",
      },
      {
        slug: "tooltip",
        title: "Tooltip",
      },
      {
        slug: "dropdown-menu",
        title: "Dropdown Menu",
      },
      {
        slug: "context-menu",
        title: "Context Menu",
      },
    ],
  },
  {
    name: "Feedback",
    items: [
      {
        slug: "alert",
        title: "Alert",
      },
      {
        slug: "sonner",
        title: "Sonner",
      },
      {
        slug: "toast",
        title: "Toast",
      },
      {
        slug: "spinner",
        title: "Spinner",
      },
      {
        slug: "marker",
        title: "Marker",
      },
      {
        slug: "border-beam",
        title: "Border Beam",
      },
    ],
  },
  {
    name: "Conversational",
    items: [
      {
        slug: "attachment",
        title: "Attachment",
      },
      {
        slug: "bubble",
        title: "Bubble",
      },
      {
        slug: "questionnaire",
        title: "Questionnaire",
      },
      {
        slug: "thinking-orb",
        title: "Thinking Orb",
      },
      {
        slug: "voice-beam",
        title: "Voice Beam",
      },
    ],
  },
  {
    name: "Agent UI",
    items: [
      {
        slug: "loading-state",
        title: "Loading State",
      },
      {
        slug: "thinking",
        title: "Thinking",
      },
      {
        slug: "streaming-text",
        title: "Streaming Text",
      },
      {
        slug: "tool-chips",
        title: "Tool Chips",
      },
      {
        slug: "task-rows",
        title: "Task Rows",
      },
      {
        slug: "approval-card",
        title: "Approval Card",
      },
      {
        slug: "prompt-bar",
        title: "Prompt Bar",
      },
      {
        slug: "chat",
        title: "Chat",
      },
    ],
  },
  {
    name: "Agent data",
    items: [
      {
        slug: "recommendation-card",
        title: "Recommendation Card",
      },
      {
        slug: "context-cards",
        title: "Context Cards",
      },
      {
        slug: "insight-cards",
        title: "Insight Cards",
      },
      {
        slug: "fine-tune-card",
        title: "Fine-tune Card",
      },
      {
        slug: "code-block",
        title: "Code Block",
      },
      {
        slug: "search",
        title: "Search",
      },
      {
        slug: "selection-actions",
        title: "Selection Actions",
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
    next:
      index >= 0 && index < ALL_EXAMPLES.length - 1
        ? ALL_EXAMPLES[index + 1]
        : null,
  }
}
