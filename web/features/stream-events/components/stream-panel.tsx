"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { PublishStreamSchema } from "@/lib/schemas"

export function StreamPanel() {
  const { streamEvents, publishStream, setNotification } = useAppStore()

  const [eventType, setEventType] = useState("USER_SIGNUP")
  const [payload, setPayload] = useState('{"tier":"pro"}')

  const handlePublish = async () => {
    const validation = PublishStreamSchema.safeParse({
      event_type: eventType,
      payload,
    })

    if (!validation.success) {
      setNotification({
        message: validation.error.issues[0]?.message || "Invalid stream payload",
        type: "error",
      })
      return
    }

    await publishStream(eventType, payload)
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <h2 className="text-sm font-semibold tracking-tight">Redis Streams</h2>
      <p className="text-xs text-muted-foreground">
        Event-driven append-only streams with background consumer workers
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Event Type"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="w-1/3 rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="text"
          placeholder="JSON payload"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
        />
        <Button size="sm" onClick={handlePublish} className="h-8.5 text-xs">
          Publish Stream
        </Button>
      </div>

      <div className="mt-4 max-h-32 overflow-y-auto space-y-1.5 font-mono text-[11px]">
        {streamEvents.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground font-sans">
            No stream events published yet
          </p>
        ) : (
          streamEvents.map((evt) => (
            <div key={evt.id} className="rounded bg-muted/40 p-1.5 flex justify-between">
              <span className="text-primary font-semibold">{evt.eventType}</span>
              <span className="text-muted-foreground text-[10px]">{evt.id}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
