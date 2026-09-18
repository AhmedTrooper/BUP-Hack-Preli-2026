use crate::{
    core::{error::AppError, state::AppState},
    features::energy::{
        dto::{OptimizeEnergyRequest, OptimizeEnergyResponse},
        llm::interpret_notes_with_llm,
        optimizer::solve_energy_schedule,
    },
};
use axum::{Json, body::Bytes, extract::State, http::header::HeaderMap};

pub async fn optimize_energy_handler(
    State(state): State<AppState>,
    _headers: HeaderMap,
    body: Bytes,
) -> Result<Json<OptimizeEnergyResponse>, AppError> {
    let payload: OptimizeEnergyRequest = serde_json::from_slice(&body).map_err(|e| {
        AppError::BadRequest(format!("Malformed or structurally invalid JSON: {}", e))
    })?;

    payload.validate()?;

    let directives = interpret_notes_with_llm(
        &payload.operator_notes,
        payload.battery.capacity_kwh,
        &state.config,
    )
    .await;

    let opt_result = solve_energy_schedule(&payload, &directives)?;

    Ok(Json(OptimizeEnergyResponse {
        scenario_id: payload.scenario_id,
        directive_interpretation: directives,
        hourly_plan: opt_result.hourly_plan,
        total_grid_kwh: opt_result.total_grid_kwh,
        total_cost_bdt: opt_result.total_cost_bdt,
        peak_grid_kwh: opt_result.peak_grid_kwh,
        plan_summary: opt_result.plan_summary,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_malformed_json_deserialization_error() {
        let invalid_json = b"{\"scenario_id\": \"TEST\"}";
        let res: Result<OptimizeEnergyRequest, _> = serde_json::from_slice(invalid_json);
        assert!(res.is_err());
    }
}
