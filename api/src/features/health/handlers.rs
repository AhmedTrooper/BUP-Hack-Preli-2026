use crate::core::state::AppState;
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct HealthOkResponse {
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LivenessResponse {
    pub status: String,
    pub uptime_seconds: u64,
}

pub async fn health_handler() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(HealthOkResponse {
            status: "ok".to_string(),
        }),
    )
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub postgres: String,
    pub redis: String,
    pub nats: String,
    pub s3: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadinessResponse {
    pub status: String,
    pub services: ServiceStatus,
    pub uptime_seconds: u64,
}

pub async fn liveness_handler(State(state): State<AppState>) -> impl IntoResponse {
    let uptime = state.start_time.elapsed().as_secs();
    (
        StatusCode::OK,
        Json(LivenessResponse {
            status: "alive".to_string(),
            uptime_seconds: uptime,
        }),
    )
}

pub async fn readiness_handler(State(state): State<AppState>) -> impl IntoResponse {
    let uptime = state.start_time.elapsed().as_secs();

    let pg_status = match sqlx::query("SELECT 1").execute(&state.db).await {
        Ok(_) => "connected",
        Err(e) => {
            tracing::warn!("Postgres readiness check failed: {:?}", e);
            "disconnected"
        }
    };

    let redis_status = if let Some(mut redis_conn) = state.redis.clone() {
        match redis::cmd("PING")
            .query_async::<String>(&mut redis_conn)
            .await
        {
            Ok(_) => "connected",
            Err(e) => {
                tracing::warn!("Redis readiness check failed: {:?}", e);
                "disconnected"
            }
        }
    } else {
        "disabled"
    };

    let nats_status = if let Some(nats) = &state.nats {
        match nats.connection_state() {
            async_nats::connection::State::Connected => "connected",
            _ => "disconnected",
        }
    } else {
        "disabled"
    };

    let s3_status = match state.s3.ensure_bucket(&state.s3.default_bucket).await {
        Ok(_) => "connected",
        Err(e) => {
            tracing::warn!("S3 readiness check failed: {:?}", e);
            "disconnected"
        }
    };

    let all_healthy = pg_status == "connected"
        && redis_status == "connected"
        && nats_status == "connected"
        && s3_status == "connected";

    let overall_status = if all_healthy { "ready" } else { "degraded" };
    let http_status = if all_healthy {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (
        http_status,
        Json(ReadinessResponse {
            status: overall_status.to_string(),
            services: ServiceStatus {
                postgres: pg_status.to_string(),
                redis: redis_status.to_string(),
                nats: nats_status.to_string(),
                s3: s3_status.to_string(),
            },
            uptime_seconds: uptime,
        }),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_ok_response_json() {
        let resp = HealthOkResponse {
            status: "ok".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert_eq!(json, "{\"status\":\"ok\"}");
    }

    #[test]
    fn test_liveness_response_json() {
        let resp = LivenessResponse {
            status: "alive".to_string(),
            uptime_seconds: 42,
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("alive"));
        assert!(json.contains("42"));
    }
}
