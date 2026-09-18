use crate::{
    core::error::AppError,
    features::energy::dto::{DirectiveInterpretation, HourlyPlanItem, OptimizeEnergyRequest},
};
use minilp::{ComparisonOp, LinearExpr, OptimizationDirection, Problem};

pub struct OptimizationResult {
    pub hourly_plan: Vec<HourlyPlanItem>,
    pub total_grid_kwh: f64,
    pub total_cost_bdt: f64,
    pub peak_grid_kwh: f64,
    pub plan_summary: String,
}

pub fn solve_energy_schedule(
    req: &OptimizeEnergyRequest,
    directives: &[DirectiveInterpretation],
) -> Result<OptimizationResult, AppError> {
    let mut effective_solar: Vec<f64> = req.hours.iter().map(|h| h.solar_kwh).collect();
    let mut max_charge = [req.battery.max_charge_kwh_per_hour; 24];
    let mut max_discharge = [req.battery.max_discharge_kwh_per_hour; 24];
    let mut min_reserve = [req.battery.minimum_energy_kwh; 24];
    let mut max_grid = [f64::INFINITY; 24];

    for d in directives {
        if !d.applies {
            continue;
        }
        if let Some(adj) = &d.structured_adjustment
            && let Some(hours) = &adj.hours
        {
            for &h_idx in hours {
                let h = h_idx as usize;
                if h >= 24 {
                    continue;
                }
                match d.directive_type.as_str() {
                    "solar_reduction" => {
                        if let Some(factor) = adj.factor {
                            effective_solar[h] *= factor;
                        }
                    }
                    "no_charge_window" => {
                        max_charge[h] = 0.0;
                    }
                    "no_discharge_window" => {
                        max_discharge[h] = 0.0;
                    }
                    "minimum_battery_reserve" => {
                        if let Some(reserve) = adj.minimum_energy_kwh {
                            min_reserve[h] = min_reserve[h].max(reserve);
                        }
                    }
                    "max_grid_window" => {
                        if let Some(grid_cap) = adj.max_grid_kwh {
                            max_grid[h] = max_grid[h].min(grid_cap);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    let mut problem = Problem::new(OptimizationDirection::Minimize);

    let mut grid_vars = Vec::with_capacity(24);
    let mut solar_vars = Vec::with_capacity(24);
    let mut charge_vars = Vec::with_capacity(24);
    let mut discharge_vars = Vec::with_capacity(24);
    let mut energy_vars = Vec::with_capacity(24);

    for h in 0..24 {
        let g = problem.add_var(req.hours[h].tariff_bdt_per_kwh, (0.0, max_grid[h]));
        grid_vars.push(g);

        let s = problem.add_var(0.0, (0.0, effective_solar[h]));
        solar_vars.push(s);

        let c = problem.add_var(0.0, (0.0, max_charge[h]));
        charge_vars.push(c);

        let d = problem.add_var(0.0, (0.0, max_discharge[h]));
        discharge_vars.push(d);

        let e = problem.add_var(0.0, (min_reserve[h], req.battery.capacity_kwh));
        energy_vars.push(e);
    }

    for h in 0..24 {
        let mut balance = LinearExpr::empty();
        balance.add(grid_vars[h], 1.0);
        balance.add(solar_vars[h], 1.0);
        balance.add(discharge_vars[h], 1.0);
        balance.add(charge_vars[h], -1.0);
        problem.add_constraint(balance, ComparisonOp::Eq, req.hours[h].demand_kwh);
    }

    for h in 0..24 {
        let mut dyn_expr = LinearExpr::empty();
        dyn_expr.add(energy_vars[h], 1.0);
        dyn_expr.add(charge_vars[h], -1.0);
        dyn_expr.add(discharge_vars[h], 1.0);

        if h == 0 {
            problem.add_constraint(dyn_expr, ComparisonOp::Eq, req.battery.initial_energy_kwh);
        } else {
            dyn_expr.add(energy_vars[h - 1], -1.0);
            problem.add_constraint(dyn_expr, ComparisonOp::Eq, 0.0);
        }
    }

    let mut end_neutrality = LinearExpr::empty();
    end_neutrality.add(energy_vars[23], 1.0);
    problem.add_constraint(
        end_neutrality,
        ComparisonOp::Eq,
        req.battery.initial_energy_kwh,
    );

    let solution = problem.solve().map_err(|e| {
        AppError::UnprocessableEntity(format!(
            "Infeasible energy optimization problem constraints: {:?}",
            e
        ))
    })?;

    let mut hourly_plan = Vec::with_capacity(24);
    let mut current_e = req.battery.initial_energy_kwh;

    for h in 0..24 {
        let s = round2(solution[solar_vars[h]].max(0.0));
        let c = solution[charge_vars[h]].max(0.0);
        let d = solution[discharge_vars[h]].max(0.0);

        let net = c - d;
        let (action, kwh) = if net > 1e-4 {
            ("charge", round2(net))
        } else if net < -1e-4 {
            ("discharge", round2(-net))
        } else {
            ("idle", 0.0)
        };

        if action == "charge" {
            current_e = round2(current_e + kwh);
        } else if action == "discharge" {
            current_e = round2(current_e - kwh);
        }

        // Reconcile grid_kwh so that energy balance is exact to 2 decimal places:
        // grid + solar + (discharge - charge) = demand
        let battery_contrib = if action == "discharge" {
            kwh
        } else if action == "charge" {
            -kwh
        } else {
            0.0
        };
        let g = round2((req.hours[h].demand_kwh - s - battery_contrib).max(0.0));

        hourly_plan.push(HourlyPlanItem {
            hour: h as u8,
            grid_kwh: g,
            solar_used_kwh: s,
            battery_action: action.to_string(),
            battery_kwh: kwh,
            battery_energy_after_kwh: current_e,
        });
    }

    verify_plan_invariants(
        req,
        &hourly_plan,
        &effective_solar,
        &min_reserve,
        &max_charge,
        &max_discharge,
        &max_grid,
    )?;

    let total_grid_kwh = round2(hourly_plan.iter().map(|p| p.grid_kwh).sum());
    let total_cost_bdt = round2(
        hourly_plan
            .iter()
            .zip(req.hours.iter())
            .map(|(p, h)| p.grid_kwh * h.tariff_bdt_per_kwh)
            .sum(),
    );
    let peak_grid_kwh = round2(hourly_plan.iter().map(|p| p.grid_kwh).fold(0.0, f64::max));

    let plan_summary = format!(
        "Optimal 24-hour dispatch schedule computed. Total grid energy: {:.2} kWh, Total cost: {:.2} BDT, Peak grid demand: {:.2} kWh across {} active directives.",
        total_grid_kwh,
        total_cost_bdt,
        peak_grid_kwh,
        directives.iter().filter(|d| d.applies).count()
    );

    Ok(OptimizationResult {
        hourly_plan,
        total_grid_kwh,
        total_cost_bdt,
        peak_grid_kwh,
        plan_summary,
    })
}

fn verify_plan_invariants(
    req: &OptimizeEnergyRequest,
    plan: &[HourlyPlanItem],
    effective_solar: &[f64],
    min_reserve: &[f64; 24],
    max_charge: &[f64; 24],
    max_discharge: &[f64; 24],
    max_grid: &[f64; 24],
) -> Result<(), AppError> {
    const TOLERANCE: f64 = 0.05;

    let mut prev_energy = req.battery.initial_energy_kwh;

    for (h, item) in plan.iter().enumerate() {
        if item.grid_kwh < -TOLERANCE
            || item.solar_used_kwh < -TOLERANCE
            || item.battery_kwh < -TOLERANCE
            || item.battery_energy_after_kwh < -TOLERANCE
        {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Non-negativity invariant violated",
                h
            )));
        }

        let battery_contrib = match item.battery_action.as_str() {
            "discharge" => item.battery_kwh,
            "charge" => -item.battery_kwh,
            "idle" => 0.0,
            other => {
                return Err(AppError::UnprocessableEntity(format!(
                    "Hour {}: Unknown battery action '{}'",
                    h, other
                )));
            }
        };

        let total_supply = item.grid_kwh + item.solar_used_kwh + battery_contrib;
        let demand_diff = (total_supply - req.hours[h].demand_kwh).abs();
        if demand_diff > TOLERANCE {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Energy balance invariant violated (supply: {:.2}, demand: {:.2})",
                h, total_supply, req.hours[h].demand_kwh
            )));
        }

        if item.solar_used_kwh > effective_solar[h] + TOLERANCE {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Solar curtailment invariant violated (used: {:.2}, effective max: {:.2})",
                h, item.solar_used_kwh, effective_solar[h]
            )));
        }

        let expected_energy = match item.battery_action.as_str() {
            "charge" => prev_energy + item.battery_kwh,
            "discharge" => prev_energy - item.battery_kwh,
            _ => prev_energy,
        };
        if (item.battery_energy_after_kwh - expected_energy).abs() > TOLERANCE {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Battery dynamic continuity invariant violated",
                h
            )));
        }

        if item.battery_energy_after_kwh < min_reserve[h] - TOLERANCE {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Battery minimum reserve violated (have: {:.2}, min: {:.2})",
                h, item.battery_energy_after_kwh, min_reserve[h]
            )));
        }

        if item.battery_energy_after_kwh > req.battery.capacity_kwh + TOLERANCE {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Battery capacity limit violated (have: {:.2}, max: {:.2})",
                h, item.battery_energy_after_kwh, req.battery.capacity_kwh
            )));
        }

        if item.battery_action == "charge" && item.battery_kwh > max_charge[h] + TOLERANCE {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Battery charge rate limit violated",
                h
            )));
        }

        if item.battery_action == "discharge" && item.battery_kwh > max_discharge[h] + TOLERANCE {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Battery discharge rate limit violated",
                h
            )));
        }

        if item.grid_kwh > max_grid[h] + TOLERANCE {
            return Err(AppError::UnprocessableEntity(format!(
                "Hour {}: Grid cap invariant violated (grid: {:.2}, max: {:.2})",
                h, item.grid_kwh, max_grid[h]
            )));
        }

        prev_energy = item.battery_energy_after_kwh;
    }

    if (prev_energy - req.battery.initial_energy_kwh).abs() > TOLERANCE {
        return Err(AppError::UnprocessableEntity(format!(
            "End-of-day neutrality invariant violated (final: {:.2}, initial: {:.2})",
            prev_energy, req.battery.initial_energy_kwh
        )));
    }

    Ok(())
}

fn round2(val: f64) -> f64 {
    (val * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::energy::dto::{BatteryParams, HourlyData};

    #[test]
    fn test_sample_case_01_optimizer() {
        let file_content =
            std::fs::read_to_string("../data/BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json")
                .or_else(|_| {
                    std::fs::read_to_string("data/BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json")
                })
                .expect("Sample cases file should be present");

        let json_val: serde_json::Value = serde_json::from_str(&file_content).unwrap();
        let cases = json_val["cases"].as_array().unwrap();

        for case in cases {
            let id = case["id"].as_str().unwrap();
            let inp = &case["input"];
            let exp = &case["expected_output"];

            let hours: Vec<HourlyData> = serde_json::from_value(inp["hours"].clone()).unwrap();
            let battery: BatteryParams = serde_json::from_value(inp["battery"].clone()).unwrap();
            let req = OptimizeEnergyRequest {
                scenario_id: id.to_string(),
                operator_notes: serde_json::from_value(inp["operator_notes"].clone()).unwrap(),
                hours,
                battery,
            };

            let directives: Vec<DirectiveInterpretation> =
                serde_json::from_value(exp["directive_interpretation"].clone()).unwrap();

            let result = solve_energy_schedule(&req, &directives).unwrap();

            let exp_cost = exp["total_cost_bdt"].as_f64().unwrap();
            let exp_grid = exp["total_grid_kwh"].as_f64().unwrap();
            let exp_peak = exp["peak_grid_kwh"].as_f64().unwrap();

            assert!(
                (result.total_cost_bdt - exp_cost).abs() <= 0.05,
                "{}: cost mismatch: got {}, exp {}",
                id,
                result.total_cost_bdt,
                exp_cost
            );
            assert!(
                (result.total_grid_kwh - exp_grid).abs() <= 0.05,
                "{}: grid mismatch: got {}, exp {}",
                id,
                result.total_grid_kwh,
                exp_grid
            );
            assert!(
                (result.peak_grid_kwh - exp_peak).abs() <= 0.05,
                "{}: peak mismatch: got {}, exp {}",
                id,
                result.peak_grid_kwh,
                exp_peak
            );
        }
    }
}
