pub mod handlers;

use crate::core::state::AppState;
use axum::{Router, routing::get};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(handlers::health_handler))
        .route("/health/live", get(handlers::liveness_handler))
        .route("/health/ready", get(handlers::readiness_handler))
}
