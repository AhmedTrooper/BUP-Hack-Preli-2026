use crate::core::{error::AppError, state::AppState};
use axum::{
    Json,
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ListStorageQuery {
    pub prefix: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UploadResponse {
    pub key: String,
    pub bucket: String,
    pub size: usize,
}

#[derive(Debug, Serialize)]
pub struct PresignedUrlResponse {
    pub key: String,
    pub url: String,
    pub expires_in_seconds: u64,
}

pub async fn upload_file_handler(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, AppError> {
    if let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart parse error: {e}")))?
    {
        let file_name = field
            .file_name()
            .map(|s| s.to_string())
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        let content_type = field.content_type().map(|s| s.to_string());
        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::BadRequest(format!("Failed to read file bytes: {e}")))?;

        let size = data.len();
        let bucket = &state.s3.default_bucket;

        state
            .s3
            .upload_object(bucket, &file_name, data.to_vec(), content_type.as_deref())
            .await?;

        Ok((
            StatusCode::CREATED,
            Json(UploadResponse {
                key: file_name,
                bucket: bucket.clone(),
                size,
            }),
        ))
    } else {
        Err(AppError::BadRequest(
            "No file provided in form-data".to_string(),
        ))
    }
}

pub async fn get_presigned_url_handler(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let expires_in_seconds = 3600;
    let url = state
        .s3
        .generate_presigned_download_url(&state.s3.default_bucket, &key, expires_in_seconds)
        .await?;

    Ok((
        StatusCode::OK,
        Json(PresignedUrlResponse {
            key,
            url,
            expires_in_seconds,
        }),
    ))
}

pub async fn list_storage_handler(
    State(state): State<AppState>,
    Query(query): Query<ListStorageQuery>,
) -> Result<impl IntoResponse, AppError> {
    let keys = state
        .s3
        .list_objects(&state.s3.default_bucket, query.prefix.as_deref())
        .await?;

    Ok((StatusCode::OK, Json(keys)))
}

pub async fn delete_file_handler(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    state
        .s3
        .delete_object(&state.s3.default_bucket, &key)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}
