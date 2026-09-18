use crate::{
    core::{error::AppError, state::AppState},
    infra::redis_client,
};
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct PublishStreamRequest {
    pub stream: Option<String>,
    pub event_type: String,
    pub payload: String,
}

#[derive(Debug, Serialize)]
pub struct PublishStreamResponse {
    pub stream: String,
    pub event_id: String,
}

pub async fn publish_stream_handler(
    State(state): State<AppState>,
    Json(req): Json<PublishStreamRequest>,
) -> Result<impl IntoResponse, AppError> {
    if req.event_type.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Event type cannot be empty".to_string(),
        ));
    }

    let stream_name = req.stream.unwrap_or_else(|| "hackathon:events".to_string());
    let mut conn = state.redis.clone();

    let event_id =
        redis_client::publish_stream_event(&mut conn, &stream_name, &req.event_type, &req.payload)
            .await?;

    Ok((
        StatusCode::CREATED,
        Json(PublishStreamResponse {
            stream: stream_name,
            event_id,
        }),
    ))
}
