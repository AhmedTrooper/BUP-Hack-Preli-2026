use crate::core::error::AppError;
use redis::{AsyncCommands, Client, aio::ConnectionManager};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::sync::watch;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StreamEvent {
    pub event_type: String,
    pub payload: String,
    pub timestamp: i64,
}

pub async fn init_redis(redis_url: &str) -> Result<ConnectionManager, AppError> {
    let client = Client::open(redis_url).map_err(AppError::Redis)?;
    let manager = ConnectionManager::new(client)
        .await
        .map_err(AppError::Redis)?;
    Ok(manager)
}

pub async fn set_cache(
    conn: &mut ConnectionManager,
    key: &str,
    value: &str,
    ttl_seconds: Option<u64>,
) -> Result<(), AppError> {
    if let Some(ttl) = ttl_seconds {
        let _: () = conn
            .set_ex(key, value, ttl)
            .await
            .map_err(AppError::Redis)?;
    } else {
        let _: () = conn.set(key, value).await.map_err(AppError::Redis)?;
    }
    Ok(())
}

pub async fn get_cache(
    conn: &mut ConnectionManager,
    key: &str,
) -> Result<Option<String>, AppError> {
    let val: Option<String> = conn.get(key).await.map_err(AppError::Redis)?;
    Ok(val)
}

pub async fn delete_cache(conn: &mut ConnectionManager, key: &str) -> Result<bool, AppError> {
    let deleted: i64 = conn.del(key).await.map_err(AppError::Redis)?;
    Ok(deleted > 0)
}

pub async fn publish_stream_event(
    conn: &mut ConnectionManager,
    stream: &str,
    event_type: &str,
    payload: &str,
) -> Result<String, AppError> {
    let timestamp = chrono::Utc::now().timestamp_millis();
    let event_id: String = conn
        .xadd(
            stream,
            "*",
            &[
                ("event_type", event_type),
                ("payload", payload),
                ("timestamp", &timestamp.to_string()),
            ],
        )
        .await
        .map_err(AppError::Redis)?;

    Ok(event_id)
}

pub fn spawn_stream_worker(
    mut conn: ConnectionManager,
    stream: String,
    mut shutdown_rx: watch::Receiver<bool>,
) {
    tokio::spawn(async move {
        tracing::info!(
            "Started background Redis Stream worker for stream: {}",
            stream
        );
        let mut last_id = "$".to_string();

        loop {
            let stream_key = stream.clone();
            let current_id = last_id.clone();

            tokio::select! {
                _ = shutdown_rx.changed() => {
                    if *shutdown_rx.borrow() {
                        tracing::info!("Shutting down Redis Stream worker for stream: {}", stream);
                        break;
                    }
                }
                result = async {
                    let streams = [stream_key.as_str()];
                    let ids = [current_id.as_str()];
                    conn.xread::<_, _, redis::streams::StreamReadReply>(&streams, &ids).await
                } => {
                    match result {
                        Ok(reply) => {
                            for key in reply.keys {
                                for id in key.ids {
                                    last_id = id.id.clone();
                                    tracing::info!(
                                        "Stream event received [{}]: {:?}",
                                        id.id,
                                        id.map
                                    );
                                }
                            }
                        }
                        Err(err) => {
                            tracing::warn!("Error reading from Redis stream {}: {:?}", stream, err);
                            tokio::time::sleep(Duration::from_millis(1000)).await;
                        }
                    }
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stream_event_serialization() {
        let event = StreamEvent {
            event_type: "user_registered".to_string(),
            payload: r#"{"email":"dev@hackathon.local"}"#.to_string(),
            timestamp: 1700000000,
        };

        let json = serde_json::to_string(&event).unwrap();
        let decoded: StreamEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded, event);
    }
}
