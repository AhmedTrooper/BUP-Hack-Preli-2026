use crate::{
    core::{error::AppError, state::AppState},
    infra::nats_client,
};
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct NatsPublishRequest {
    pub subject: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct NatsPublishResponse {
    pub success: bool,
    pub subject: String,
}

pub async fn nats_publish_handler(
    State(state): State<AppState>,
    Json(req): Json<NatsPublishRequest>,
) -> Result<impl IntoResponse, AppError> {
    if req.subject.trim().is_empty() {
        return Err(AppError::BadRequest("Subject cannot be empty".to_string()));
    }

    nats_client::publish_message(&state.nats, &req.subject, &req.message).await?;

    Ok((
        StatusCode::OK,
        Json(NatsPublishResponse {
            success: true,
            subject: req.subject,
        }),
    ))
}
