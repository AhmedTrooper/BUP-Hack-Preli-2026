pub mod handlers;

use crate::core::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post},
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/v1/storage/upload",
            post(handlers::upload_file_handler),
        )
        .route(
            "/api/v1/storage/url/{key}",
            get(handlers::get_presigned_url_handler),
        )
        .route("/api/v1/storage/list", get(handlers::list_storage_handler))
        .route(
            "/api/v1/storage/{key}",
            delete(handlers::delete_file_handler),
        )
}
