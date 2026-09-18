"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { AiGenerateRequestSchema } from "@/lib/schemas"

export function AiPanel() {
  const { aiResult, aiLoading, generateAi, setNotification } = useAppStore()
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("gemini-1.5-flash")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = AiGenerateRequestSchema.safeParse({ prompt, model })
    if (!validation.success) {
      setNotification({
        message: validation.error.issues[0]?.message || "Invalid prompt",
        type: "error",
      })
      return
    }

    await generateAi(prompt, model)
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">AI Agent & Completions</h2>
          <p className="text-xs text-muted-foreground">High-performance AI model completions</p>
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-lg border bg-background px-2 py-1 text-xs text-muted-foreground outline-hidden"
        >
          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
          <option value="gemini-1.5-pro">gemini-1.5-pro</option>
          <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          rows={2}
          placeholder="Enter prompt or query for AI agent..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded-lg border bg-background p-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" size="sm" disabled={aiLoading} className="w-full">
          {aiLoading ? "Generating..." : "Generate AI Completion"}
        </Button>
      </form>

      {aiResult && (
        <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs">
          <span className="font-semibold text-foreground">Response:</span>
          <p className="mt-1 text-muted-foreground leading-relaxed">{aiResult}</p>
        </div>
      )}
    </div>
  )
}
