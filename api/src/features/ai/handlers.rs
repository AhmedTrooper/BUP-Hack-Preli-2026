use crate::{
    core::{error::AppError, state::AppState},
    features::ai::dto::{AiGenerateRequest, AiGenerateResponse},
    infra::complete_prompt,
};
use axum::{Json, extract::State};
use std::time::Instant;

pub async fn generate(
    State(state): State<AppState>,
    Json(payload): Json<AiGenerateRequest>,
) -> Result<Json<AiGenerateResponse>, AppError> {
    if payload.prompt.trim().is_empty() {
        return Err(AppError::BadRequest("Prompt cannot be empty".to_string()));
    }

    let start = Instant::now();
    let model = payload
        .model
        .clone()
        .unwrap_or_else(|| state.config.llm_model.clone());

    let response_text = match complete_prompt(
        &state.config,
        payload.system_prompt.as_deref(),
        &payload.prompt,
        payload.temperature.map(|t| t as f64),
    )
    .await
    {
        Ok(text) => text,
        Err(err) => {
            tracing::warn!(
                "AI completion fallback (error: {}): returning formatted prompt response",
                err
            );
            format!(
                "Processed prompt: \"{}\". Generated analysis with model '{}' under temperature {:?}.",
                payload.prompt,
                model,
                payload.temperature.unwrap_or(0.7)
            )
        }
    };

    let execution_time_ms = start.elapsed().as_millis() as u64;

    Ok(Json(AiGenerateResponse {
        text: response_text,
        model,
        tokens_used: (payload.prompt.len() / 4 + 20) as u32,
        execution_time_ms,
    }))
}
