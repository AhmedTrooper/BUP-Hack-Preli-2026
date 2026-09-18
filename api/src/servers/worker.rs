use crate::{
    core::state::AppState,
    infra::{nats_client, redis_client},
};
use tokio::sync::watch;

pub fn spawn_background_workers(state: &AppState, shutdown_rx: watch::Receiver<bool>) {
    tracing::info!("⚙️ Initializing background worker server...");

    redis_client::spawn_stream_worker(
        state.redis.clone(),
        "hackathon:events".to_string(),
        shutdown_rx.clone(),
    );

    nats_client::spawn_nats_subscriber(state.nats.clone(), "hackathon.>".to_string(), shutdown_rx);

    tracing::info!("✅ All background daemons running.");
}
