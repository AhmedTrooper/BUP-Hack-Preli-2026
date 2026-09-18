use crate::core::error::AppError;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HourlyData {
    pub hour: u8,
    pub demand_kwh: f64,
    pub solar_kwh: f64,
    pub tariff_bdt_per_kwh: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BatteryParams {
    pub capacity_kwh: f64,
    pub initial_energy_kwh: f64,
    pub minimum_energy_kwh: f64,
    pub max_charge_kwh_per_hour: f64,
    pub max_discharge_kwh_per_hour: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OptimizeEnergyRequest {
    pub scenario_id: String,
    pub operator_notes: Vec<String>,
    pub hours: Vec<HourlyData>,
    pub battery: BatteryParams,
}

impl OptimizeEnergyRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.scenario_id.trim().is_empty() {
            return Err(AppError::BadRequest(
                "scenario_id must not be empty".to_string(),
            ));
        }

        if self.operator_notes.is_empty() || self.operator_notes.len() > 3 {
            return Err(AppError::BadRequest(
                "operator_notes must contain 1 to 3 non-empty strings".to_string(),
            ));
        }

        for (i, note) in self.operator_notes.iter().enumerate() {
            if note.trim().is_empty() {
                return Err(AppError::BadRequest(format!(
                    "operator_notes[{}] cannot be empty",
                    i
                )));
            }
        }

        if self.hours.len() != 24 {
            return Err(AppError::BadRequest(format!(
                "hours must contain exactly 24 hourly data points, received {}",
                self.hours.len()
            )));
        }

        let mut seen_hours = HashSet::new();
        for (i, h) in self.hours.iter().enumerate() {
            if h.hour > 23 {
                return Err(AppError::BadRequest(format!(
                    "hours[{}].hour is {}, must be between 0 and 23",
                    i, h.hour
                )));
            }
            if !seen_hours.insert(h.hour) {
                return Err(AppError::BadRequest(format!(
                    "Duplicate hour {} detected in hours array",
                    h.hour
                )));
            }
            if h.demand_kwh < 0.0 {
                return Err(AppError::UnprocessableEntity(format!(
                    "hours[{}].demand_kwh cannot be negative",
                    i
                )));
            }
            if h.solar_kwh < 0.0 {
                return Err(AppError::UnprocessableEntity(format!(
                    "hours[{}].solar_kwh cannot be negative",
                    i
                )));
            }
            if h.tariff_bdt_per_kwh < 0.0 {
                return Err(AppError::UnprocessableEntity(format!(
                    "hours[{}].tariff_bdt_per_kwh cannot be negative",
                    i
                )));
            }
        }

        if self.battery.capacity_kwh < 0.0 {
            return Err(AppError::UnprocessableEntity(
                "battery.capacity_kwh must be non-negative".to_string(),
            ));
        }
        if self.battery.minimum_energy_kwh < 0.0
            || self.battery.minimum_energy_kwh > self.battery.capacity_kwh
        {
            return Err(AppError::UnprocessableEntity(
                "battery.minimum_energy_kwh must be between 0 and capacity_kwh".to_string(),
            ));
        }
        if self.battery.initial_energy_kwh < self.battery.minimum_energy_kwh
            || self.battery.initial_energy_kwh > self.battery.capacity_kwh
        {
            return Err(AppError::UnprocessableEntity(
                "battery.initial_energy_kwh must be between minimum_energy_kwh and capacity_kwh"
                    .to_string(),
            ));
        }
        if self.battery.max_charge_kwh_per_hour < 0.0 {
            return Err(AppError::UnprocessableEntity(
                "battery.max_charge_kwh_per_hour must be non-negative".to_string(),
            ));
        }
        if self.battery.max_discharge_kwh_per_hour < 0.0 {
            return Err(AppError::UnprocessableEntity(
                "battery.max_discharge_kwh_per_hour must be non-negative".to_string(),
            ));
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StructuredAdjustment {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hours: Option<Vec<u8>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub factor: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minimum_energy_kwh: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_grid_kwh: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DirectiveInterpretation {
    pub note_index: usize,
    pub applies: bool,
    pub directive_type: String,
    pub structured_adjustment: Option<StructuredAdjustment>,
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HourlyPlanItem {
    pub hour: u8,
    pub grid_kwh: f64,
    pub solar_used_kwh: f64,
    pub battery_action: String,
    pub battery_kwh: f64,
    pub battery_energy_after_kwh: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OptimizeEnergyResponse {
    pub scenario_id: String,
    pub directive_interpretation: Vec<DirectiveInterpretation>,
    pub hourly_plan: Vec<HourlyPlanItem>,
    pub total_grid_kwh: f64,
    pub total_cost_bdt: f64,
    pub peak_grid_kwh: f64,
    pub plan_summary: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_battery() -> BatteryParams {
        BatteryParams {
            capacity_kwh: 200.0,
            initial_energy_kwh: 100.0,
            minimum_energy_kwh: 20.0,
            max_charge_kwh_per_hour: 50.0,
            max_discharge_kwh_per_hour: 50.0,
        }
    }

    fn valid_hours() -> Vec<HourlyData> {
        (0..24)
            .map(|h| HourlyData {
                hour: h,
                demand_kwh: 100.0,
                solar_kwh: 20.0,
                tariff_bdt_per_kwh: 10.0,
            })
            .collect()
    }

    #[test]
    fn test_valid_request_passes() {
        let req = OptimizeEnergyRequest {
            scenario_id: "TEST-01".to_string(),
            operator_notes: vec!["Note 1".to_string()],
            hours: valid_hours(),
            battery: valid_battery(),
        };
        assert!(req.validate().is_ok());
    }

    #[test]
    fn test_empty_notes_rejected() {
        let req = OptimizeEnergyRequest {
            scenario_id: "TEST-01".to_string(),
            operator_notes: vec![],
            hours: valid_hours(),
            battery: valid_battery(),
        };
        assert!(matches!(req.validate(), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn test_invalid_hours_len_rejected() {
        let mut hours = valid_hours();
        hours.pop();
        let req = OptimizeEnergyRequest {
            scenario_id: "TEST-01".to_string(),
            operator_notes: vec!["Note 1".to_string()],
            hours,
            battery: valid_battery(),
        };
        assert!(matches!(req.validate(), Err(AppError::BadRequest(_))));
    }

    #[test]
    fn test_invalid_battery_bounds_rejected() {
        let mut battery = valid_battery();
        battery.minimum_energy_kwh = 250.0;
        let req = OptimizeEnergyRequest {
            scenario_id: "TEST-01".to_string(),
            operator_notes: vec!["Note 1".to_string()],
            hours: valid_hours(),
            battery,
        };
        assert!(matches!(req.validate(), Err(AppError::UnprocessableEntity(_))));
    }
}
