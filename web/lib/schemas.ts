import { z } from "zod"

export const HealthResponseSchema = z.object({
  status: z.string(),
})

export const HourlyDataSchema = z.object({
  hour: z.number().int().min(0).max(23),
  demand_kwh: z.number().nonnegative(),
  solar_kwh: z.number().nonnegative(),
  tariff_bdt_per_kwh: z.number().nonnegative(),
})

export const BatteryParamsSchema = z.object({
  capacity_kwh: z.number().positive(),
  initial_energy_kwh: z.number().nonnegative(),
  minimum_energy_kwh: z.number().nonnegative(),
  max_charge_kwh_per_hour: z.number().positive(),
  max_discharge_kwh_per_hour: z.number().positive(),
})

export const OptimizeEnergyRequestSchema = z.object({
  scenario_id: z.string().min(1, "Scenario ID is required"),
  operator_notes: z.array(z.string().min(1)).min(1).max(3),
  hours: z.array(HourlyDataSchema).length(24),
  battery: BatteryParamsSchema,
})

export const StructuredAdjustmentSchema = z
  .object({
    hours: z.array(z.number().int()).optional(),
    factor: z.number().optional(),
    minimum_energy_kwh: z.number().optional(),
    max_grid_kwh: z.number().optional(),
  })
  .nullable()

export const DirectiveInterpretationSchema = z.object({
  note_index: z.number().int(),
  applies: z.boolean(),
  directive_type: z.string(),
  structured_adjustment: StructuredAdjustmentSchema,
  explanation: z.string(),
})

export const HourlyPlanItemSchema = z.object({
  hour: z.number().int(),
  grid_kwh: z.number(),
  solar_used_kwh: z.number(),
  battery_action: z.enum(["charge", "discharge", "idle"]),
  battery_kwh: z.number(),
  battery_energy_after_kwh: z.number(),
})

export const OptimizeEnergyResponseSchema = z.object({
  scenario_id: z.string(),
  directive_interpretation: z.array(DirectiveInterpretationSchema),
  hourly_plan: z.array(HourlyPlanItemSchema),
  total_grid_kwh: z.number(),
  total_cost_bdt: z.number(),
  peak_grid_kwh: z.number(),
  plan_summary: z.string(),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>
export type HourlyData = z.infer<typeof HourlyDataSchema>
export type BatteryParams = z.infer<typeof BatteryParamsSchema>
export type OptimizeEnergyRequest = z.infer<typeof OptimizeEnergyRequestSchema>
export type DirectiveInterpretation = z.infer<typeof DirectiveInterpretationSchema>
export type HourlyPlanItem = z.infer<typeof HourlyPlanItemSchema>
export type OptimizeEnergyResponse = z.infer<typeof OptimizeEnergyResponseSchema>
