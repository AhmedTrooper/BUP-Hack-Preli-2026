"use client"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

export function ServiceMonitor() {
  const { health, healthLoading, checkHealth } = useAppStore()

  const services = [
    { name: "PostgreSQL", status: health?.services?.postgres },
    { name: "Redis", status: health?.services?.redis },
    { name: "NATS JetStream", status: health?.services?.nats },
    { name: "MinIO S3", status: health?.services?.s3 },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              health?.status === "ready"
                ? "bg-emerald-500 animate-pulse"
                : "bg-amber-500"
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            System State: {health?.status || "Checking"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => checkHealth()}
          disabled={healthLoading}
          className="h-7 text-xs"
        >
          {healthLoading ? "Checking..." : "Refresh Status"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-xs"
          >
            <span className="text-xs font-medium text-muted-foreground">{svc.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                svc.status === "connected"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {svc.status || "offline"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
