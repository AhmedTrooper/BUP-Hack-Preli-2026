"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { SetCacheSchema } from "@/lib/schemas"

export function CachePanel() {
  const { cacheResult, cacheLoading, setCache, getCache, setNotification } = useAppStore()

  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  const [ttl, setTtl] = useState("")

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedTtl = ttl ? parseInt(ttl, 10) : undefined

    const validation = SetCacheSchema.safeParse({
      key,
      value,
      ttl_seconds: parsedTtl,
    })

    if (!validation.success) {
      setNotification({
        message: validation.error.issues[0]?.message || "Invalid input",
        type: "error",
      })
      return
    }

    await setCache(key, value, parsedTtl)
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <h2 className="text-sm font-semibold tracking-tight">Redis Cache</h2>
      <p className="text-xs text-muted-foreground">In-memory caching with optional TTL</p>

      <form onSubmit={handleSet} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Key (e.g. session:user-1)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            placeholder="TTL in seconds (optional)"
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Value payload"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" size="sm" disabled={cacheLoading} className="h-8.5 text-xs">
            Set Key
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => key && getCache(key)}
            disabled={cacheLoading || !key}
            className="h-8.5 text-xs"
          >
            Get Key
          </Button>
        </div>
      </form>

      {cacheResult !== null && (
        <div className="mt-3 rounded-lg border bg-muted/30 p-2.5 text-xs font-mono">
          Cached Value: <span className="font-semibold text-primary">{cacheResult}</span>
        </div>
      )}
    </div>
  )
}
