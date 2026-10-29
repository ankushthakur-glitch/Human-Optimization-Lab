"use client"

import { IconFlag, IconHistory, IconNotification } from "@/design-system/icons"

import { ProviderShell } from "@/components/provider/provider-shell"
import { AuditLogPage } from "@/components/settings/audit-log"
import { ImportHistoryPage } from "@/components/settings/import-history"
import { NotificationsPage } from "@/components/settings/notifications"
import { PatientFlagsPage } from "@/components/settings/patient-flags"
import {
  type SettingsGroup,
  SettingsHome,
  SettingsRoute,
} from "@/components/settings/settings-kit"

/* The provider's Settings: patient flags (from the Solid EHR "Provider
   Account > Patient Flags" frames, with ready-made flags to start from), their
   own notifications and the audit log of their own activity and of everyone who opened their
   patients' charts. */

const BASE = "/screens/patients/settings"

const GROUPS: SettingsGroup[] = [
  {
    id: "account",
    title: "Provider account",
    icon: IconFlag,
    pages: [
      {
        id: "flags",
        label: "Patient flags",
        render: () => <PatientFlagsPage actor="Dr. Elise Harrington" />,
      },
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    icon: IconNotification,
    pages: [
      {
        id: "notifications",
        label: "Notifications",
        render: () => <NotificationsPage storageKey="provider-notifications" />,
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: IconHistory,
    pages: [
      {
        id: "audit-log",
        label: "Audit log",
        render: () => <AuditLogPage scope="provider" />,
      },
      {
        id: "import-history",
        label: "Import history",
        render: () => <ImportHistoryPage scope="provider" />,
      },
    ],
  },
]

export function ProviderSettingsHome() {
  return (
    <ProviderShell active="settings">
      <SettingsHome base={BASE} groups={GROUPS} />
    </ProviderShell>
  )
}

export function ProviderSettingsPage({
  group,
  page,
}: {
  group: string
  page: string
}) {
  return (
    <ProviderShell active="settings">
      <SettingsRoute
        base={BASE}
        groups={GROUPS}
        groupId={group}
        pageId={page}
      />
    </ProviderShell>
  )
}
