"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL } from "@/lib/env"

export function NavigationBar() {
  const pathname = usePathname()
  const { apiConnected, apiLatencyMs } = useAppStore()

  return (
    <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-base shadow-sm group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-foreground">
                  GridWise EMS
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  v2.0 Enterprise
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Autonomous Campus Microgrid & Energy Dispatch Platform
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-xs font-medium ml-4">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Energy Dispatch Studio
            </Link>
            <Link
              href="/docs"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/docs"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Documentation & Guides
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="md:hidden text-xs text-primary font-medium hover:underline mr-2"
          >
            Docs ↗
          </Link>

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
              className={`h-2 w-2 rounded-full ${
                apiConnected === true
                  ? "bg-emerald-500 animate-pulse"
                  : apiConnected === false
                    ? "bg-destructive"
                    : "bg-muted-foreground"
              }`}
            />
            <span className="font-mono text-[11px]">
              {apiConnected === true
                ? `Engine Online (${apiLatencyMs}ms)`
                : apiConnected === false
                  ? "Engine Offline"
                  : "Connecting..."}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
