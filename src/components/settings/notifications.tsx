"use client"

import { NOTIFY_EVENTS } from "@/components/settings/settings-data"
import {
  SettingsFrame,
  SettingsSection,
  SettingsTable,
  useSettings,
} from "@/components/settings/settings-kit"
import { Button } from "@/design-system/ui/button"
import { Checkbox } from "@/design-system/ui/checkbox"
import { TableCell, TableRow } from "@/design-system/ui/table"

type ChannelKey = "push" | "text" | "email"

/** What reaches the physician and on which channel, from the AGC
    "Provider Account > Notification" frame. The clinic manager sets the
    practice default; each provider keeps their own copy under `storageKey`. */
export function NotificationsPage({ storageKey }: { storageKey: string }) {
  const settings = useSettings(storageKey, { groups: NOTIFY_EVENTS })
  const groups = settings.draft.groups

  function set(id: string, key: ChannelKey, on: boolean) {
    settings.patch({
      groups: groups.map((g) => ({
        ...g,
        items: g.items.map((item) =>
          item.id === id ? { ...item, [key]: on } : item
        ),
      })),
    })
  }

  const action = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => settings.patch({ groups: NOTIFY_EVENTS })}
      >
        Default
      </Button>
      {settings.actions}
    </div>
  )

  return (
    <SettingsFrame action={action}>
      {groups.map((group) => (
        <SettingsSection key={group.group} title={group.group}>
          <SettingsTable
            columns={[
              { header: "Event" },
              { header: "Push", className: "w-28" },
              { header: "Text", className: "w-28" },
              { header: "Email", className: "w-28" },
            ]}
          >
            {group.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                {(["push", "text", "email"] as const).map((key) => (
                  <TableCell key={key}>
                    <Checkbox
                      checked={item[key]}
                      aria-label={`${key} for ${item.name}`}
                      onCheckedChange={(on) => set(item.id, key, on === true)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </SettingsTable>
        </SettingsSection>
      ))}
    </SettingsFrame>
  )
}
