"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/error"
import { NEXT_PUBLIC_API_URL } from "@/lib/env"
import {
  OptimizeEnergyRequest,
  OptimizeEnergyResponse,
  OptimizeEnergyRequestSchema,
  BatteryParams,
} from "@/lib/schemas"
import { PRESET_SCENARIOS, PresetScenario } from "../data/presets"
import { EnergyCharts } from "./energy-charts"
import { ComplianceAudit } from "./compliance-audit"
import { PipelineVisualizer } from "./pipeline-visualizer"

export function EnergyPanel() {
  const [selectedPreset, setSelectedPreset] = useState<PresetScenario>(PRESET_SCENARIOS[0])
  const [notes, setNotes] = useState<string[]>(PRESET_SCENARIOS[0].request.operator_notes)
  const [battery, setBattery] = useState<BatteryParams>(PRESET_SCENARIOS[0].request.battery)
  const [showParamEditor, setShowParamEditor] = useState(false)
  const [tableFilter, setTableFilter] = useState<"all" | "charge" | "discharge" | "idle">("all")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OptimizeEnergyResponse | null>(null)
  const [executionMs, setExecutionMs] = useState<number | null>(null)
  const [copiedCurl, setCopiedCurl] = useState(false)

  const handleSelectPreset = (preset: PresetScenario) => {
    setSelectedPreset(preset)
    setNotes(preset.request.operator_notes)
    setBattery(preset.request.battery)
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
      battery,
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

  // Cost Savings & Financial Analytics vs unoptimized baseline
  const financialStats = useMemo(() => {
    if (!result) return null

    let unoptimizedCost = 0
    let unoptimizedGridKwh = 0

    for (const h of selectedPreset.request.hours) {
      const netDemand = Math.max(0, h.demand_kwh - h.solar_kwh)
      unoptimizedGridKwh += netDemand
      unoptimizedCost += netDemand * h.tariff_bdt_per_kwh
    }

    const savingsBdt = Math.max(0, unoptimizedCost - result.total_cost_bdt)
    const savingsPercent = unoptimizedCost > 0 ? (savingsBdt / unoptimizedCost) * 100 : 0

    let totalDischargeKwh = 0
    let totalSolarAvailable = 0
    let totalSolarUsed = 0

    for (let i = 0; i < 24; i++) {
      const p = result.hourly_plan[i]
      if (p.battery_action === "discharge") {
        totalDischargeKwh += p.battery_kwh
      }
      totalSolarUsed += p.solar_used_kwh
      totalSolarAvailable += selectedPreset.request.hours[i].solar_kwh
    }

    return {
      unoptimizedCost,
      unoptimizedGridKwh,
      savingsBdt,
      savingsPercent,
      totalDischargeKwh,
      solarAbsorptionPercent:
        totalSolarAvailable > 0 ? (totalSolarUsed / totalSolarAvailable) * 100 : 100,
    }
  }, [result, selectedPreset])

  const copyCurl = () => {
    const payload: OptimizeEnergyRequest = {
      scenario_id: selectedPreset.request.scenario_id,
      operator_notes: notes.filter((n) => n.trim().length > 0),
      hours: selectedPreset.request.hours,
      battery,
    }

    const curl = `curl -X POST ${NEXT_PUBLIC_API_URL}/optimize-energy \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload)}'`
    navigator.clipboard.writeText(curl)
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 2500)
  }

  const exportJson = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gridwise_dispatch_${result.scenario_id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredPlan = useMemo(() => {
    if (!result) return []
    if (tableFilter === "all") return result.hourly_plan
    return result.hourly_plan.filter((item) => item.battery_action === tableFilter)
  }, [result, tableFilter])

  return (
    <div className="space-y-8">
      {/* Studio Header Card */}
      <div className="rounded-2xl border bg-card/85 backdrop-blur-md p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                    GridWise Energy Dispatch Studio
                  </h2>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Simplex LP Ready
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Select a reference scenario or enter custom operator logs to solve the 24-hour dispatch
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-w-full">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Reference Scenarios:</span>
              <span className="sm:hidden text-[10px] text-muted-foreground/80">Swipe ↔</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full">
              {PRESET_SCENARIOS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    selectedPreset.id === preset.id
                      ? "bg-primary text-primary-foreground shadow-xs font-bold ring-2 ring-primary/30"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
                  }`}
                >
                  {preset.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Preset Info */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border bg-muted/20 p-3 sm:p-3.5 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-xs">{selectedPreset.label}</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-mono text-primary">
                {selectedPreset.id}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{selectedPreset.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowParamEditor(!showParamEditor)}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
          >
            {showParamEditor ? "Hide Battery Specs ▲" : "Inspect / Edit Battery Specs ▼"}
          </button>
        </div>

        {/* Expandable Battery Parameters Editor */}
        {showParamEditor && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border bg-muted/10 p-3.5 text-xs">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">
                Capacity (kWh)
              </label>
              <input
                type="number"
                value={battery.capacity_kwh}
                onChange={(e) =>
                  setBattery({ ...battery, capacity_kwh: Number(e.target.value) || 1 })
                }
                className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">
                Initial SoC (kWh)
              </label>
              <input
                type="number"
                value={battery.initial_energy_kwh}
                onChange={(e) =>
                  setBattery({ ...battery, initial_energy_kwh: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">
                Min Reserve (kWh)
              </label>
              <input
                type="number"
                value={battery.minimum_energy_kwh}
                onChange={(e) =>
                  setBattery({ ...battery, minimum_energy_kwh: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">
                Max Charge (kWh/h)
              </label>
              <input
                type="number"
                value={battery.max_charge_kwh_per_hour}
                onChange={(e) =>
                  setBattery({ ...battery, max_charge_kwh_per_hour: Number(e.target.value) || 1 })
                }
                className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase">
                Max Discharge (kWh/h)
              </label>
              <input
                type="number"
                value={battery.max_discharge_kwh_per_hour}
                onChange={(e) =>
                  setBattery({ ...battery, max_discharge_kwh_per_hour: Number(e.target.value) || 1 })
                }
                className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* Natural Language Notes Input */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Natural-Language Operator Shift Notes (1 to 3 notes)
              </label>
              <p className="text-[11px] text-muted-foreground">
                The LLM cognitive pipeline translates these strings into mathematical LP constraints
              </p>
            </div>
            {notes.length < 3 && (
              <button
                type="button"
                onClick={handleAddNote}
                className="text-xs text-primary hover:underline font-semibold cursor-pointer"
              >
                + Add Shift Note
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {notes.map((note, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="mt-2 text-[11px] font-mono font-semibold text-muted-foreground px-2 py-1 rounded bg-muted/50">
                  #{idx}
                </span>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => handleNoteChange(idx, e.target.value)}
                  placeholder="e.g. Facilities will wash rooftop solar panels from noon until 2 PM. Usable solar roughly 25%."
                  className="w-full rounded-xl border bg-background p-3 text-xs outline-hidden focus:ring-2 focus:ring-primary/20 leading-relaxed font-sans"
                />
                {notes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNote(idx)}
                    className="mt-2 text-xs text-destructive hover:underline cursor-pointer px-1"
                    title="Remove note"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Button & Utilities */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
          <Button
            onClick={handleOptimize}
            disabled={loading}
            size="lg"
            className="w-full sm:flex-1 font-bold text-xs sm:text-sm py-2.5 sm:py-3 cursor-pointer shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Parsing Directives & Solving Simplex LP...
              </span>
            ) : (
              "⚡ Run 24-Hour Optimization (POST /optimize-energy)"
            )}
          </Button>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={copyCurl}
              className="flex-1 sm:flex-initial text-center rounded-xl border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0 shadow-2xs"
            >
              {copiedCurl ? "✓ Copied cURL!" : "📋 Copy cURL"}
            </button>
            {result && (
              <button
                type="button"
                onClick={exportJson}
                className="flex-1 sm:flex-initial text-center rounded-xl border bg-background px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 cursor-pointer transition-colors shrink-0 shadow-2xs"
              >
                📥 Export JSON
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <strong>Optimization Infeasibility / Error:</strong> {error}
          </div>
        )}
      </div>

      {/* 4-Stage Autonomous Pipeline Visualizer */}
      <PipelineVisualizer />

      {/* Results Section */}
      {result && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
          {/* Executive KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="rounded-2xl border bg-card/90 p-3.5 sm:p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary/70" />
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Total Grid Cost
              </span>
              <div className="mt-1 text-xl sm:text-2xl font-black text-foreground truncate">
                ৳ {result.total_cost_bdt.toFixed(2)}
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
                {financialStats
                  ? `↓ ৳ ${financialStats.savingsBdt.toFixed(0)} (${financialStats.savingsPercent.toFixed(1)}% savings)`
                  : "Optimal minimum"}
              </span>
            </div>

            <div className="rounded-2xl border bg-card/90 p-3.5 sm:p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500/70" />
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Grid Purchased
              </span>
              <div className="mt-1 text-xl sm:text-2xl font-black text-foreground truncate">
                {result.total_grid_kwh.toFixed(1)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">24h total intake</span>
            </div>

            <div className="rounded-2xl border bg-card/90 p-3.5 sm:p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/70" />
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Peak Demand
              </span>
              <div className="mt-1 text-xl sm:text-2xl font-black text-foreground truncate">
                {result.peak_grid_kwh.toFixed(1)}{" "}
                <span className="text-xs font-normal text-muted-foreground">kWh</span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Maximum single hour</span>
            </div>

            <div className="rounded-2xl border bg-card/90 p-3.5 sm:p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500/70" />
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Solar Absorption
              </span>
              <div className="mt-1 text-xl sm:text-2xl font-black text-amber-500 truncate">
                {financialStats?.solarAbsorptionPercent.toFixed(1)}%
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Zero grid solar export</span>
            </div>

            <div className="col-span-2 lg:col-span-1 rounded-2xl border bg-card/90 p-3.5 sm:p-4 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/70" />
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Engine Latency
              </span>
              <div className="mt-1 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate">
                {executionMs ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">ms</span>
              </div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 block mt-0.5">
                Optimal &lt;50ms Simplex
              </span>
            </div>
          </div>

          {/* Strategy Summary Card */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 text-xs">
            <span className="font-bold text-primary flex items-center gap-1.5 text-xs sm:text-sm">
              <span>📌</span> Autonomous Dispatch Strategy:
            </span>
            <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
              {result.plan_summary}
            </p>
          </div>

          {/* Visual Charts Component */}
          <EnergyCharts
            plan={result.hourly_plan}
            hours={selectedPreset.request.hours}
            battery={battery}
          />

          {/* LLM Directive Interpretations Section */}
          <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span>🧠</span> LLM Cognitive Directive Interpretations
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Extracted by multi-provider LLM framework and validated by deterministic guardrails
                </p>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground self-start sm:self-auto bg-muted px-2 py-0.5 rounded">
                {result.directive_interpretation.length} note(s) processed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.directive_interpretation.map((interp) => {
                const getBadgeColor = (type: string) => {
                  switch (type) {
                    case "solar_reduction":
                      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    case "minimum_battery_reserve":
                      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    case "no_charge_window":
                      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    case "no_discharge_window":
                      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                    case "max_grid_window":
                      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                    default:
                      return "bg-muted text-muted-foreground border-border"
                  }
                }

                return (
                  <div
                    key={interp.note_index}
                    className="rounded-xl border bg-background p-3.5 sm:p-4 text-xs space-y-2.5 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          Note #{interp.note_index}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${getBadgeColor(
                              interp.directive_type
                            )}`}
                          >
                            {interp.directive_type}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              interp.applies
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {interp.applies ? "Enforced" : "No-Op"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/30 p-2 text-[11px] text-muted-foreground italic border">
                        &quot;{notes[interp.note_index] || "Note text not provided"}&quot;
                      </div>

                      <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                        {interp.explanation}
                      </p>
                    </div>

                    {interp.structured_adjustment ? (
                      <div className="rounded-lg bg-muted/40 p-2.5 font-mono text-[11px] space-y-1 border">
                        {interp.structured_adjustment.hours && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Window:</span>
                            <span className="font-semibold text-foreground">
                              [{interp.structured_adjustment.hours.join(", ")}] (
                              {interp.structured_adjustment.hours.length} hrs)
                            </span>
                          </div>
                        )}
                        {interp.structured_adjustment.factor !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Solar Factor:</span>
                            <span className="font-semibold text-foreground">
                              {interp.structured_adjustment.factor} (
                              {(interp.structured_adjustment.factor * 100).toFixed(0)}% output)
                            </span>
                          </div>
                        )}
                        {interp.structured_adjustment.minimum_energy_kwh !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reserve Floor:</span>
                            <span className="font-semibold text-foreground">
                              {interp.structured_adjustment.minimum_energy_kwh.toFixed(1)} kWh
                            </span>
                          </div>
                        )}
                        {interp.structured_adjustment.max_grid_kwh !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Grid Import Cap:</span>
                            <span className="font-semibold text-foreground">
                              {interp.structured_adjustment.max_grid_kwh.toFixed(1)} kWh
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-muted/20 p-2 text-[11px] text-muted-foreground text-center border">
                        Null structured adjustment (Distractor/irrelevant notice)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mathematical & Physical Invariant Audit Component */}
          <ComplianceAudit
            plan={result.hourly_plan}
            hours={selectedPreset.request.hours}
            battery={battery}
            directives={result.directive_interpretation}
          />

          {/* 24-Hour Dispatch Schedule Matrix Table */}
          <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span>📋</span> 24-Hour Optimal Dispatch Matrix
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete hourly breakdown of campus demand, solar, storage transitions, and grid tariffs
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs self-start sm:self-auto">
                <span className="text-muted-foreground mr-1 text-[11px]">Action:</span>
                {(["all", "charge", "discharge", "idle"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTableFilter(filter)}
                    className={`rounded-md px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium uppercase transition-colors cursor-pointer ${
                      tableFilter === filter
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Horizontal Scroll Indicator */}
            <div className="sm:hidden text-[11px] text-muted-foreground flex items-center justify-between px-1 mb-2 bg-muted/30 py-1.5 rounded-lg border">
              <span className="flex items-center gap-1.5">
                <span>↔</span> Swipe table horizontally for all metrics
              </span>
              <span className="font-mono text-[10px] font-bold bg-background px-1.5 py-0.5 rounded border">
                10 Columns
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-xl border bg-background">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead className="sticky top-0 bg-muted text-[11px] text-muted-foreground uppercase border-b backdrop-blur-md">
                  <tr>
                    <th className="py-2.5 px-3">Hour</th>
                    <th className="py-2.5 px-3">Demand (kWh)</th>
                    <th className="py-2.5 px-3">Solar Available</th>
                    <th className="py-2.5 px-3">Solar Used</th>
                    <th className="py-2.5 px-3">Grid Import</th>
                    <th className="py-2.5 px-3">Battery Action</th>
                    <th className="py-2.5 px-3">Transfer (kWh)</th>
                    <th className="py-2.5 px-3">SoC Level</th>
                    <th className="py-2.5 px-3">Tariff (BDT)</th>
                    <th className="py-2.5 px-3">Cost (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono text-[11px]">
                  {filteredPlan.map((h) => {
                    const originalHour = selectedPreset.request.hours[h.hour]
                    const hourlyCost = h.grid_kwh * originalHour.tariff_bdt_per_kwh
                    const socPercent = Math.round(
                      (h.battery_energy_after_kwh / battery.capacity_kwh) * 100
                    )

                    return (
                      <tr key={h.hour} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 px-3 font-bold text-foreground">
                          {String(h.hour).padStart(2, "0")}:00
                        </td>
                        <td className="py-2 px-3">{originalHour.demand_kwh.toFixed(1)}</td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {originalHour.solar_kwh.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-amber-500 font-semibold">
                          {h.solar_used_kwh.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-sky-500 font-semibold">
                          {h.grid_kwh.toFixed(2)}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-sans font-bold uppercase ${
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
                        <td className="py-2 px-3">{h.battery_kwh.toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground min-w-[45px]">
                              {h.battery_energy_after_kwh.toFixed(1)}
                            </span>
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div
                                style={{ width: `${socPercent}%` }}
                                className="h-full bg-emerald-500"
                              />
                            </div>
                            <span className="text-[9px] text-muted-foreground">
                              {socPercent}%
                            </span>
                          </div>
                        </td>
                        <td
                          className={`py-2 px-3 ${
                            originalHour.tariff_bdt_per_kwh >= 20
                              ? "text-rose-500 font-bold"
                              : "text-muted-foreground"
                          }`}
                        >
                          ৳ {originalHour.tariff_bdt_per_kwh.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 font-bold text-foreground">
                          ৳ {hourlyCost.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
