use crate::core::state::AppState;
use axum::{
    Json,
    extract::{State, ws::WebSocketUpgrade},
    response::IntoResponse,
};

pub async fn rtc_ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| state.rtc_hub.handle_socket(socket))
}

pub async fn list_rtc_rooms_handler(State(state): State<AppState>) -> impl IntoResponse {
    let rooms = state.rtc_hub.get_rooms_info().await;
    Json(rooms)
}
