import { describe, expect, it } from "bun:test"
import {
  HealthResponseSchema,
  HourlyDataSchema,
  BatteryParamsSchema,
  OptimizeEnergyRequestSchema,
  DirectiveInterpretationSchema,
  HourlyPlanItemSchema,
  OptimizeEnergyResponseSchema,
} from "../lib/schemas"

describe("GridWise Schemas Validation", () => {
  it("validates HealthResponse correctly", () => {
    const valid = { status: "ok" }
    expect(HealthResponseSchema.safeParse(valid).success).toBe(true)
  })

  it("validates HourlyData correctly", () => {
    const valid = {
      hour: 12,
      demand_kwh: 185,
      solar_kwh: 180,
      tariff_bdt_per_kwh: 15,
    }
    expect(HourlyDataSchema.safeParse(valid).success).toBe(true)

    const invalidHour = { ...valid, hour: 25 }
    expect(HourlyDataSchema.safeParse(invalidHour).success).toBe(false)
  })

  it("validates BatteryParams correctly", () => {
    const valid = {
      capacity_kwh: 220,
      initial_energy_kwh: 110,
      minimum_energy_kwh: 40,
      max_charge_kwh_per_hour: 50,
      max_discharge_kwh_per_hour: 50,
    }
    expect(BatteryParamsSchema.safeParse(valid).success).toBe(true)

    const negativeCapacity = { ...valid, capacity_kwh: -10 }
    expect(BatteryParamsSchema.safeParse(negativeCapacity).success).toBe(false)
  })

  it("validates OptimizeEnergyRequest requires 24 hours and 1-3 notes", () => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      demand_kwh: 100,
      solar_kwh: 10,
      tariff_bdt_per_kwh: 10,
    }))

    const validReq = {
      scenario_id: "TEST-01",
      operator_notes: ["Wash solar panels from noon until 2 PM."],
      hours,
      battery: {
        capacity_kwh: 200,
        initial_energy_kwh: 100,
        minimum_energy_kwh: 30,
        max_charge_kwh_per_hour: 40,
        max_discharge_kwh_per_hour: 40,
      },
    }
    expect(OptimizeEnergyRequestSchema.safeParse(validReq).success).toBe(true)

    const emptyNotes = { ...validReq, operator_notes: [] }
    expect(OptimizeEnergyRequestSchema.safeParse(emptyNotes).success).toBe(false)

    const incompleteHours = { ...validReq, hours: hours.slice(0, 20) }
    expect(OptimizeEnergyRequestSchema.safeParse(incompleteHours).success).toBe(false)
  })

  it("validates DirectiveInterpretation correctly", () => {
    const valid = {
      note_index: 0,
      applies: true,
      directive_type: "solar_reduction",
      structured_adjustment: {
        hours: [12, 13],
        factor: 0.25,
      },
      explanation: "Solar reduced by 75% due to panel cleaning.",
    }
    expect(DirectiveInterpretationSchema.safeParse(valid).success).toBe(true)
  })

  it("validates HourlyPlanItem correctly", () => {
    const valid = {
      hour: 12,
      grid_kwh: 140.0,
      solar_used_kwh: 45.0,
      battery_action: "idle",
      battery_kwh: 0.0,
      battery_energy_after_kwh: 110.0,
    }
    expect(HourlyPlanItemSchema.safeParse(valid).success).toBe(true)
  })

  it("validates full OptimizeEnergyResponse correctly", () => {
    const valid = {
      scenario_id: "SAMPLE-01",
      directive_interpretation: [
        {
          note_index: 0,
          applies: true,
          directive_type: "solar_reduction",
          structured_adjustment: { hours: [12, 13], factor: 0.25 },
          explanation: "Washing panels",
        },
      ],
      hourly_plan: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        grid_kwh: 100.0,
        solar_used_kwh: 10.0,
        battery_action: "idle" as const,
        battery_kwh: 0.0,
        battery_energy_after_kwh: 100.0,
      })),
      total_grid_kwh: 2400.0,
      total_cost_bdt: 24000.0,
      peak_grid_kwh: 150.0,
      plan_summary: "Optimal dispatch computed.",
    }
    expect(OptimizeEnergyResponseSchema.safeParse(valid).success).toBe(true)
  })
})
