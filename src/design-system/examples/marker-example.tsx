"use client"

import { toast } from "sonner"

import {
  Example,
  ExampleWrapper,
} from "@/design-system/examples/example"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/design-system/ui/accordion"
import { Button } from "@/design-system/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/design-system/ui/drawer"
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@/design-system/ui/marker"
import { Spinner } from "@/design-system/ui/spinner"
import { HugeiconsIcon } from "@hugeicons/react"
import { File01Icon, GitBranchIcon, Clock01Icon, ArrowRight01Icon, UserCircleIcon, Search01Icon, Tick02Icon, SearchIcon } from "@hugeicons/core-free-icons"

export default function MarkerExamples() {
  return (
    <ExampleWrapper>
      <MarkerExample />
      <MarkerBorder />
      <MarkerSeparator />
      <MarkerAccordion />
      <MarkerDrawer />
    </ExampleWrapper>
  )
}

function MarkerExample() {
  return (
    <Example title="Markers" className="gap-8">
      <Marker>
        <MarkerContent>A default marker</MarkerContent>
      </Marker>
      <Marker>
        <MarkerIcon>
          <HugeiconsIcon icon={File01Icon} />
        </MarkerIcon>
        <MarkerContent>Marker with icon</MarkerContent>
      </Marker>
      <Marker role="status">
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
        <MarkerContent>Marker with a spinner</MarkerContent>
      </Marker>
      <Marker role="status">
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
        <MarkerContent className="shimmer">
          Marker with shimmer effect
        </MarkerContent>
      </Marker>
      <Marker role="status">
        <MarkerContent className="shimmer">Thinking...</MarkerContent>
      </Marker>
      <Marker render={<a href="#" />}>
        <MarkerIcon>
          <HugeiconsIcon icon={GitBranchIcon} />
        </MarkerIcon>
        <MarkerContent>Marker as a link</MarkerContent>
      </Marker>
      <Marker
        render={
          <button
            onClick={() => toast("You clicked the button")}
            className="transition-colors hover:text-foreground"
          />
        }
      >
        <MarkerIcon>
          <HugeiconsIcon icon={Clock01Icon} />
        </MarkerIcon>
        <MarkerContent className="flex-1">
          <div>Marker as a button</div>
        </MarkerContent>
        <MarkerIcon>
          <HugeiconsIcon icon={ArrowRight01Icon} />
        </MarkerIcon>
      </Marker>
      <Marker>
        <MarkerIcon>
          <HugeiconsIcon icon={UserCircleIcon} />
        </MarkerIcon>
        <MarkerContent>Rhea joined the chat</MarkerContent>
      </Marker>
      <Marker className="justify-center">
        <MarkerContent>
          <strong className="font-medium">Olivia Rose</strong> left the chat
        </MarkerContent>
      </Marker>
      <Marker className="flex-col">
        <MarkerIcon>
          <HugeiconsIcon icon={File01Icon} />
        </MarkerIcon>
        <MarkerContent>Marker with icon at the top</MarkerContent>
      </Marker>
    </Example>
  )
}

function MarkerBorder() {
  return (
    <Example title="Border" className="gap-3">
      <Marker variant="border">
        <MarkerIcon>
          <HugeiconsIcon icon={GitBranchIcon} />
        </MarkerIcon>
        <MarkerContent>Switched to release-candidate</MarkerContent>
      </Marker>
      <Marker variant="border">
        <MarkerIcon>
          <HugeiconsIcon icon={Search01Icon} />
        </MarkerIcon>
        <MarkerContent>Reviewed 8 related files</MarkerContent>
      </Marker>
      <Marker variant="border">
        <MarkerIcon>
          <HugeiconsIcon icon={File01Icon} />
        </MarkerIcon>
        <MarkerContent>Opened implementation notes</MarkerContent>
      </Marker>
    </Example>
  )
}

function MarkerSeparator() {
  return (
    <Example title="Separator" className="gap-8">
      <Marker variant="separator">
        <MarkerContent>Worked for 42s</MarkerContent>
      </Marker>
      <Marker variant="separator" role="status">
        <MarkerIcon>
          <Spinner />
        </MarkerIcon>
        <MarkerContent>Compacting conversation</MarkerContent>
      </Marker>
      <Marker variant="separator" role="status">
        <MarkerContent className="shimmer">Reading 4 files</MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerIcon>
          <HugeiconsIcon icon={Tick02Icon} />
        </MarkerIcon>
        <MarkerContent>Conversation compacted</MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>
          With a <a href="#">link to learn more</a>
        </MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>
          <Button variant="outline">
            <HugeiconsIcon icon={GitBranchIcon} />
            Button
          </Button>
        </MarkerContent>
      </Marker>
    </Example>
  )
}

function MarkerAccordion() {
  return (
    <Example title="Accordion" containerClassName="min-h-72">
      <Accordion>
        <AccordionItem value="1">
          <AccordionTrigger>
            <Marker>
              <MarkerIcon>
                <HugeiconsIcon icon={Clock01Icon} />
              </MarkerIcon>
              <MarkerContent>Worked for 42s</MarkerContent>
            </Marker>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">
              The user asked for a list of all the files in the current
              directory. The assistant responded with a list of all the files in
              the current directory.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Example>
  )
}

function MarkerDrawer() {
  return (
    <Example title="Drawer">
      <Drawer swipeDirection="right">
        <Marker variant="separator">
          <DrawerTrigger render={<Button variant="outline" />}>
            <HugeiconsIcon icon={SearchIcon} data-icon="inline-start" />
            Explored 4 files
          </DrawerTrigger>
        </Marker>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>File Activity</DrawerTitle>
            <DrawerDescription>
              Files read while preparing the response.
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-3 px-4 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <span className="truncate">app/chat/page.tsx</span>
              <span className="text-muted-foreground">read</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <span className="truncate">components/message.tsx</span>
              <span className="text-muted-foreground">read</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <span className="truncate">lib/ai.ts</span>
              <span className="text-muted-foreground">read</span>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose render={<Button variant="outline" />}>
              Close
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Example>
  )
}
