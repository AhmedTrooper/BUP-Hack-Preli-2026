pub mod dto;
pub mod handlers;

use crate::core::state::AppState;
use axum::{Router, routing::post};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/v1/ai/generate", post(handlers::generate))
}
