"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ErrorBoundary } from "@/components/error-boundary"
import { useAppStore } from "@/lib/store"
import { EnergyPanel } from "@/features/energy/components/energy-panel"

export default function HomePage() {
  return (
    <ErrorBoundary>
      <GridWiseDashboard />
    </ErrorBoundary>
  )
}

function GridWiseDashboard() {
  const { notification, setNotification, apiConnected, apiLatencyMs, checkHealth } =
    useAppStore()

  useEffect(() => {
    checkHealth()
    const interval = setInterval(() => checkHealth(), 15000)
    return () => clearInterval(interval)
  }, [checkHealth])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notification, setNotification])

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              notification.type === "error"
                ? "bg-destructive text-destructive-foreground"
                : notification.type === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-primary text-primary-foreground"
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
              ⚡
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                GridWise LLM
              </h1>
              <p className="text-xs text-muted-foreground">
                24-Hour Campus Energy Optimization Platform · BUP CSE FEST 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${
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
              <span>
                {apiConnected === true
                  ? `API Online (${apiLatencyMs}ms)`
                  : apiConnected === false
                    ? "API Offline"
                    : "Checking Health..."}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <section>
          <EnergyPanel />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              1. LLM Directive Parsing
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Accepts 1 to 3 natural-language operator shift notes. Leverages multi-provider LLM
              to map unstructured notes into strict machine-verifiable directives:{" "}
              <code className="text-[11px] font-mono bg-muted/60 px-1 py-0.5 rounded">
                solar_reduction
              </code>
              ,{" "}
              <code className="text-[11px] font-mono bg-muted/60 px-1 py-0.5 rounded">
                minimum_battery_reserve
              </code>
              ,{" "}
              <code className="text-[11px] font-mono bg-muted/60 px-1 py-0.5 rounded">
                no_charge_window
              </code>
              ,{" "}
              <code className="text-[11px] font-mono bg-muted/60 px-1 py-0.5 rounded">
                no_discharge_window
              </code>
              ,{" "}
              <code className="text-[11px] font-mono bg-muted/60 px-1 py-0.5 rounded">
                max_grid_window
              </code>
              , and{" "}
              <code className="text-[11px] font-mono bg-muted/60 px-1 py-0.5 rounded">no_op</code>.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              2. Simplex LP Solver
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Constructs an exact Linear Program across the 24-hour horizon using Simplex LP.
              Optimizes total electricity cost while satisfying hourly energy balance, battery
              transfer limits, reserve ceilings, and end-of-day neutrality.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              3. Deterministic Invariant Replay
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Before returning dispatch plans, the engine independently verifies physical invariants
              within 0.01 kWh & 0.01 BDT tolerance. Guarantees 100% compliance with zero constraint
              violations.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        BUP CSE FEST 2026 Hackathon · GridWise LLM Challenge · Built with Rust, Axum, minilp &
        Next.js
      </footer>
    </div>
  )
}
