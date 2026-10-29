"use client"

import * as React from "react"
import {
  IconFileCheck,
  IconFileText,
  IconLab,
  IconShieldAlert,
} from "@/design-system/icons"

import { AdminShell } from "@/components/admin/admin-shell"
import {
  BiomarkersPage,
  RangesPage,
  SexAgeRulesPage,
} from "@/components/clinical/catalog"
import { TestCasesPage } from "@/components/clinical/eval-evidence"
import {
  AlertRulesPage,
  ProtocolsPage,
} from "@/components/clinical/protocols-rules"
import {
  type SettingsGroup,
  SettingsHome,
  SettingsRoute,
} from "@/components/settings/settings-kit"

/* The Super Admin's Clinical content console, laid out like Settings: one
   card per area of the feature list, each page under /clinical/[group]/[page]. */

const BASE = "/screens/admin/clinical"

const GROUPS: SettingsGroup[] = [
  {
    id: "catalog",
    title: "Catalog",
    icon: IconLab,
    pages: [
      {
        id: "biomarkers",
        label: "Biomarker definitions",
        render: () => <BiomarkersPage />,
      },
      { id: "ranges", label: "Range management", render: () => <RangesPage /> },
      {
        id: "sex-age",
        label: "Sex and age rules",
        render: () => <SexAgeRulesPage />,
      },
    ],
  },
  {
    id: "protocols",
    title: "Protocols",
    icon: IconFileText,
    pages: [
      {
        id: "library",
        label: "Protocols",
        render: () => <ProtocolsPage />,
      },
    ],
  },
  {
    id: "rules",
    title: "Rules",
    icon: IconShieldAlert,
    pages: [
      { id: "alerts", label: "Alert rules", render: () => <AlertRulesPage /> },
    ],
  },
  {
    id: "eval",
    title: "Eval",
    icon: IconFileCheck,
    pages: [
      {
        id: "cases",
        label: "Test-case library",
        render: () => <TestCasesPage />,
      },
    ],
  },
]

export function ClinicalHome() {
  return (
    <AdminShell active="clinical">
      <SettingsHome base={BASE} groups={GROUPS} title="Clinical content" />
    </AdminShell>
  )
}

export function ClinicalPage({
  group,
  page,
}: {
  group: string
  page: string
}) {
  return (
    <AdminShell active="clinical">
      <SettingsRoute
        base={BASE}
        groups={GROUPS}
        groupId={group}
        pageId={page}
      />
    </AdminShell>
  )
}
