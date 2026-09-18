"use client"

import { useState } from "react"
import { NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL } from "@/lib/env"
import { useAppStore } from "@/lib/store"

export function BackendTelemetryBadge() {
  const { apiConnected, apiLatencyMs } = useAppStore()
  const [copiedType, setCopiedType] = useState<"api" | "ws" | null>(null)

  const copyToClipboard = (text: string, type: "api" | "ws") => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
  }

  return (
    <div className="rounded-xl border bg-card/70 backdrop-blur-xs p-3.5 shadow-2xs text-xs space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground tracking-tight text-[11px] uppercase">
            Active Backend Endpoints (Judge Inspection)
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <span>Latency:</span>
          <span className={apiConnected ? "text-emerald-500 font-bold" : "text-destructive"}>
            {apiConnected ? `${apiLatencyMs}ms` : "Offline"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
        {/* HTTP REST API Endpoint */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 border px-2.5 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary shrink-0">
              REST HTTP
            </span>
            <span className="truncate text-foreground font-medium" title={NEXT_PUBLIC_API_URL}>
              {NEXT_PUBLIC_API_URL}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(NEXT_PUBLIC_API_URL, "api")}
            className="shrink-0 text-muted-foreground hover:text-foreground text-[10px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
            title="Copy API URL"
          >
            {copiedType === "api" ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>

        {/* WebSocket WSS Endpoint */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 border px-2.5 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              WSS STREAM
            </span>
            <span className="truncate text-foreground font-medium" title={NEXT_PUBLIC_WS_URL}>
              {NEXT_PUBLIC_WS_URL}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(NEXT_PUBLIC_WS_URL, "ws")}
            className="shrink-0 text-muted-foreground hover:text-foreground text-[10px] px-1.5 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
            title="Copy WebSocket URL"
          >
            {copiedType === "ws" ? "✓ Copied" : "📋 Copy"}
          </button>
        </div>
      </div>
    </div>
  )
}
