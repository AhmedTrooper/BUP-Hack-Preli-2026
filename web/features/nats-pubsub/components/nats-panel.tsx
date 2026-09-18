"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { NatsPublishSchema } from "@/lib/schemas"

export function NatsPanel() {
  const { natsMessages, publishNats, setNotification } = useAppStore()

  const [subject, setSubject] = useState("events.hackathon")
  const [message, setMessage] = useState("Engine broadcast active")

  const handleBroadcast = async () => {
    const validation = NatsPublishSchema.safeParse({ subject, message })
    if (!validation.success) {
      setNotification({
        message: validation.error.issues[0]?.message || "Invalid NATS input",
        type: "error",
      })
      return
    }

    await publishNats(subject, message)
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <h2 className="text-sm font-semibold tracking-tight">NATS JetStream Pub/Sub</h2>
      <p className="text-xs text-muted-foreground">High-throughput asynchronous messaging broker</p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Subject (e.g. events.orders)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-1/3 rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
        />
        <input
          type="text"
          placeholder="Message body"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
        />
        <Button size="sm" onClick={handleBroadcast} className="h-8.5 text-xs">
          Broadcast
        </Button>
      </div>

      <div className="mt-3 max-h-24 overflow-y-auto space-y-1 font-mono text-[11px]">
        {natsMessages.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground font-sans">
            No NATS messages published yet
          </p>
        ) : (
          natsMessages.map((msg, i) => (
            <div key={i} className="flex justify-between text-muted-foreground">
              <span>
                [{msg.subject}]: {msg.message}
              </span>
              <span className="text-[10px]">{msg.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
