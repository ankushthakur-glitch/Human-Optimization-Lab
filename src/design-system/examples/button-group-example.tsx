"use client"

import {
  Example,
  ExampleWrapper,
} from "@/design-system/examples/example"
import { Button } from "@/design-system/ui/button"
import {
  ButtonGroup,
  ButtonGroupText,
} from "@/design-system/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/ui/dropdown-menu"
import { Field, FieldGroup } from "@/design-system/ui/field"
import { Input } from "@/design-system/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/ui/input-group"
import { Label } from "@/design-system/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system/ui/tooltip"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, VolumeOffIcon, Tick02Icon, AlertCircleIcon, UserRemove01Icon, Share03Icon, Copy01Icon, Delete02Icon, ArrowRight01Icon, FlipHorizontalIcon, FlipVerticalIcon, Rotate01Icon, Search01Icon, MinusSignIcon, PlusSignIcon, Notification02Icon, AudioWave01Icon, ArrowLeft02Icon, ArrowRight02Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons"

export default function ButtonGroupExample() {
  return (
    <ExampleWrapper>
      <ButtonGroupBasic />
      <ButtonGroupWithInput />
      <ButtonGroupWithText />
      <ButtonGroupWithDropdown />
      <ButtonGroupWithSelect />
      <ButtonGroupWithIcons />
      <ButtonGroupWithInputGroup />
      <ButtonGroupWithFields />
      <ButtonGroupWithLike />
      <ButtonGroupWithSelectAndInput />
      <ButtonGroupNested />
      <ButtonGroupPagination />
      <ButtonGroupPaginationSplit />
      <ButtonGroupNavigation />
      <ButtonGroupTextAlignment />
      <ButtonGroupVertical />
      <ButtonGroupVerticalNested />
    </ExampleWrapper>
  )
}

function ButtonGroupBasic() {
  return (
    <Example title="Basic">
      <div className="flex flex-col gap-4">
        <ButtonGroup>
          <Button variant="outline">Button</Button>
          <Button variant="outline">Another Button</Button>
        </ButtonGroup>
      </div>
    </Example>
  )
}

function ButtonGroupWithInput() {
  return (
    <Example title="With Input">
      <div className="flex flex-col gap-4">
        <ButtonGroup>
          <Button variant="outline">Button</Button>
          <Input placeholder="Type something here..." />
        </ButtonGroup>
        <ButtonGroup>
          <Input placeholder="Type something here..." />
          <Button variant="outline">Button</Button>
        </ButtonGroup>
      </div>
    </Example>
  )
}

function ButtonGroupWithText() {
  return (
    <Example title="With Text">
      <div className="flex flex-col gap-4">
        <ButtonGroup>
          <ButtonGroupText>Text</ButtonGroupText>
          <Button variant="outline">Another Button</Button>
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroupText render={<Label htmlFor="input-text" />}>
            GPU Size
          </ButtonGroupText>
          <Input
            id="input-text"
            placeholder="Type something here..."
            className="style-luma:border-border"
          />
        </ButtonGroup>
      </div>
    </Example>
  )
}

function ButtonGroupWithDropdown() {
  return (
    <Example title="With Dropdown">
      <div className="flex flex-col gap-4">
        <ButtonGroup>
          <Button variant="outline">Update</Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon" />}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Disable</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                Uninstall
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline">Follow</Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon" />}
            >
              <HugeiconsIcon icon={ArrowDown01Icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-50">
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={VolumeOffIcon} />
                  Mute Conversation
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Tick02Icon} />
                  Mark as Read
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={AlertCircleIcon} />
                  Report Conversation
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={UserRemove01Icon} />
                  Block User
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Share03Icon} />
                  Share Conversation
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Copy01Icon} />
                  Copy Conversation
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive">
                  <HugeiconsIcon icon={Delete02Icon} />
                  Delete Conversation
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div>
    </Example>
  )
}

const currencyItems = [
  { label: "$", value: "$" },
  { label: "€", value: "€" },
  { label: "£", value: "£" },
]

function ButtonGroupWithSelect() {
  return (
    <Example title="With Select">
      <Field>
        <Label htmlFor="amount">Amount</Label>
        <ButtonGroup>
          <Select items={currencyItems} defaultValue={currencyItems[0]}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {currencyItems.map((item) => (
                  <SelectItem key={item.value} value={item}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input placeholder="Enter amount to send" />
          <Button variant="outline">
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </Button>
        </ButtonGroup>
      </Field>
    </Example>
  )
}

function ButtonGroupWithIcons() {
  return (
    <Example title="With Icons">
      <div className="flex flex-col gap-4">
        <ButtonGroup>
          <Button variant="outline">
            <HugeiconsIcon icon={FlipHorizontalIcon} />
          </Button>
          <Button variant="outline">
            <HugeiconsIcon icon={FlipVerticalIcon} />
          </Button>
          <Button variant="outline">
            <HugeiconsIcon icon={Rotate01Icon} />
          </Button>
        </ButtonGroup>
      </div>
    </Example>
  )
}

function ButtonGroupWithInputGroup() {
  return (
    <Example title="With Input Group">
      <div className="flex flex-col gap-4">
        <InputGroup>
          <InputGroupInput placeholder="Type to search..." />
          <InputGroupAddon
            align="inline-start"
            className="text-muted-foreground"
          >
            <HugeiconsIcon icon={Search01Icon} />
          </InputGroupAddon>
        </InputGroup>
      </div>
    </Example>
  )
}

function ButtonGroupWithFields() {
  return (
    <Example title="With Fields">
      <FieldGroup className="grid grid-cols-3 gap-4">
        <Field className="col-span-2">
          <Label htmlFor="width">Width</Label>
          <ButtonGroup>
            <InputGroup>
              <InputGroupInput id="width" />
              <InputGroupAddon className="text-muted-foreground">
                W
              </InputGroupAddon>
              <InputGroupAddon
                align="inline-end"
                className="text-muted-foreground"
              >
                px
              </InputGroupAddon>
            </InputGroup>
            <Button variant="outline" size="icon">
              <HugeiconsIcon icon={MinusSignIcon} />
            </Button>
            <Button variant="outline" size="icon">
              <HugeiconsIcon icon={PlusSignIcon} />
            </Button>
          </ButtonGroup>
        </Field>
      </FieldGroup>
    </Example>
  )
}

function ButtonGroupWithLike() {
  return (
    <Example title="With Like">
      <ButtonGroup>
        <Button variant="outline">
          <HugeiconsIcon icon={Notification02Icon} data-icon="inline-start" />{" "}
          Like
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="w-12"
          render={<span />}
          nativeButton={false}
        >
          1.2K
        </Button>
      </ButtonGroup>
    </Example>
  )
}

const durationItems = [
  { label: "Hours", value: "hours" },
  { label: "Days", value: "days" },
  { label: "Weeks", value: "weeks" },
]

function ButtonGroupWithSelectAndInput() {
  return (
    <Example title="With Select and Input">
      <ButtonGroup>
        <Select items={durationItems} defaultValue={durationItems[0]}>
          <SelectTrigger id="duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {durationItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input />
      </ButtonGroup>
    </Example>
  )
}

function ButtonGroupNested() {
  return (
    <Example title="Nested">
      <ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={PlusSignIcon} />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <InputGroup>
            <InputGroupInput placeholder="Send a message..." />
            <Tooltip>
              <TooltipTrigger render={<InputGroupAddon align="inline-end" />}>
                <HugeiconsIcon icon={AudioWave01Icon} />
              </TooltipTrigger>
              <TooltipContent>Voice Mode</TooltipContent>
            </Tooltip>
          </InputGroup>
        </ButtonGroup>
      </ButtonGroup>
    </Example>
  )
}

function ButtonGroupPagination() {
  return (
    <Example title="Pagination">
      <ButtonGroup>
        <Button variant="outline" size="sm">
          <HugeiconsIcon icon={ArrowLeft02Icon} data-icon="inline-start" />
          Previous
        </Button>
        <Button variant="outline" size="sm">
          1
        </Button>
        <Button variant="outline" size="sm">
          2
        </Button>
        <Button variant="outline" size="sm">
          3
        </Button>
        <Button variant="outline" size="sm">
          4
        </Button>
        <Button variant="outline" size="sm">
          5
        </Button>
        <Button variant="outline" size="sm">
          Next
          <HugeiconsIcon icon={ArrowRight02Icon} data-icon="inline-end" />
        </Button>
      </ButtonGroup>
    </Example>
  )
}

function ButtonGroupPaginationSplit() {
  return (
    <Example title="Pagination Split">
      <ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="sm">
            1
          </Button>
          <Button variant="outline" size="sm">
            2
          </Button>
          <Button variant="outline" size="sm">
            3
          </Button>
          <Button variant="outline" size="sm">
            4
          </Button>
          <Button variant="outline" size="sm">
            5
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="icon-xs">
            <HugeiconsIcon icon={ArrowLeft01Icon} />
          </Button>
          <Button variant="outline" size="icon-xs">
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </Button>
        </ButtonGroup>
      </ButtonGroup>
    </Example>
  )
}

function ButtonGroupNavigation() {
  return (
    <Example title="Navigation">
      <ButtonGroup>
        <ButtonGroup>
          <Button variant="outline">
            <HugeiconsIcon icon={ArrowLeft01Icon} />
          </Button>
          <Button variant="outline">
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </Button>
        </ButtonGroup>
        <ButtonGroup aria-label="Single navigation button">
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={ArrowLeft01Icon} />
          </Button>
        </ButtonGroup>
      </ButtonGroup>
    </Example>
  )
}

function ButtonGroupTextAlignment() {
  return (
    <Example title="Text Alignment">
      <Field>
        <Label id="alignment-label">Text Alignment</Label>
        <ButtonGroup aria-labelledby="alignment-label">
          <Button variant="outline" size="sm">
            Left
          </Button>
          <Button variant="outline" size="sm">
            Center
          </Button>
          <Button variant="outline" size="sm">
            Right
          </Button>
          <Button variant="outline" size="sm">
            Justify
          </Button>
        </ButtonGroup>
      </Field>
    </Example>
  )
}

function ButtonGroupVertical() {
  return (
    <Example title="Vertical">
      <div className="flex gap-6">
        <ButtonGroup
          orientation="vertical"
          aria-label="Media controls"
          className="h-fit"
        >
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={PlusSignIcon} />
          </Button>
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={MinusSignIcon} />
          </Button>
        </ButtonGroup>
      </div>
    </Example>
  )
}

function ButtonGroupVerticalNested() {
  return (
    <Example title="Vertical Nested">
      <ButtonGroup orientation="vertical" aria-label="Design tools palette">
        <ButtonGroup orientation="vertical">
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={Search01Icon} />
          </Button>
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={Copy01Icon} />
          </Button>
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={Share03Icon} />
          </Button>
        </ButtonGroup>
        <ButtonGroup orientation="vertical">
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={FlipHorizontalIcon} />
          </Button>
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={FlipVerticalIcon} />
          </Button>
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={Rotate01Icon} />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" size="icon">
            <HugeiconsIcon icon={Delete02Icon} />
          </Button>
        </ButtonGroup>
      </ButtonGroup>
    </Example>
  )
}
