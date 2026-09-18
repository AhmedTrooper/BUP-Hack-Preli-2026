pub mod handlers;

use crate::core::state::AppState;
use axum::{Router, routing::post};

pub fn router() -> Router<AppState> {
    Router::new().route("/api/v1/nats/publish", post(handlers::nats_publish_handler))
}
