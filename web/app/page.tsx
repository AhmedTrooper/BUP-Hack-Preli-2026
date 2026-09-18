"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ErrorBoundary } from "@/components/error-boundary"
import { useAppStore } from "@/lib/store"
import { ServiceMonitor } from "@/features/service-status/service-monitor"
import { AuthPanel } from "@/features/auth/components/auth-panel"
import { AiPanel } from "@/features/ai-agent/components/ai-panel"
import { ItemsPanel } from "@/features/items-crud/components/items-panel"
import { CachePanel } from "@/features/cache-manager/components/cache-panel"
import { StreamPanel } from "@/features/stream-events/components/stream-panel"
import { NatsPanel } from "@/features/nats-pubsub/components/nats-panel"
import { StoragePanel } from "@/features/object-storage/components/storage-panel"
import { RtcPanel } from "@/features/realtime-signaling/components/rtc-panel"

export default function HomePage() {
  return (
    <ErrorBoundary>
      <DashboardView />
    </ErrorBoundary>
  )
}

function DashboardView() {
  const { notification, setNotification } = useAppStore()

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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              ⚡
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Hackathon Core</h1>
              <p className="text-xs text-muted-foreground">Production Real-Time Platform</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8">
          <ServiceMonitor />
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-6">
            <AuthPanel />
            <ItemsPanel />
            <CachePanel />
            <StreamPanel />
          </div>

          <div className="space-y-8 lg:col-span-6">
            <AiPanel />
            <NatsPanel />
            <StoragePanel />
            <RtcPanel />
          </div>
        </div>
      </main>
    </div>
  )
}
