"use client"

import { useState } from "react"
import { HourlyPlanItem, HourlyData, BatteryParams } from "@/lib/schemas"

interface EnergyChartsProps {
  plan: HourlyPlanItem[]
  hours: HourlyData[]
  battery: BatteryParams
}

export function EnergyCharts({ plan, hours, battery }: EnergyChartsProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"dispatch" | "battery" | "tariff">("dispatch")

  const maxDemand = Math.max(...hours.map((h) => h.demand_kwh), 250)
  const maxCapacity = battery.capacity_kwh
  const maxTariff = Math.max(...hours.map((h) => h.tariff_bdt_per_kwh), 30)

  const activeHourData = hoveredHour !== null ? hours[hoveredHour] : null
  const activePlanData = hoveredHour !== null ? plan[hoveredHour] : null

  return (
    <div className="rounded-2xl border bg-card/85 backdrop-blur-md p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>📊</span> 24-Hour Dispatch & Storage Dynamics
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time visual analysis of energy balance, battery state of charge, and tariff arbitrage
          </p>
        </div>

        <div className="w-full sm:w-auto grid grid-cols-3 sm:flex rounded-lg border bg-muted/50 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("dispatch")}
            className={`rounded-md px-2.5 sm:px-3 py-1 sm:py-1.5 transition-all text-center cursor-pointer text-[11px] sm:text-xs ${
              activeTab === "dispatch"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Balance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("battery")}
            className={`rounded-md px-2.5 sm:px-3 py-1 sm:py-1.5 transition-all text-center cursor-pointer text-[11px] sm:text-xs ${
              activeTab === "battery"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            SoC Curve
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tariff")}
            className={`rounded-md px-2.5 sm:px-3 py-1 sm:py-1.5 transition-all text-center cursor-pointer text-[11px] sm:text-xs ${
              activeTab === "tariff"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Arbitrage
          </button>
        </div>
      </div>

      {/* Hover / Tap Info Header Banner */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/20 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="font-semibold text-foreground">
            {hoveredHour !== null ? `Hour ${String(hoveredHour).padStart(2, "0")}:00` : "Hourly Telemetry"}
          </span>
          {activePlanData && activeHourData ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono">
              <span className="text-sky-500 font-semibold">Grid: {activePlanData.grid_kwh.toFixed(1)} kWh</span>
              <span className="text-amber-500 font-semibold">Solar: {activePlanData.solar_used_kwh.toFixed(1)} kWh</span>
              <span className={`font-semibold ${activePlanData.battery_action === "charge" ? "text-emerald-500" : activePlanData.battery_action === "discharge" ? "text-orange-500" : "text-muted-foreground"}`}>
                Bat: {activePlanData.battery_action} ({activePlanData.battery_kwh.toFixed(1)} kWh)
              </span>
              <span className="text-purple-500 font-semibold">Demand: {activeHourData.demand_kwh} kWh</span>
              <span className="text-rose-500 font-semibold">Tariff: ৳{activeHourData.tariff_bdt_per_kwh}</span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Hover or tap any hour bar below to inspect energy breakdown
            </span>
          )}
        </div>
        {hoveredHour !== null && (
          <button
            type="button"
            onClick={() => setHoveredHour(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Chart 1: Energy Balance Stacked Bars */}
      {activeTab === "dispatch" && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3.5 text-[10px] sm:text-[11px] text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Grid
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Solar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500" /> Discharge
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Charge
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-purple-500 inline-block" /> Demand Target
            </span>
          </div>

          <div className="relative h-64 w-full pt-4">
            <div className="absolute inset-0 flex items-end justify-between gap-0.5 sm:gap-1 pb-6">
              {plan.map((item) => {
                const hourDemand = hours[item.hour]?.demand_kwh || 1
                const demandHeight = (hourDemand / maxDemand) * 100

                const gridHeight = (item.grid_kwh / maxDemand) * 100
                const solarHeight = (item.solar_used_kwh / maxDemand) * 100
                const dischargeHeight =
                  item.battery_action === "discharge" ? (item.battery_kwh / maxDemand) * 100 : 0
                const chargeHeight =
                  item.battery_action === "charge" ? (item.battery_kwh / maxDemand) * 100 : 0

                const isHovered = hoveredHour === item.hour

                return (
                  <div
                    key={item.hour}
                    onMouseEnter={() => setHoveredHour(item.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                    onTouchStart={() => setHoveredHour(item.hour)}
                    onClick={() => setHoveredHour(hoveredHour === item.hour ? null : item.hour)}
                    className="relative flex-1 h-full flex flex-col justify-end items-center cursor-pointer group"
                  >
                    {/* Demand target marker */}
                    <div
                      style={{ bottom: `${demandHeight}%` }}
                      className="absolute w-full h-0.5 bg-purple-500 z-20 transition-all opacity-80 group-hover:opacity-100 group-hover:scale-x-125"
                    />

                    {/* Stacked Bars Container */}
                    <div
                      className={`w-full max-w-[26px] flex flex-col justify-end rounded-t-sm overflow-hidden transition-all ${
                        isHovered ? "ring-2 ring-primary/50 shadow-md" : "opacity-90"
                      }`}
                    >
                      {/* Battery discharge (top) */}
                      {dischargeHeight > 0 && (
                        <div
                          style={{ height: `${dischargeHeight * 2}px` }}
                          className="w-full bg-orange-500 transition-all"
                        />
                      )}
                      {/* Solar used (middle) */}
                      {solarHeight > 0 && (
                        <div
                          style={{ height: `${solarHeight * 2}px` }}
                          className="w-full bg-amber-500 transition-all"
                        />
                      )}
                      {/* Grid import (bottom) */}
                      {gridHeight > 0 && (
                        <div
                          style={{ height: `${gridHeight * 2}px` }}
                          className="w-full bg-sky-500 transition-all"
                        />
                      )}
                    </div>

                    {/* Charging indicator below */}
                    {chargeHeight > 0 && (
                      <div
                        style={{ height: `${chargeHeight * 1.2}px` }}
                        className="w-full max-w-[26px] bg-emerald-500/80 rounded-b-xs border-t border-background mt-0.5"
                        title={`Charging: ${item.battery_kwh} kWh`}
                      />
                    )}

                    {/* Hour label */}
                    <span
                      className={`absolute bottom-0 text-[10px] font-mono transition-colors ${
                        isHovered ? "text-primary font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {item.hour % 3 === 0 ? String(item.hour).padStart(2, "0") : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chart 2: Battery State of Charge Curve */}
      {activeTab === "battery" && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3.5 text-[10px] sm:text-[11px] text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-emerald-500 inline-block" /> Stored (kWh)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-b-2 border-dashed border-sky-400 inline-block" /> Cap ({battery.capacity_kwh}k)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-b-2 border-dashed border-rose-400 inline-block" /> Floor ({battery.minimum_energy_kwh}k)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Target ({battery.initial_energy_kwh}k)
            </span>
          </div>

          <div className="relative h-64 w-full pt-4">
            <svg viewBox="0 0 1000 240" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid guide lines */}
              <line x1="0" y1="20" x2="1000" y2="20" stroke="currentColor" strokeOpacity="0.08" />
              <line x1="0" y1="120" x2="1000" y2="120" stroke="currentColor" strokeOpacity="0.08" />
              <line x1="0" y1="220" x2="1000" y2="220" stroke="currentColor" strokeOpacity="0.08" />

              {/* Capacity line */}
              <line
                x1="0"
                y1={220 - (battery.capacity_kwh / maxCapacity) * 200}
                x2="1000"
                y2={220 - (battery.capacity_kwh / maxCapacity) * 200}
                stroke="rgb(56, 189, 248)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />

              {/* Reserve line */}
              <line
                x1="0"
                y1={220 - (battery.minimum_energy_kwh / maxCapacity) * 200}
                x2="1000"
                y2={220 - (battery.minimum_energy_kwh / maxCapacity) * 200}
                stroke="rgb(244, 63, 94)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />

              {/* Initial energy guideline */}
              <line
                x1="0"
                y1={220 - (battery.initial_energy_kwh / maxCapacity) * 200}
                x2="1000"
                y2={220 - (battery.initial_energy_kwh / maxCapacity) * 200}
                stroke="currentColor"
                strokeOpacity="0.15"
                strokeWidth="1"
              />

              {/* Path generation */}
              {(() => {
                const points = plan.map((p, i) => {
                  const x = (i / 23) * 960 + 20
                  const y = 220 - (p.battery_energy_after_kwh / maxCapacity) * 200
                  return `${x},${y}`
                })

                const d = `M ${points.join(" L ")}`
                const areaD = `M 20,220 L ${points.join(" L ")} L 980,220 Z`

                return (
                  <>
                    <path d={areaD} fill="url(#batteryGrad)" />
                    <path d={d} fill="none" stroke="rgb(16, 185, 129)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {plan.map((p, i) => {
                      const x = (i / 23) * 960 + 20
                      const y = 220 - (p.battery_energy_after_kwh / maxCapacity) * 200
                      const isHovered = hoveredHour === p.hour

                      return (
                        <circle
                          key={p.hour}
                          cx={x}
                          cy={y}
                          r={isHovered ? 6 : 3.5}
                          fill={isHovered ? "rgb(16, 185, 129)" : "white"}
                          stroke="rgb(16, 185, 129)"
                          strokeWidth={isHovered ? 3 : 2}
                          onMouseEnter={() => setHoveredHour(p.hour)}
                          onMouseLeave={() => setHoveredHour(null)}
                          onTouchStart={() => setHoveredHour(p.hour)}
                          onClick={() => setHoveredHour(hoveredHour === p.hour ? null : p.hour)}
                          className="cursor-pointer transition-all"
                        />
                      )
                    })}
                  </>
                )
              })()}
            </svg>

            <div className="flex justify-between text-[9px] sm:text-[10px] font-mono text-muted-foreground pt-1 px-1">
              <span>00:00 ({battery.initial_energy_kwh}k)</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00 ({plan[23]?.battery_energy_after_kwh.toFixed(0)}k)</span>
            </div>
          </div>
        </div>
      )}

      {/* Chart 3: Tariff Arbitrage Correlation */}
      {activeTab === "tariff" && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3.5 text-[10px] sm:text-[11px] text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Tariff (BDT)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Grid Intake (kWh)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500" /> Peak Battery Discharge
            </span>
          </div>

          <div className="relative h-64 w-full pt-4">
            <div className="absolute inset-0 flex items-end justify-between gap-0.5 sm:gap-1 pb-6">
              {hours.map((h) => {
                const planItem = plan[h.hour]
                const tariffHeight = (h.tariff_bdt_per_kwh / maxTariff) * 100
                const gridHeight = planItem ? (planItem.grid_kwh / maxDemand) * 100 : 0
                const isHovered = hoveredHour === h.hour

                return (
                  <div
                    key={h.hour}
                    onMouseEnter={() => setHoveredHour(h.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                    onTouchStart={() => setHoveredHour(h.hour)}
                    onClick={() => setHoveredHour(hoveredHour === h.hour ? null : h.hour)}
                    className="relative flex-1 h-full flex flex-col justify-end items-center cursor-pointer group"
                  >
                    {/* Tariff background bar */}
                    <div
                      style={{ height: `${tariffHeight}%` }}
                      className={`w-full max-w-[20px] rounded-t-sm transition-all ${
                        h.tariff_bdt_per_kwh >= 20
                          ? "bg-rose-500/30 group-hover:bg-rose-500/50"
                          : "bg-muted/40 group-hover:bg-muted/70"
                      }`}
                    />

                    {/* Actual Grid Purchase Bar inside */}
                    <div
                      style={{ height: `${gridHeight}%` }}
                      className="absolute bottom-6 w-full max-w-[12px] bg-sky-500 rounded-t-xs transition-all"
                    />

                    {/* Peak badge */}
                    {h.tariff_bdt_per_kwh >= 25 && (
                      <span className="absolute -top-1 text-[7px] sm:text-[8px] font-bold text-rose-500 uppercase">
                        Peak
                      </span>
                    )}

                    <span
                      className={`absolute bottom-0 text-[9px] sm:text-[10px] font-mono ${
                        isHovered ? "text-primary font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {h.hour % 3 === 0 ? String(h.hour).padStart(2, "0") : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
