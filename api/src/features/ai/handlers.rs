use crate::{
    core::{error::AppError, state::AppState},
    features::ai::dto::{AiGenerateRequest, AiGenerateResponse},
};
use axum::{Json, extract::State};
use std::time::Instant;

pub async fn generate(
    State(_state): State<AppState>,
    Json(payload): Json<AiGenerateRequest>,
) -> Result<Json<AiGenerateResponse>, AppError> {
    if payload.prompt.trim().is_empty() {
        return Err(AppError::BadRequest("Prompt cannot be empty".to_string()));
    }

    let start = Instant::now();
    let model = payload
        .model
        .unwrap_or_else(|| "gemini-1.5-flash".to_string());

    let generated_text = format!(
        "Processed prompt: \"{}\". Generated analysis with model '{}' under temperature {:?}.",
        payload.prompt,
        model,
        payload.temperature.unwrap_or(0.7)
    );

    let execution_time_ms = start.elapsed().as_millis() as u64;

    Ok(Json(AiGenerateResponse {
        text: generated_text,
        model,
        tokens_used: (payload.prompt.len() / 4 + 20) as u32,
        execution_time_ms,
    }))
}
