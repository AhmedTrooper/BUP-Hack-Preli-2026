use crate::{
    core::state::AppState,
    infra::{nats_client, redis_client},
};
use tokio::sync::watch;

pub fn spawn_background_workers(state: &AppState, shutdown_rx: watch::Receiver<bool>) {
    tracing::info!("⚙️ Initializing background worker server...");

    if let Some(redis) = state.redis.clone() {
        redis_client::spawn_stream_worker(
            redis,
            "hackathon:events".to_string(),
            shutdown_rx.clone(),
        );
    } else {
        tracing::info!("Redis stream worker skipped (Redis not connected).");
    }

    if let Some(nats) = state.nats.clone() {
        nats_client::spawn_nats_subscriber(nats, "hackathon.>".to_string(), shutdown_rx);
    } else {
        tracing::info!("NATS subscriber worker skipped (NATS not connected).");
    }

    tracing::info!("✅ All active background daemons running.");
}
