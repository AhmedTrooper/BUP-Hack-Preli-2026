"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { LoginRequestSchema } from "@/lib/schemas"

export function AuthPanel() {
  const { token, currentUser, authLoading, login, logout, setNotification } = useAppStore()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = LoginRequestSchema.safeParse({ username, password })
    if (!validation.success) {
      setNotification({
        message: validation.error.issues[0]?.message || "Invalid credentials",
        type: "error",
      })
      return
    }

    const success = await login(username, password)
    if (success) {
      setPassword("")
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">JWT Security & Auth</h2>
          <p className="text-xs text-muted-foreground">Short-lived access tokens (15-min exp)</p>
        </div>
        {token && (
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Authenticated
          </span>
        )}
      </div>

      {token ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Active Subject:</span>
              <span className="font-semibold text-foreground">{currentUser}</span>
            </div>
            <div className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
              Bearer {token}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="w-full">
            Sign Out
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" size="sm" disabled={authLoading} className="w-full">
            {authLoading ? "Authenticating..." : "Sign In / Issue JWT"}
          </Button>
        </form>
      )}
    </div>
  )
}
