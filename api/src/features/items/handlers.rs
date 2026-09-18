use super::dto::{self, CreateItemDto, UpdateItemDto};
use crate::core::{error::AppError, state::AppState};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn list_items_handler(
    State(state): State<AppState>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<impl IntoResponse, AppError> {
    let limit = pagination.limit.unwrap_or(20).clamp(1, 100);
    let offset = pagination.offset.unwrap_or(0).max(0);

    let items = dto::list_items(&state.db, limit, offset).await?;
    Ok((StatusCode::OK, Json(items)))
}

pub async fn get_item_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let item = dto::get_item(&state.db, id).await?;
    Ok((StatusCode::OK, Json(item)))
}

pub async fn create_item_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateItemDto>,
) -> Result<impl IntoResponse, AppError> {
    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("Title cannot be empty".to_string()));
    }

    let created = dto::create_item(&state.db, payload).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update_item_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateItemDto>,
) -> Result<impl IntoResponse, AppError> {
    let updated = dto::update_item(&state.db, id, payload).await?;
    Ok((StatusCode::OK, Json(updated)))
}

pub async fn delete_item_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    dto::delete_item(&state.db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
