pub mod dto;
pub mod handlers;

use crate::core::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/auth/login", post(handlers::login))
        .route("/api/v1/auth/me", get(handlers::me))
}
