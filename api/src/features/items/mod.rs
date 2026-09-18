pub mod dto;
pub mod handlers;

use crate::core::state::AppState;
use axum::{Router, routing::get};

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/api/v1/items",
            get(handlers::list_items_handler).post(handlers::create_item_handler),
        )
        .route(
            "/api/v1/items/{id}",
            get(handlers::get_item_handler)
                .put(handlers::update_item_handler)
                .delete(handlers::delete_item_handler),
        )
}
