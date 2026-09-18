"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL } from "@/lib/env"

export function NavigationBar() {
  const pathname = usePathname()
  const { apiConnected, apiLatencyMs } = useAppStore()

  return (
    <header className="border-b bg-card/75 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-base shadow-xs group-hover:scale-105 transition-transform shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  GridWise EMS
                </span>
                <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Autonomous Campus Microgrid & Energy Dispatch Platform
              </p>
            </div>
          </Link>

          {/* Navigation Links - Clean segmented pills */}
          <nav className="flex items-center gap-1.5 text-sm font-medium ml-2 sm:ml-6">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Studio
            </Link>
            <Link
              href="/docs"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/docs"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Docs
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            title={`REST API: ${NEXT_PUBLIC_API_URL}\nWebSocket: ${NEXT_PUBLIC_WS_URL}`}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border cursor-help ${
              apiConnected === true
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : apiConnected === false
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-muted bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                apiConnected === true
                  ? "bg-emerald-500 animate-pulse"
                  : apiConnected === false
                    ? "bg-destructive"
                    : "bg-muted-foreground"
              }`}
            />
            <span className="font-mono text-xs whitespace-nowrap">
              {apiConnected === true
                ? (
                  <>
                    <span className="hidden sm:inline">Engine </span>Online
                    {apiLatencyMs !== null ? ` (${apiLatencyMs}ms)` : ""}
                  </>
                )
                : apiConnected === false
                  ? "Offline"
                  : "Connecting..."}
            </span>
          </div>
        </div>
      </div>
    </header>

  )
}
