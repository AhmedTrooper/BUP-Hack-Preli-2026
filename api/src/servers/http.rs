use crate::core::state::AppState;
use std::net::SocketAddr;
use tokio::sync::watch;

pub async fn run_http_server(
    state: AppState,
    router: axum::Router,
    mut shutdown_rx: watch::Receiver<bool>,
) -> Result<(), Box<dyn std::error::Error>> {
    let addr: SocketAddr = format!("{}:{}", state.config.host, state.config.port).parse()?;
    tracing::info!("🌐 HTTP & WebSocket server binding on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(listener, router)
        .with_graceful_shutdown(async move {
            loop {
                if shutdown_rx.changed().await.is_err() || *shutdown_rx.borrow() {
                    tracing::info!("HTTP server received graceful shutdown signal");
                    break;
                }
            }
        })
        .await?;

    Ok(())
}
