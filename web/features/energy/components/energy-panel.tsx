"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/error"
import {
  OptimizeEnergyRequest,
  OptimizeEnergyResponse,
  OptimizeEnergyRequestSchema,
} from "@/lib/schemas"
import { PRESET_SCENARIOS, PresetScenario } from "../data/presets"

export function EnergyPanel() {
  const [selectedPreset, setSelectedPreset] = useState<PresetScenario>(PRESET_SCENARIOS[0])
  const [notes, setNotes] = useState<string[]>(PRESET_SCENARIOS[0].request.operator_notes)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OptimizeEnergyResponse | null>(null)
  const [executionMs, setExecutionMs] = useState<number | null>(null)

  const handleSelectPreset = (preset: PresetScenario) => {
    setSelectedPreset(preset)
    setNotes(preset.request.operator_notes)
    setError(null)
  }

  const handleNoteChange = (index: number, val: string) => {
    const updated = [...notes]
    updated[index] = val
    setNotes(updated)
  }

  const handleAddNote = () => {
    if (notes.length < 3) {
      setNotes([...notes, ""])
    }
  }

  const handleRemoveNote = (index: number) => {
    if (notes.length > 1) {
      setNotes(notes.filter((_, i) => i !== index))
    }
  }

  const handleOptimize = async () => {
    setError(null)
    setLoading(true)
    const startTime = performance.now()

    const payload: OptimizeEnergyRequest = {
      scenario_id: selectedPreset.request.scenario_id,
      operator_notes: notes.filter((n) => n.trim().length > 0),
      hours: selectedPreset.request.hours,
      battery: selectedPreset.request.battery,
    }

    const validation = OptimizeEnergyRequestSchema.safeParse(payload)
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Invalid energy scenario format")
      setLoading(false)
      return
    }

    const { data, error: apiErr } = await apiFetch<OptimizeEnergyResponse>("/optimize-energy", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const duration = Math.round(performance.now() - startTime)
    setExecutionMs(duration)
    setLoading(false)

    if (apiErr) {
      setError(apiErr.message || "Optimization request failed")
      return
    }

    if (data) {
      setResult(data)
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              GridWise LLM — 24-Hour Energy Optimizer
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mathematical Simplex LP solver with multi-provider LLM operator directive extraction
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                selectedPreset.id === preset.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              {preset.id}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-xs">
        <div className="flex justify-between items-center text-muted-foreground font-medium">
          <span>{selectedPreset.label}</span>
          <span>Battery: {selectedPreset.request.battery.capacity_kwh} kWh</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground/80">{selectedPreset.description}</p>
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">
            Natural-Language Operator Shift Notes (1 to 3 notes)
          </label>
          {notes.length < 3 && (
            <button
              type="button"
              onClick={handleAddNote}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              + Add Note
            </button>
          )}
        </div>

        {notes.map((note, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <span className="mt-2 text-[11px] font-mono text-muted-foreground">#{idx}</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => handleNoteChange(idx, e.target.value)}
              placeholder="e.g. Facilities will wash panels from noon until 2 PM. Usable solar is 25%."
              className="w-full rounded-lg border bg-background p-2 text-xs outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            {notes.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveNote(idx)}
                className="mt-2 text-xs text-destructive hover:underline cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button
          onClick={handleOptimize}
          disabled={loading}
          size="sm"
          className="w-full font-medium cursor-pointer"
        >
          {loading ? "Solving LP Dispatch with LLM Directives..." : "Run 24-Hour Optimization (POST /optimize-energy)"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <strong>Optimization Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground">Total Grid Cost</span>
              <div className="mt-1 text-lg font-bold text-foreground">
                {result.total_cost_bdt.toFixed(2)}{" "}
                <span className="text-xs font-normal text-muted-foreground">BDT</span>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground">Grid Energy</span>
              <div className="mt-1 text-lg font-bold text-foreground">
                {result.total_grid_kwh.toFixed(2)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground">Peak Grid Demand</span>
              <div className="mt-1 text-lg font-bold text-foreground">
                {result.peak_grid_kwh.toFixed(2)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-3">
              <span className="text-[11px] text-muted-foreground">Latency</span>
              <div className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {executionMs ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">ms</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <span className="font-semibold text-foreground">Plan Strategy Summary:</span>
            <p className="mt-1 text-muted-foreground leading-relaxed">{result.plan_summary}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2">
              LLM Directive Interpretation ({result.directive_interpretation.length} Notes)
            </h3>
            <div className="space-y-2">
              {result.directive_interpretation.map((interp) => (
                <div
                  key={interp.note_index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border bg-background p-3 text-xs gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Note #{interp.note_index}
                      </span>
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {interp.directive_type}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          interp.applies
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {interp.applies ? "Enforced" : "No-Op (Ignored)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{interp.explanation}</p>
                  </div>

                  {interp.structured_adjustment && (
                    <div className="font-mono text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1 shrink-0">
                      {interp.structured_adjustment.hours && (
                        <span>Hours: [{interp.structured_adjustment.hours.join(", ")}] </span>
                      )}
                      {interp.structured_adjustment.factor !== undefined && (
                        <span>Factor: {interp.structured_adjustment.factor} </span>
                      )}
                      {interp.structured_adjustment.minimum_energy_kwh !== undefined && (
                        <span>Min: {interp.structured_adjustment.minimum_energy_kwh} kWh </span>
                      )}
                      {interp.structured_adjustment.max_grid_kwh !== undefined && (
                        <span>Max Grid: {interp.structured_adjustment.max_grid_kwh} kWh </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2">
              Optimal 24-Hour Dispatch Schedule
            </h3>
            <div className="max-h-72 overflow-y-auto rounded-lg border bg-background">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/80 text-[11px] text-muted-foreground uppercase border-b backdrop-blur-xs">
                  <tr>
                    <th className="py-2 px-3">Hour</th>
                    <th className="py-2 px-3">Grid (kWh)</th>
                    <th className="py-2 px-3">Solar Used</th>
                    <th className="py-2 px-3">Battery Action</th>
                    <th className="py-2 px-3">Battery kWh</th>
                    <th className="py-2 px-3">Stored Energy</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono text-[11px]">
                  {result.hourly_plan.map((h) => (
                    <tr key={h.hour} className="hover:bg-muted/30">
                      <td className="py-1.5 px-3 font-semibold text-foreground">
                        {String(h.hour).padStart(2, "0")}:00
                      </td>
                      <td className="py-1.5 px-3">{h.grid_kwh.toFixed(2)}</td>
                      <td className="py-1.5 px-3">{h.solar_used_kwh.toFixed(2)}</td>
                      <td className="py-1.5 px-3">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-sans font-medium uppercase ${
                            h.battery_action === "charge"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : h.battery_action === "discharge"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {h.battery_action}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">{h.battery_kwh.toFixed(2)}</td>
                      <td className="py-1.5 px-3 font-semibold text-foreground">
                        {h.battery_energy_after_kwh.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
