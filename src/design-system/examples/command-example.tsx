"use client"

import * as React from "react"

import { Example, ExampleWrapper } from "@/design-system/examples/example"
import { Button } from "@/design-system/ui/button"
import { Card, CardContent } from "@/design-system/ui/card"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/design-system/ui/command"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CalendarIcon,
  SmileIcon,
  CalculatorIcon,
  UserIcon,
  CreditCardIcon,
  SettingsIcon,
  HomeIcon,
  InboxIcon,
  File02Icon,
  FolderIcon,
  PlusSignIcon,
  FolderAddIcon,
  CopyIcon,
  ScissorIcon,
  ClipboardIcon,
  DeleteIcon,
  GridIcon,
  Menu05Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
  NotificationIcon,
  HelpCircleIcon,
  ImageIcon,
  CodeIcon,
} from "@hugeicons/core-free-icons"

export default function CommandExample() {
  return (
    <ExampleWrapper>
      <CommandInline />
      <CommandBasic />
      <CommandWithShortcuts />
      <CommandWithGroups />
      <CommandManyItems />
    </ExampleWrapper>
  )
}

function CommandInline() {
  return (
    <Example title="Inline">
      <Card className="w-full p-0">
        <CardContent className="p-0">
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>
                  <HugeiconsIcon icon={CalendarIcon} />
                  <span>Calendar</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={SmileIcon} />
                  <span>Search Emoji</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CalculatorIcon} />
                  <span>Calculator</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                <CommandItem>
                  <HugeiconsIcon icon={UserIcon} />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CreditCardIcon} />
                  <span>Billing</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={SettingsIcon} />
                  <span>Settings</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CardContent>
      </Card>
    </Example>
  )
}

function CommandBasic() {
  const [open, setOpen] = React.useState(false)

  return (
    <Example title="Basic">
      <div className="flex flex-col gap-4">
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="w-fit"
        >
          Open Menu
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>Calendar</CommandItem>
                <CommandItem>Search Emoji</CommandItem>
                <CommandItem>Calculator</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      </div>
    </Example>
  )
}

function CommandWithShortcuts() {
  const [open, setOpen] = React.useState(false)

  return (
    <Example title="With Shortcuts">
      <div className="flex flex-col gap-4">
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="w-fit"
        >
          Open Menu
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Settings">
                <CommandItem>
                  <HugeiconsIcon icon={UserIcon} />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CreditCardIcon} />
                  <span>Billing</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={SettingsIcon} />
                  <span>Settings</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      </div>
    </Example>
  )
}

function CommandWithGroups() {
  const [open, setOpen] = React.useState(false)

  return (
    <Example title="With Groups">
      <div className="flex flex-col gap-4">
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="w-fit"
        >
          Open Menu
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>
                  <HugeiconsIcon icon={CalendarIcon} />
                  <span>Calendar</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={SmileIcon} />
                  <span>Search Emoji</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CalculatorIcon} />
                  <span>Calculator</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                <CommandItem>
                  <HugeiconsIcon icon={UserIcon} />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CreditCardIcon} />
                  <span>Billing</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={SettingsIcon} />
                  <span>Settings</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      </div>
    </Example>
  )
}

function CommandManyItems() {
  const [open, setOpen] = React.useState(false)

  return (
    <Example title="Many Groups & Items">
      <div className="flex flex-col gap-4">
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="w-fit"
        >
          Open Menu
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigation">
                <CommandItem>
                  <HugeiconsIcon icon={HomeIcon} />
                  <span>Home</span>
                  <CommandShortcut>⌘H</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={InboxIcon} />
                  <span>Inbox</span>
                  <CommandShortcut>⌘I</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={File02Icon} />
                  <span>Documents</span>
                  <CommandShortcut>⌘D</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={FolderIcon} />
                  <span>Folders</span>
                  <CommandShortcut>⌘F</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem>
                  <HugeiconsIcon icon={PlusSignIcon} />
                  <span>New File</span>
                  <CommandShortcut>⌘N</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={FolderAddIcon} />
                  <span>New Folder</span>
                  <CommandShortcut>⇧⌘N</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CopyIcon} />
                  <span>Copy</span>
                  <CommandShortcut>⌘C</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={ScissorIcon} />
                  <span>Cut</span>
                  <CommandShortcut>⌘X</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={ClipboardIcon} />
                  <span>Paste</span>
                  <CommandShortcut>⌘V</CommandShortcut>
                </CommandItem>
                <CommandItem variant="destructive">
                  <HugeiconsIcon icon={DeleteIcon} />
                  <span>Delete</span>
                  <CommandShortcut>⌫</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="View">
                <CommandItem>
                  <HugeiconsIcon icon={GridIcon} />
                  <span>Grid View</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={Menu05Icon} />
                  <span>List View</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={ZoomInAreaIcon} />
                  <span>Zoom In</span>
                  <CommandShortcut>⌘+</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={ZoomOutAreaIcon} />
                  <span>Zoom Out</span>
                  <CommandShortcut>⌘-</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Account">
                <CommandItem>
                  <HugeiconsIcon icon={UserIcon} />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CreditCardIcon} />
                  <span>Billing</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={SettingsIcon} />
                  <span>Settings</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={NotificationIcon} />
                  <span>Notifications</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={HelpCircleIcon} />
                  <span>Help & Support</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Tools">
                <CommandItem>
                  <HugeiconsIcon icon={CalculatorIcon} />
                  <span>Calculator</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CalendarIcon} />
                  <span>Calendar</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={ImageIcon} />
                  <span>Image Editor</span>
                </CommandItem>
                <CommandItem>
                  <HugeiconsIcon icon={CodeIcon} />
                  <span>Code Editor</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      </div>
    </Example>
  )
}
