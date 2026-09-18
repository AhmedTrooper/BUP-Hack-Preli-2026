use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("NATS error: {0}")]
    Nats(String),

    #[error("NATS publish error: {0}")]
    NatsPublish(String),

    #[error("S3 error: {0}")]
    S3(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    pub status: u16,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_code, user_message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND", msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, "BAD_REQUEST", msg.clone()),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED", msg.clone()),
            AppError::Forbidden(msg) => (StatusCode::FORBIDDEN, "FORBIDDEN", msg.clone()),
            AppError::Database(sqlx::Error::RowNotFound) => (
                StatusCode::NOT_FOUND,
                "NOT_FOUND",
                "Requested resource was not found".to_string(),
            ),
            AppError::Database(err) => {
                tracing::error!("Database query error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "DATABASE_ERROR",
                    "Database operation failed".to_string(),
                )
            }
            AppError::Redis(err) => {
                tracing::error!("Redis error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "REDIS_ERROR",
                    "Cache operation failed".to_string(),
                )
            }
            AppError::Nats(err) => {
                tracing::error!("NATS error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "NATS_ERROR",
                    "Message broker error".to_string(),
                )
            }
            AppError::NatsPublish(err) => {
                tracing::error!("NATS publish error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "NATS_PUBLISH_ERROR",
                    "Failed to publish message".to_string(),
                )
            }
            AppError::S3(err) => {
                tracing::error!("S3 storage error: {}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "STORAGE_ERROR",
                    "Object storage operation failed".to_string(),
                )
            }
            AppError::Internal(err) => {
                tracing::error!("Internal server error: {}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "INTERNAL_ERROR",
                    "An unexpected error occurred".to_string(),
                )
            }
        };

        let body = Json(ErrorResponse {
            error: error_code.to_string(),
            message: user_message,
            status: status.as_u16(),
        });

        (status, body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_not_found_status_code() {
        let err = AppError::NotFound("Missing item".to_string());
        let res = err.into_response();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[test]
    fn test_bad_request_status_code() {
        let err = AppError::BadRequest("Invalid body".to_string());
        let res = err.into_response();
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn test_unauthorized_status_code() {
        let err = AppError::Unauthorized("Invalid token".to_string());
        let res = err.into_response();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn test_internal_error_status_code() {
        let err = AppError::Internal("Something broke".to_string());
        let res = err.into_response();
        assert_eq!(res.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
