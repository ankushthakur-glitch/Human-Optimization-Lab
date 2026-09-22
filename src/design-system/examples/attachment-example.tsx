"use client"

import * as React from "react"

import {
  Example,
  ExampleWrapper,
} from "@/design-system/examples/example"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/design-system/ui/attachment"
import { Button } from "@/design-system/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/design-system/ui/dialog"
import { Spinner } from "@/design-system/ui/spinner"
import { HugeiconsIcon } from "@hugeicons/react"
import { FileIcon, Cancel01Icon, TableIcon, File01Icon, Presentation01Icon, Clock01Icon, FileCorruptIcon, RefreshIcon, Tick02Icon, Download01Icon, FileSearchIcon, Copy01Icon } from "@hugeicons/core-free-icons"

export default function AttachmentExample() {
  return (
    <ExampleWrapper>
      <AttachmentFiles />
      <AttachmentContentOnly />
      <AttachmentStates />
      <AttachmentImages />
      <AttachmentImageStates />
      <AttachmentSizes />
      <AttachmentScrollableGroup />
      <AttachmentTriggers />
    </ExampleWrapper>
  )
}

function AttachmentFiles() {
  return (
    <Example title="Files" className="gap-8">
      <div className="flex w-full flex-col gap-2">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Horizontal
        </div>
        <div className="flex flex-col gap-3">
          <Attachment className="w-full">
            <AttachmentMedia>
              <HugeiconsIcon icon={FileIcon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>sales-dashboard.pdf</AttachmentTitle>
              <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove sales-dashboard.pdf">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment className="w-full">
            <AttachmentMedia>
              <HugeiconsIcon icon={TableIcon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>customer-import.csv</AttachmentTitle>
              <AttachmentDescription>CSV · 18 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove customer-import.csv">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment className="w-full">
            <AttachmentMedia>
              <HugeiconsIcon icon={File01Icon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>message-renderer.tsx</AttachmentTitle>
              <AttachmentDescription>TypeScript · 12 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove message-renderer.tsx">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Vertical
        </div>
        <AttachmentGroup className="w-full">
          <Attachment orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={FileIcon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>sales-dashboard.pdf</AttachmentTitle>
              <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove sales-dashboard.pdf">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={TableIcon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>customer-import.csv</AttachmentTitle>
              <AttachmentDescription>CSV · 18 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove customer-import.csv">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={File01Icon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>message-renderer.tsx</AttachmentTitle>
              <AttachmentDescription>TypeScript · 12 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove message-renderer.tsx">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={File01Icon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>source-assets.zip</AttachmentTitle>
              <AttachmentDescription>ZIP · 4.2 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove source-assets.zip">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={Presentation01Icon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>quarterly-review.key</AttachmentTitle>
              <AttachmentDescription>Keynote · 9 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove quarterly-review.key">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </AttachmentGroup>
      </div>
    </Example>
  )
}

function AttachmentContentOnly() {
  return (
    <Example title="Content Only" className="gap-8">
      <div className="flex w-full flex-col gap-2">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Title
        </div>
        <div className="flex flex-col gap-3">
          <Attachment className="w-full">
            <AttachmentContent>
              <AttachmentTitle>React Documentation</AttachmentTitle>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove React Documentation">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment className="w-full">
            <AttachmentContent>
              <AttachmentTitle>Tailwind CSS</AttachmentTitle>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove Tailwind CSS">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment size="sm" className="w-48">
            <AttachmentContent>
              <AttachmentTitle>shadcn/ui</AttachmentTitle>
            </AttachmentContent>
            <AttachmentTrigger
              render={
                <a
                  href="https://ui.shadcn.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open shadcn/ui"
                />
              }
            />
          </Attachment>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Title and Description
        </div>
        <div className="flex flex-col gap-3">
          <Attachment className="w-full">
            <AttachmentContent>
              <AttachmentTitle>Building accessible components</AttachmentTitle>
              <AttachmentDescription>
                react.dev · 8 min read
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove Building accessible components">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment className="w-full">
            <AttachmentContent>
              <AttachmentTitle>Utility-first CSS framework</AttachmentTitle>
              <AttachmentDescription>tailwindcss.com</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove Utility-first CSS framework">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment size="sm" className="w-full max-w-80">
            <AttachmentContent>
              <AttachmentTitle>Compound components in React</AttachmentTitle>
              <AttachmentDescription>ui.shadcn.com/docs</AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger
              render={
                <a
                  href="https://ui.shadcn.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Compound components in React"
                />
              }
            />
          </Attachment>
        </div>
      </div>
    </Example>
  )
}

function AttachmentStates() {
  return (
    <Example title="States" className="gap-8">
      <div className="flex w-full flex-col gap-3">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Horizontal
        </div>
        <div className="flex flex-col gap-2">
          <Attachment state="idle" className="w-full">
            <AttachmentMedia>
              <HugeiconsIcon icon={Clock01Icon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>selected-file.pdf</AttachmentTitle>
              <AttachmentDescription>Ready to upload</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove selected-file.pdf">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="uploading" className="w-full">
            <AttachmentMedia>
              <Spinner />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>design-system.zip</AttachmentTitle>
              <AttachmentDescription>Uploading · 64%</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove design-system.zip">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="processing" className="w-full">
            <AttachmentMedia>
              <HugeiconsIcon icon={FileIcon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>market-research.pdf</AttachmentTitle>
              <AttachmentDescription>Processing document</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove market-research.pdf">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="error" className="w-full">
            <AttachmentMedia>
              <HugeiconsIcon icon={FileCorruptIcon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>financial-model.xlsx</AttachmentTitle>
              <AttachmentDescription>
                Upload failed. Try again.
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Retry upload">
                <HugeiconsIcon icon={RefreshIcon} />
              </AttachmentAction>
              <AttachmentAction aria-label="Remove attachment">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="done" className="w-full">
            <AttachmentMedia>
              <HugeiconsIcon icon={Tick02Icon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>uploaded-report.pdf</AttachmentTitle>
              <AttachmentDescription>Uploaded · 1.8 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove uploaded-report.pdf">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Vertical
        </div>
        <AttachmentGroup className="w-full">
          <Attachment state="idle" orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={Clock01Icon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>selected-file.pdf</AttachmentTitle>
              <AttachmentDescription>Ready</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove selected-file.pdf">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="uploading" orientation="vertical">
            <AttachmentMedia>
              <Spinner />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>design-system.zip</AttachmentTitle>
              <AttachmentDescription>Uploading</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove design-system.zip">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="processing" orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={FileIcon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>market-research.pdf</AttachmentTitle>
              <AttachmentDescription>Processing</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove market-research.pdf">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="error" orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={FileCorruptIcon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>financial-model.xlsx</AttachmentTitle>
              <AttachmentDescription>Failed</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Retry financial-model.xlsx">
                <HugeiconsIcon icon={RefreshIcon} />
              </AttachmentAction>
              <AttachmentAction aria-label="Remove financial-model.xlsx">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="done" orientation="vertical">
            <AttachmentMedia>
              <HugeiconsIcon icon={Tick02Icon} />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>uploaded-report.pdf</AttachmentTitle>
              <AttachmentDescription>Done</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove uploaded-report.pdf">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </AttachmentGroup>
      </div>
    </Example>
  )
}

function AttachmentImages() {
  return (
    <Example title="Images" className="gap-8">
      <div className="flex w-full flex-col gap-3">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Horizontal
        </div>
        <div className="flex flex-col gap-2">
          <Attachment className="w-full">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
                alt="Workspace"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>workspace.png</AttachmentTitle>
              <AttachmentDescription>PNG · 820 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove workspace.png">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a
                  href="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open workspace.png"
                />
              }
            />
          </Attachment>
          <Attachment className="w-full">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80"
                alt="Desk"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>desk-reference.jpg</AttachmentTitle>
              <AttachmentDescription>JPG · 1.1 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove desk-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a
                  href="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open desk-reference.jpg"
                />
              }
            />
          </Attachment>
          <Attachment className="w-full">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
                alt="Office"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>office-reference.jpg</AttachmentTitle>
              <AttachmentDescription>JPG · 940 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove office-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a
                  href="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open office-reference.jpg"
                />
              }
            />
          </Attachment>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Vertical
        </div>
        <AttachmentGroup className="w-full">
          <Attachment orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
                alt="Workspace"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>workspace.png</AttachmentTitle>
              <AttachmentDescription>PNG · 820 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove workspace.png">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a
                  href="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open workspace.png"
                />
              }
            />
          </Attachment>
          <Attachment orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80"
                alt="Desk"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>desk-reference.jpg</AttachmentTitle>
              <AttachmentDescription>JPG · 1.1 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove desk-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a
                  href="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open desk-reference.jpg"
                />
              }
            />
          </Attachment>
          <Attachment orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
                alt="Office"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>office-reference.jpg</AttachmentTitle>
              <AttachmentDescription>JPG · 940 KB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove office-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a
                  href="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open office-reference.jpg"
                />
              }
            />
          </Attachment>
          <Attachment orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80"
                alt="Outdoor patio"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>patio-reference.jpg</AttachmentTitle>
              <AttachmentDescription>JPG · 1.6 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove patio-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a
                  href="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open patio-reference.jpg"
                />
              }
            />
          </Attachment>
          <Attachment orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1494526585095-c41746248156?w=900&auto=format&fit=crop&q=80"
                alt="House exterior"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>house-exterior.jpg</AttachmentTitle>
              <AttachmentDescription>JPG · 1.4 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove house-exterior.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
            <AttachmentTrigger
              render={
                <a
                  href="https://images.unsplash.com/photo-1494526585095-c41746248156?w=900&auto=format&fit=crop&q=80"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open house-exterior.jpg"
                />
              }
            />
          </Attachment>
        </AttachmentGroup>
      </div>
    </Example>
  )
}

function AttachmentImageStates() {
  return (
    <Example title="Image States" className="gap-8">
      <div className="flex w-full flex-col gap-3">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Horizontal
        </div>
        <div className="flex flex-col gap-2">
          <Attachment state="idle" className="w-full">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
                alt="Office"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>office-reference.jpg</AttachmentTitle>
              <AttachmentDescription>Ready to upload</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove office-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="uploading" className="w-full">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
                alt="Workspace"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>workspace.png</AttachmentTitle>
              <AttachmentDescription>Uploading · 72%</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove workspace.png">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="processing" className="w-full">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80"
                alt="Desk"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>desk-reference.jpg</AttachmentTitle>
              <AttachmentDescription>Processing image</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove desk-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="error" className="w-full">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
                alt="Office"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>office-reference.jpg</AttachmentTitle>
              <AttachmentDescription>Upload failed</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Retry image upload">
                <HugeiconsIcon icon={RefreshIcon} />
              </AttachmentAction>
              <AttachmentAction aria-label="Remove attachment">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="done" className="w-full">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
                alt="Workspace"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>workspace.png</AttachmentTitle>
              <AttachmentDescription>Uploaded · 1.2 MB</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove workspace.png">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="px-1 text-xs font-medium text-muted-foreground">
          Vertical
        </div>
        <AttachmentGroup className="w-full">
          <Attachment state="idle" orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
                alt="Office"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>office-reference.jpg</AttachmentTitle>
              <AttachmentDescription>Ready</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove office-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="uploading" orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
                alt="Workspace"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>workspace.png</AttachmentTitle>
              <AttachmentDescription>Uploading</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove workspace.png">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="processing" orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80"
                alt="Desk"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>desk-reference.jpg</AttachmentTitle>
              <AttachmentDescription>Processing</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove desk-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="error" orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
                alt="Office"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>office-reference.jpg</AttachmentTitle>
              <AttachmentDescription>Failed</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Retry office-reference.jpg">
                <HugeiconsIcon icon={RefreshIcon} />
              </AttachmentAction>
              <AttachmentAction aria-label="Remove office-reference.jpg">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
          <Attachment state="done" orientation="vertical">
            <AttachmentMedia variant="image">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
                alt="Workspace"
              />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>workspace.png</AttachmentTitle>
              <AttachmentDescription>Done</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label="Remove workspace.png">
                <HugeiconsIcon icon={Cancel01Icon} />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        </AttachmentGroup>
      </div>
    </Example>
  )
}

function AttachmentSizes() {
  return (
    <Example title="Sizes" className="gap-3">
      <Attachment size="default" className="w-full">
        <AttachmentMedia>
          <HugeiconsIcon icon={FileIcon} />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>Default attachment</AttachmentTitle>
          <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <Attachment size="sm" className="w-full">
        <AttachmentMedia>
          <HugeiconsIcon icon={FileIcon} />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>Small attachment</AttachmentTitle>
          <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <Attachment size="xs" className="w-full">
        <AttachmentMedia>
          <HugeiconsIcon icon={FileIcon} />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>Extra small attachment</AttachmentTitle>
        </AttachmentContent>
      </Attachment>
    </Example>
  )
}

function AttachmentScrollableGroup() {
  return (
    <Example title="Scrollable Group" className="gap-4">
      <AttachmentGroup className="w-full">
        <Attachment className="w-64">
          <AttachmentMedia>
            <HugeiconsIcon icon={FileIcon} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>briefing-notes.pdf</AttachmentTitle>
            <AttachmentDescription>PDF · 1.4 MB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove briefing-notes.pdf">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment className="w-64">
          <AttachmentMedia variant="image">
            <img
              src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"
              alt="Workspace"
            />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>workspace.png</AttachmentTitle>
            <AttachmentDescription>PNG · 820 KB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove workspace.png">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment className="w-64">
          <AttachmentMedia>
            <HugeiconsIcon icon={TableIcon} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>customers.csv</AttachmentTitle>
            <AttachmentDescription>CSV · 18 KB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove customers.csv">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment className="w-64">
          <AttachmentMedia>
            <HugeiconsIcon icon={File01Icon} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>renderer.tsx</AttachmentTitle>
            <AttachmentDescription>TSX · 12 KB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove renderer.tsx">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
      <AttachmentGroup className="w-full">
        <Attachment orientation="vertical">
          <AttachmentMedia>
            <HugeiconsIcon icon={FileIcon} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>invoice.pdf</AttachmentTitle>
            <AttachmentDescription>PDF</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove invoice.pdf">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment orientation="vertical">
          <AttachmentMedia variant="image" className="aspect-square w-full">
            <img
              src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=900&auto=format&fit=crop&q=80"
              alt="Desk"
            />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>desk.jpg</AttachmentTitle>
            <AttachmentDescription>JPG</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove desk.jpg">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment orientation="vertical">
          <AttachmentMedia>
            <HugeiconsIcon icon={File01Icon} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>assets.zip</AttachmentTitle>
            <AttachmentDescription>ZIP</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove assets.zip">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment orientation="vertical">
          <AttachmentMedia variant="image" className="aspect-square w-full">
            <img
              src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&auto=format&fit=crop&q=80"
              alt="Office"
            />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>office.jpg</AttachmentTitle>
            <AttachmentDescription>JPG</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove office.jpg">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment orientation="vertical">
          <AttachmentMedia>
            <HugeiconsIcon icon={FileIcon} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>notes.pdf</AttachmentTitle>
            <AttachmentDescription>PDF</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Remove notes.pdf">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </Example>
  )
}

function AttachmentTriggers() {
  const [isVisible, setIsVisible] = React.useState(true)

  return (
    <Example title="Triggers" className="gap-3">
      {isVisible ? (
        <Attachment className="w-full">
          <AttachmentMedia>
            <HugeiconsIcon icon={FileIcon} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>contract-review.pdf</AttachmentTitle>
            <AttachmentDescription>PDF · 820 KB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Download attachment">
              <HugeiconsIcon icon={Download01Icon} />
            </AttachmentAction>
            <AttachmentAction
              aria-label="Remove attachment"
              onClick={() => setIsVisible(false)}
            >
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
          <AttachmentTrigger
            render={
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                aria-label="Open contract-review.pdf"
              />
            }
          />
        </Attachment>
      ) : (
        <Button variant="outline" onClick={() => setIsVisible(true)}>
          Restore attachment
        </Button>
      )}
      <Dialog>
        <Attachment className="w-full">
          <AttachmentMedia>
            <HugeiconsIcon icon={FileSearchIcon} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>research-summary.pdf</AttachmentTitle>
            <AttachmentDescription>Open preview dialog</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="Copy link">
              <HugeiconsIcon icon={Copy01Icon} />
            </AttachmentAction>
            <AttachmentAction aria-label="Remove research-summary.pdf">
              <HugeiconsIcon icon={Cancel01Icon} />
            </AttachmentAction>
          </AttachmentActions>
          <DialogTrigger
            render={
              <AttachmentTrigger aria-label="Preview research-summary.pdf" />
            }
          />
        </Attachment>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>research-summary.pdf</DialogTitle>
            <DialogDescription>
              Attachment triggers can open dialogs while actions remain
              independently reachable.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Example>
  )
}
