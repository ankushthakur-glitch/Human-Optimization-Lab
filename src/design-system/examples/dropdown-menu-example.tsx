"use client"

import * as React from "react"

import {
  Example,
  ExampleWrapper,
} from "@/design-system/examples/example"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/design-system/ui/avatar"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/design-system/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon, CreditCardIcon, SettingsIcon, LogoutIcon, LayoutIcon, ActivityIcon, LayoutLeftIcon, ArrowUp01Icon, ArrowDown01Icon, ArrowRight01Icon, MailIcon, MessageIcon, NotificationIcon, WalletIcon, BankIcon, EditIcon, ShareIcon, Archive02Icon, DeleteIcon, CheckmarkBadgeIcon, UnfoldMoreIcon, CopyIcon, ScissorIcon, ClipboardIcon, UserGroupIcon, AddCircleIcon, HelpCircleIcon } from "@hugeicons/core-free-icons"

export default function DropdownMenuExample() {
  return (
    <ExampleWrapper>
      <DropdownMenuBasic />
      <DropdownMenuComplex />
      <DropdownMenuSides />
      <DropdownMenuWithIcons />
      <DropdownMenuWithShortcuts />
      <DropdownMenuWithSubmenu />
      <DropdownMenuWithCheckboxes />
      <DropdownMenuWithCheckboxesIcons />
      <DropdownMenuWithRadio />
      <DropdownMenuWithRadioIcons />
      <DropdownMenuWithDestructive />
      <DropdownMenuWithAvatar />
      <DropdownMenuInDialog />
      <DropdownMenuWithInset />
    </ExampleWrapper>
  )
}

function DropdownMenuBasic() {
  return (
    <Example title="Basic">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>GitHub</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuItem disabled>API</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuSides() {
  return (
    <Example title="Sides" containerClassName="col-span-2">
      <div className="flex flex-wrap justify-center gap-2">
        {(
          [
            "inline-start",
            "left",
            "top",
            "bottom",
            "right",
            "inline-end",
          ] as const
        ).map((side) => (
          <DropdownMenu key={side}>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="w-fit capitalize" />}
            >
              {side.replace("-", " ")}
            </DropdownMenuTrigger>
            <DropdownMenuContent side={side}>
              <DropdownMenuGroup>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>
    </Example>
  )
}

function DropdownMenuWithIcons() {
  return (
    <Example title="With Icons">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <HugeiconsIcon icon={UserIcon} />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={CreditCardIcon} />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={SettingsIcon} />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <HugeiconsIcon icon={LogoutIcon} />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuWithShortcuts() {
  return (
    <Example title="With Shortcuts">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Keyboard shortcuts
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuWithSubmenu() {
  return (
    <Example title="With Submenu">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Email</DropdownMenuItem>
                  <DropdownMenuItem>Message</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>More...</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem>
              New Team
              <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuWithCheckboxes() {
  const [showStatusBar, setShowStatusBar] = React.useState(true)
  const [showActivityBar, setShowActivityBar] = React.useState(false)
  const [showPanel, setShowPanel] = React.useState(false)

  return (
    <Example title="With Checkboxes">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Checkboxes
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-40">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showStatusBar}
              onCheckedChange={setShowStatusBar}
            >
              <HugeiconsIcon icon={LayoutIcon} />
              Status Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showActivityBar}
              onCheckedChange={setShowActivityBar}
              disabled
            >
              <HugeiconsIcon icon={ActivityIcon} />
              Activity Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showPanel}
              onCheckedChange={setShowPanel}
            >
              <HugeiconsIcon icon={LayoutLeftIcon} />
              Panel
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuWithRadio() {
  const [position, setPosition] = React.useState("bottom")

  return (
    <Example title="With Radio Group">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Radio Group
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={position}
              onValueChange={setPosition}
            >
              <DropdownMenuRadioItem value="top">
                <HugeiconsIcon icon={ArrowUp01Icon} />
                Top
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bottom">
                <HugeiconsIcon icon={ArrowDown01Icon} />
                Bottom
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="right" disabled>
                <HugeiconsIcon icon={ArrowRight01Icon} />
                Right
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuWithCheckboxesIcons() {
  const [notifications, setNotifications] = React.useState({
    email: true,
    sms: false,
    push: true,
  })

  return (
    <Example title="Checkboxes with Icons">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Notifications
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Notification Preferences</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, email: checked === true })
              }
            >
              <HugeiconsIcon icon={MailIcon} />
              Email notifications
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={notifications.sms}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, sms: checked === true })
              }
            >
              <HugeiconsIcon icon={MessageIcon} />
              SMS notifications
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={notifications.push}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, push: checked === true })
              }
            >
              <HugeiconsIcon icon={NotificationIcon} />
              Push notifications
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuWithRadioIcons() {
  const [paymentMethod, setPaymentMethod] = React.useState("card")

  return (
    <Example title="Radio with Icons">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Payment Method
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Select Payment Method</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
            >
              <DropdownMenuRadioItem value="card">
                <HugeiconsIcon icon={CreditCardIcon} />
                Credit Card
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="paypal">
                <HugeiconsIcon icon={WalletIcon} />
                PayPal
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bank">
                <HugeiconsIcon icon={BankIcon} />
                Bank Transfer
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuWithDestructive() {
  return (
    <Example title="With Destructive Items">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Actions
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <HugeiconsIcon icon={EditIcon} />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HugeiconsIcon icon={ShareIcon} />
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <HugeiconsIcon icon={Archive02Icon} />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <HugeiconsIcon icon={DeleteIcon} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuWithAvatar() {
  const menuContent = (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <HugeiconsIcon icon={CheckmarkBadgeIcon} />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HugeiconsIcon icon={CreditCardIcon} />
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HugeiconsIcon icon={NotificationIcon} />
          Notifications
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <HugeiconsIcon icon={LogoutIcon} />
        Sign Out
      </DropdownMenuItem>
    </>
  )

  return (
    <Example title="With Avatar">
      <div className="flex items-center justify-between gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="h-12 justify-start px-2 md:max-w-[200px] style-sera:font-normal style-sera:tracking-normal style-sera:normal-case"
              />
            }
          >
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="Shadcn" />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">shadcn</span>
              <span className="truncate text-xs text-muted-foreground">
                shadcn@example.com
              </span>
            </div>
            <HugeiconsIcon icon={UnfoldMoreIcon} className="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--anchor-width) min-w-56">
            {menuContent}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full" />
            }
          >
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
              <AvatarFallback>LR</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {menuContent}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Example>
  )
}

function DropdownMenuInDialog() {
  return (
    <Example title="In Dialog">
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dropdown Menu Example</DialogTitle>
            <DialogDescription>
              Click the button below to see the dropdown menu.
            </DialogDescription>
          </DialogHeader>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="w-fit" />}
            >
              Open Menu
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <HugeiconsIcon icon={CopyIcon} />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HugeiconsIcon icon={ScissorIcon} />
                Cut
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HugeiconsIcon icon={ClipboardIcon} />
                Paste
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Save Page...</DropdownMenuItem>
                    <DropdownMenuItem>Create Shortcut...</DropdownMenuItem>
                    <DropdownMenuItem>Name Window...</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Developer Tools</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <HugeiconsIcon icon={DeleteIcon} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogContent>
      </Dialog>
    </Example>
  )
}

function DropdownMenuWithInset() {
  const [showBookmarks, setShowBookmarks] = React.useState(true)
  const [showUrls, setShowUrls] = React.useState(false)
  const [theme, setTheme] = React.useState("system")

  return (
    <Example title="With Inset">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Open
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <HugeiconsIcon icon={CopyIcon} />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HugeiconsIcon icon={ScissorIcon} />
              Cut
            </DropdownMenuItem>
            <DropdownMenuItem inset>Paste</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel inset>Appearance</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              inset
              checked={showBookmarks}
              onCheckedChange={setShowBookmarks}
            >
              Bookmarks
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              inset
              checked={showUrls}
              onCheckedChange={setShowUrls}
            >
              Full URLs
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel inset>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem inset value="light">
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem inset value="dark">
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem inset value="system">
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>More Options</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuGroup>
                  <DropdownMenuItem>Save Page...</DropdownMenuItem>
                  <DropdownMenuItem>Create Shortcut...</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}

function DropdownMenuComplex() {
  const [showSidebar, setShowSidebar] = React.useState(true)
  const [showStatusBar, setShowStatusBar] = React.useState(false)

  return (
    <Example title="Complex">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Complex Menu
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem>
              <HugeiconsIcon icon={UserIcon} />
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HugeiconsIcon icon={CreditCardIcon} />
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HugeiconsIcon icon={SettingsIcon} />
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showSidebar}
              onCheckedChange={setShowSidebar}
            >
              <HugeiconsIcon icon={LayoutLeftIcon} />
              Sidebar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showStatusBar}
              onCheckedChange={setShowStatusBar}
            >
              <HugeiconsIcon icon={LayoutIcon} />
              Status Bar
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <HugeiconsIcon icon={UserGroupIcon} />
                Invite Users
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <HugeiconsIcon icon={MailIcon} />
                      Email
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <HugeiconsIcon icon={MessageIcon} />
                      Message
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <HugeiconsIcon icon={AddCircleIcon} />
                      More...
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <HugeiconsIcon icon={HelpCircleIcon} />
              Support
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <HugeiconsIcon icon={LogoutIcon} />
              Sign Out
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Example>
  )
}
