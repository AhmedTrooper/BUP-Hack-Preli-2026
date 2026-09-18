"use client"

import { useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { ErrorBoundary } from "@/components/error-boundary"
import { useAppStore } from "@/lib/store"
import { NavigationBar } from "@/components/navigation-bar"
import { BackendTelemetryBadge } from "@/components/backend-telemetry-badge"
import { EnergyPanel } from "@/features/energy/components/energy-panel"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  return (
    <ErrorBoundary>
      <GridWiseDashboard />
    </ErrorBoundary>
  )
}

function GridWiseDashboard() {
  const { notification, setNotification, checkHealth } = useAppStore()

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

      <NavigationBar />

      <main className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Judge Telemetry & Active Backend Endpoints */}
        <section>
          <BackendTelemetryBadge />
        </section>

        {/* Onboarding & Purpose Hero Banner */}
        <section className="rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs py-1 px-3">
                  <span className="mr-1">⚡</span> Enterprise Microgrid Dispatch Engine
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Autonomous 24-Hour Campus Energy Scheduling
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                GridWise minimizes campus utility electricity expenses by arbitrating Time-of-Use (ToU) grid tariffs, maximizing rooftop solar self-consumption, and translating natural-language maintenance logs into strict mathematical constraints for Simplex LP.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/docs"
                className="flex-1 sm:flex-initial text-center rounded-lg border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
              >
                📖 Platform Manual
              </Link>
              <Link
                href="/docs#directives"
                className="flex-1 sm:flex-initial text-center rounded-lg border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
              >
                ⚙️ Directives Taxonomy
              </Link>
            </div>
          </div>

          {/* 3 Steps Visual Guide */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-5 border-t border-border/60">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-background/60 sm:bg-transparent sm:p-0 border sm:border-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-sm font-bold shrink-0">
                1
              </span>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Select Operating Profile</h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Load an official campus scenario preset or customize battery capacity and limits.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-background/60 sm:bg-transparent sm:p-0 border sm:border-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-sm font-bold shrink-0">
                2
              </span>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Review Operator Shift Notes</h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Inspect natural-language maintenance tickets (panel cleaning, charger outages).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-background/60 sm:bg-transparent sm:p-0 border sm:border-0">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-sm font-bold shrink-0">
                3
              </span>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Solve Optimal Dispatch</h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                  Simplex LP minimizes grid costs in &lt;50ms with 100% verified physical invariants.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Energy Studio Component */}
        <section>
          <EnergyPanel />
        </section>

        {/* Technical Architecture Pillar Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>🧠</span> 1. LLM Directive Parsing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Accepts 1 to 3 natural-language operator shift notes. Leverages multi-provider LLM
                to map unstructured notes into strict machine-verifiable directives:{" "}
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  solar_reduction
                </code>
                ,{" "}
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  minimum_battery_reserve
                </code>
                ,{" "}
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  no_charge_window
                </code>
                ,{" "}
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  no_discharge_window
                </code>
                ,{" "}
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                  max_grid_window
                </code>
                , and{" "}
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">no_op</code>.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>⚡</span> 2. Simplex LP Solver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Constructs an exact Linear Program across the 24-hour horizon using Simplex LP.
                Optimizes total electricity cost while satisfying hourly energy balance, battery
                transfer limits, reserve ceilings, and end-of-day neutrality.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>🛡️</span> 3. Deterministic Invariant Replay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Before returning dispatch plans, the engine independently verifies physical invariants
                within 0.01 kWh & 0.01 BDT tolerance. Guarantees 100% compliance with zero constraint
                violations.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        GridWise EMS v2.0 Enterprise · Autonomous Campus Microgrid & Energy Dispatch Platform
      </footer>
    </div>
  )
}
