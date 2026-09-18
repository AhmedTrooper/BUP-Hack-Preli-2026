"use client"

import { useState } from "react"
import { NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL } from "@/lib/env"
import { useAppStore } from "@/lib/store"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function BackendTelemetryBadge() {
  const { apiConnected, apiLatencyMs } = useAppStore()
  const [copiedType, setCopiedType] = useState<"api" | "ws" | null>(null)

  const copyToClipboard = (text: string, type: "api" | "ws") => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
  }

  return (
    <Card className="bg-card/70 backdrop-blur-xs p-4 shadow-xs text-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground tracking-tight text-xs uppercase">
            Active Backend Endpoints (Judge Inspection)
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <span>Latency:</span>
          <span className={apiConnected ? "text-emerald-500 font-bold" : "text-destructive"}>
            {apiConnected ? `${apiLatencyMs}ms` : "Offline"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
        {/* HTTP REST API Endpoint */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 border px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold shrink-0">
              REST HTTP
            </Badge>
            <span className="truncate text-foreground font-medium text-xs sm:text-sm" title={NEXT_PUBLIC_API_URL}>
              {NEXT_PUBLIC_API_URL}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(NEXT_PUBLIC_API_URL, "api")}
            className="shrink-0 text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer border border-border/50"
            title="Copy API URL"
          >
            {copiedType === "api" ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>

        {/* WebSocket WSS Endpoint */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 border px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="success" className="text-xs font-bold shrink-0">
              WSS STREAM
            </Badge>
            <span className="truncate text-foreground font-medium text-xs sm:text-sm" title={NEXT_PUBLIC_WS_URL}>
              {NEXT_PUBLIC_WS_URL}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(NEXT_PUBLIC_WS_URL, "ws")}
            className="shrink-0 text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer border border-border/50"
            title="Copy WebSocket URL"
          >
            {copiedType === "ws" ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>
      </div>
    </Card>
  )
}
