pub mod ai;
pub mod auth;
pub mod cache;
pub mod energy;
pub mod health;
pub mod items;
pub mod nats_pubsub;
pub mod rtc;
pub mod storage;
pub mod streams;

use crate::core::state::AppState;
use axum::Router;

pub fn configure_routes(state: AppState) -> Router {
    Router::new()
        .merge(health::router())
        .merge(energy::router())
        .merge(auth::router())
        .merge(ai::router())
        .merge(items::router())
        .merge(cache::router())
        .merge(streams::router())
        .merge(nats_pubsub::router())
        .merge(storage::router())
        .merge(rtc::router())
        .with_state(state)
}
