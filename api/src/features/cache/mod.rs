pub mod handlers;

use crate::core::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/v1/cache", post(handlers::set_cache_handler))
        .route(
            "/api/v1/cache/{key}",
            get(handlers::get_cache_handler).delete(handlers::delete_cache_handler),
        )
}
