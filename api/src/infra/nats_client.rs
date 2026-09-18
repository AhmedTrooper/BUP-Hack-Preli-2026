use crate::core::error::AppError;
use async_nats::Client;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::sync::watch;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NatsMessagePayload {
    pub subject: String,
    pub message: String,
    pub timestamp: i64,
}

pub async fn init_nats(nats_url: &str) -> Result<Client, AppError> {
    let client = async_nats::connect(nats_url)
        .await
        .map_err(|e| AppError::Nats(e.to_string()))?;
    Ok(client)
}

pub async fn publish_message(
    client: &Client,
    subject: &str,
    message: &str,
) -> Result<(), AppError> {
    let payload = NatsMessagePayload {
        subject: subject.to_string(),
        message: message.to_string(),
        timestamp: chrono::Utc::now().timestamp_millis(),
    };

    let bytes = serde_json::to_vec(&payload)
        .map_err(|e| AppError::Internal(format!("Failed to serialize NATS message: {e}")))?;

    client
        .publish(subject.to_string(), bytes.into())
        .await
        .map_err(|e| AppError::NatsPublish(e.to_string()))?;

    Ok(())
}

pub fn spawn_nats_subscriber(
    client: Client,
    subject: String,
    mut shutdown_rx: watch::Receiver<bool>,
) {
    tokio::spawn(async move {
        tracing::info!("Started background NATS subscriber on subject: {}", subject);

        match client.subscribe(subject.clone()).await {
            Ok(mut subscriber) => loop {
                tokio::select! {
                    _ = shutdown_rx.changed() => {
                        if *shutdown_rx.borrow() {
                            tracing::info!("Shutting down NATS subscriber on subject: {}", subject);
                            break;
                        }
                    }
                    maybe_msg = subscriber.next() => {
                        match maybe_msg {
                            Some(msg) => {
                                let payload_str = String::from_utf8_lossy(&msg.payload);
                                tracing::info!(
                                    "NATS message received on [{}]: {}",
                                    msg.subject,
                                    payload_str
                                );
                            }
                            None => break,
                        }
                    }
                }
            },
            Err(err) => {
                tracing::error!("Failed to subscribe to NATS subject {}: {:?}", subject, err);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nats_payload_serialization() {
        let payload = NatsMessagePayload {
            subject: "events.notification".to_string(),
            message: "System deployed".to_string(),
            timestamp: 1700000000,
        };

        let json = serde_json::to_string(&payload).unwrap();
        let decoded: NatsMessagePayload = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded, payload);
    }
}
