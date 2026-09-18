pub mod dto;
pub mod guardrails;
pub mod handlers;
pub mod llm;
pub mod optimizer;

use crate::core::state::AppState;
use axum::{Router, routing::post};

pub fn router() -> Router<AppState> {
    Router::new().route("/optimize-energy", post(handlers::optimize_energy_handler))
}
