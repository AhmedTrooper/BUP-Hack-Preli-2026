pub mod handlers;
pub mod hub;

use crate::core::state::AppState;
use axum::{Router, routing::get};
pub use hub::{RtcHub, SignalingMessage};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/ws/rtc", get(handlers::rtc_ws_handler))
        .route("/api/v1/rtc/rooms", get(handlers::list_rtc_rooms_handler))
}
