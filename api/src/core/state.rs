use crate::{core::config::Config, features::rtc::RtcHub, infra::s3_client::S3Service};
use async_nats::Client as NatsClient;
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use std::{sync::Arc, time::Instant};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: ConnectionManager,
    pub nats: NatsClient,
    pub s3: S3Service,
    pub rtc_hub: Arc<RtcHub>,
    pub config: Arc<Config>,
    pub start_time: Instant,
}

impl AppState {
    pub async fn new(
        db: PgPool,
        redis: ConnectionManager,
        nats: NatsClient,
        s3: S3Service,
        config: Config,
    ) -> Self {
        Self {
            db,
            redis,
            nats,
            s3,
            rtc_hub: Arc::new(RtcHub::new()),
            config: Arc::new(config),
            start_time: Instant::now(),
        }
    }
}
