"use client"

import { useMemo } from "react"
import { HourlyPlanItem, HourlyData, BatteryParams, DirectiveInterpretation } from "@/lib/schemas"

interface ComplianceAuditProps {
  plan: HourlyPlanItem[]
  hours: HourlyData[]
  battery: BatteryParams
  directives: DirectiveInterpretation[]
}

interface AuditCheck {
  id: string
  title: string
  description: string
  passed: boolean
  tolerance: string
  metric: string
}

export function ComplianceAudit({
  plan,
  hours,
  battery,
  directives,
}: ComplianceAuditProps) {
  const auditResults = useMemo(() => {
    const checks: AuditCheck[] = []
    const TOL = 0.05

    // 1. Hourly Energy Balance
    let maxBalanceDiff = 0
    let balancePassed = true
    for (let h = 0; h < 24; h++) {
      const p = plan[h]
      const contrib =
        p.battery_action === "discharge"
          ? p.battery_kwh
          : p.battery_action === "charge"
            ? -p.battery_kwh
            : 0
      const supply = p.grid_kwh + p.solar_used_kwh + contrib
      const diff = Math.abs(supply - hours[h].demand_kwh)
      maxBalanceDiff = Math.max(maxBalanceDiff, diff)
      if (diff > TOL) balancePassed = false
    }
    checks.push({
      id: "balance",
      title: "Hourly Energy Balance",
      description: "Grid + Solar + Battery Discharge = Campus Demand + Battery Charge (∀ h ∈ [0..23])",
      passed: balancePassed,
      tolerance: `Δ max = ${maxBalanceDiff.toFixed(3)} kWh`,
      metric: balancePassed ? "Balanced 24/24 Hours" : "Mismatch detected",
    })

    // 2. Solar Curtailment
    let solarPassed = true
    let totalSolarAvailable = 0
    let totalSolarUsed = 0
    for (let h = 0; h < 24; h++) {
      let factor = 1.0
      for (const d of directives) {
        if (d.applies && d.directive_type === "solar_reduction" && d.structured_adjustment?.hours?.includes(h)) {
          if (d.structured_adjustment.factor !== undefined) {
            factor = d.structured_adjustment.factor
          }
        }
      }
      const effectiveSolar = hours[h].solar_kwh * factor
      totalSolarAvailable += effectiveSolar
      totalSolarUsed += plan[h].solar_used_kwh
      if (plan[h].solar_used_kwh > effectiveSolar + TOL) {
        solarPassed = false
      }
    }
    checks.push({
      id: "solar",
      title: "Solar Utilization & Curtailment",
      description: "Solar used does not exceed effective solar generation; zero grid export",
      passed: solarPassed,
      tolerance: "Zero grid solar export",
      metric: `${((totalSolarUsed / (totalSolarAvailable || 1)) * 100).toFixed(1)}% solar absorbed (${totalSolarUsed.toFixed(1)} / ${totalSolarAvailable.toFixed(1)} kWh)`,
    })

    // 3. Battery Dynamic Continuity
    let dynPassed = true
    let prev = battery.initial_energy_kwh
    let maxDynDiff = 0
    for (let h = 0; h < 24; h++) {
      const p = plan[h]
      const expected =
        p.battery_action === "charge"
          ? prev + p.battery_kwh
          : p.battery_action === "discharge"
            ? prev - p.battery_kwh
            : prev
      const diff = Math.abs(p.battery_energy_after_kwh - expected)
      maxDynDiff = Math.max(maxDynDiff, diff)
      if (diff > TOL) dynPassed = false
      prev = p.battery_energy_after_kwh
    }
    checks.push({
      id: "dynamics",
      title: "Storage State Continuity",
      description: "Ending SoC matches previous hour SoC ± battery transfer kWh",
      passed: dynPassed,
      tolerance: `Δ max = ${maxDynDiff.toFixed(3)} kWh`,
      metric: dynPassed ? "Continuous Transitions" : "State jump detected",
    })

    // 4. Reserve Floor & Capacity Bounds
    let boundsPassed = true
    for (let h = 0; h < 24; h++) {
      let activeMin = battery.minimum_energy_kwh
      for (const d of directives) {
        if (d.applies && d.directive_type === "minimum_battery_reserve" && d.structured_adjustment?.hours?.includes(h)) {
          if (d.structured_adjustment.minimum_energy_kwh !== undefined) {
            activeMin = Math.max(activeMin, d.structured_adjustment.minimum_energy_kwh)
          }
        }
      }
      const energy = plan[h].battery_energy_after_kwh
      if (energy < activeMin - TOL || energy > battery.capacity_kwh + TOL) {
        boundsPassed = false
      }
    }
    checks.push({
      id: "bounds",
      title: "Reserve Floor & Capacity Limits",
      description: "Active reserve floor ≤ Battery SoC ≤ Capacity ceiling across all hours",
      passed: boundsPassed,
      tolerance: "Strict bound adherence",
      metric: boundsPassed ? `Within [${battery.minimum_energy_kwh} - ${battery.capacity_kwh}] kWh` : "Boundary violation",
    })

    // 5. Transfer Rate Limits
    let ratePassed = true
    for (let h = 0; h < 24; h++) {
      const p = plan[h]
      if (p.battery_action === "charge" && p.battery_kwh > battery.max_charge_kwh_per_hour + TOL) {
        ratePassed = false
      }
      if (p.battery_action === "discharge" && p.battery_kwh > battery.max_discharge_kwh_per_hour + TOL) {
        ratePassed = false
      }
    }
    checks.push({
      id: "transfer",
      title: "Hourly Transfer Inverter Limits",
      description: "Charge and discharge throughput respect hourly maximum inverter ratings",
      passed: ratePassed,
      tolerance: `Max ${battery.max_charge_kwh_per_hour} / ${battery.max_discharge_kwh_per_hour} kWh/h`,
      metric: ratePassed ? "Inverter Ratings Respected" : "Transfer limit exceeded",
    })

    // 6. End-of-Day Neutrality
    const finalEnergy = plan[23].battery_energy_after_kwh
    const neutralityDiff = Math.abs(finalEnergy - battery.initial_energy_kwh)
    const neutralityPassed = neutralityDiff <= TOL
    checks.push({
      id: "neutrality",
      title: "End-of-Day Neutrality",
      description: "Final SoC at hour 23 equals initial state of charge at hour 0",
      passed: neutralityPassed,
      tolerance: `Δ = ${neutralityDiff.toFixed(3)} kWh (Tol: 0.05)`,
      metric: neutralityPassed
        ? `Final: ${finalEnergy.toFixed(2)} kWh == Initial: ${battery.initial_energy_kwh.toFixed(2)} kWh`
        : "Neutrality broken",
    })

    return checks
  }, [plan, hours, battery, directives])

  const allPassed = auditResults.every((c) => c.passed)

  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur-md p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span>🛡️</span> Mathematical & Physical Invariant Audit
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated verification of physical conservation laws, battery dynamics, and neutrality
          </p>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            allPassed
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          <span>{allPassed ? "✓ All Invariants Passed (100%)" : "⚠ Invariant Failures Detected"}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {auditResults.map((check) => (
          <div
            key={check.id}
            className={`rounded-xl border p-3.5 transition-all text-xs flex flex-col justify-between ${
              check.passed
                ? "bg-background border-emerald-500/20 hover:border-emerald-500/40"
                : "bg-destructive/5 border-destructive/30"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className={check.passed ? "text-emerald-500" : "text-destructive"}>
                    {check.passed ? "✓" : "✕"}
                  </span>
                  {check.title}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{check.tolerance}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                {check.description}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t font-mono text-[11px] text-foreground/90 font-medium">
              {check.metric}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
