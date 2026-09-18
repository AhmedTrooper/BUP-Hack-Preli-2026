use crate::{
    core::{error::AppError, state::AppState},
    infra::redis_client,
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SetCacheRequest {
    pub key: String,
    pub value: String,
    pub ttl_seconds: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct CacheResponse {
    pub key: String,
    pub value: Option<String>,
}

pub async fn set_cache_handler(
    State(state): State<AppState>,
    Json(req): Json<SetCacheRequest>,
) -> Result<impl IntoResponse, AppError> {
    if req.key.trim().is_empty() {
        return Err(AppError::BadRequest("Key cannot be empty".to_string()));
    }

    let mut conn = state
        .redis
        .clone()
        .ok_or_else(|| AppError::Internal("Redis cache is not available".to_string()))?;
    redis_client::set_cache(&mut conn, &req.key, &req.value, req.ttl_seconds).await?;

    Ok((StatusCode::OK, Json(serde_json::json!({ "success": true }))))
}

pub async fn get_cache_handler(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let mut conn = state
        .redis
        .clone()
        .ok_or_else(|| AppError::Internal("Redis cache is not available".to_string()))?;
    let val = redis_client::get_cache(&mut conn, &key).await?;

    Ok((StatusCode::OK, Json(CacheResponse { key, value: val })))
}

pub async fn delete_cache_handler(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let mut conn = state
        .redis
        .clone()
        .ok_or_else(|| AppError::Internal("Redis cache is not available".to_string()))?;
    let deleted = redis_client::delete_cache(&mut conn, &key).await?;

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({ "deleted": deleted })),
    ))
}
