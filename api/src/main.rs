use hackathon::{
    core::{AppState, Config, telemetry},
    create_router,
    infra::{self, S3Service},
    servers,
};
use tokio::sync::watch;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::from_env();
    telemetry::init_telemetry(&config.log_level);

    tracing::info!("Initializing Hackathon Core platform...");

    tracing::info!(
        "Connecting to PostgreSQL database at: {}",
        config.database_url
    );
    let pool = infra::init_pool(&config.database_url)?;
    if let Err(e) = infra::init_schema(&pool).await {
        tracing::warn!(
            "Postgres schema init deferred (will retry on query): {:?}",
            e
        );
    } else {
        tracing::info!("PostgreSQL connected and schema verified.");
    }

    tracing::info!("Connecting to Redis at: {}", config.redis_url);
    let redis_conn = match infra::init_redis(&config.redis_url).await {
        Ok(c) => {
            tracing::info!("Redis connection manager established.");
            Some(c)
        }
        Err(e) => {
            tracing::warn!(
                "Redis connection failed (non-fatal, caching disabled): {:?}",
                e
            );
            None
        }
    };

    tracing::info!("Connecting to NATS at: {}", config.nats_url);
    let nats_client = match infra::init_nats(&config.nats_url).await {
        Ok(c) => {
            tracing::info!("NATS client connected.");
            Some(c)
        }
        Err(e) => {
            tracing::warn!(
                "NATS connection failed (non-fatal, pubsub disabled): {:?}",
                e
            );
            None
        }
    };

    tracing::info!(
        "Initializing S3 object storage (bucket: {})...",
        config.s3_bucket
    );
    let s3_service = S3Service::new(&config).await;
    if let Err(err) = s3_service.ensure_bucket(&config.s3_bucket).await {
        tracing::warn!(
            "Could not pre-initialize S3 bucket (will retry on demand): {:?}",
            err
        );
    } else {
        tracing::info!("S3 bucket ready: {}", config.s3_bucket);
    }

    let app_state = AppState::new(pool, redis_conn, nats_client, s3_service, config.clone());
    let router = create_router(app_state.clone());

    let (shutdown_tx, shutdown_rx) = watch::channel(false);
    tokio::spawn(shutdown_signal(shutdown_tx));

    servers::spawn_background_workers(&app_state, shutdown_rx.clone());
    servers::run_http_server(app_state, router, shutdown_rx).await?;

    tracing::info!("All servers shut down gracefully. Exiting.");
    Ok(())
}

async fn shutdown_signal(shutdown_tx: watch::Sender<bool>) {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C signal handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("Received Ctrl+C interrupt signal");
        }
        _ = terminate => {
            tracing::info!("Received SIGTERM terminate signal");
        }
    }

    let _ = shutdown_tx.send(true);
}
