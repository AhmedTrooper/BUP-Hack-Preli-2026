pub mod core;
pub mod features;
pub mod infra;
pub mod servers;

use axum::{
    Router,
    http::{HeaderName, HeaderValue, Method, Request, StatusCode, header},
    middleware::{self, Next},
    response::Response,
};
pub use core::{AppError, AppState, Config};
use std::time::Duration;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};
use uuid::Uuid;

static REQUEST_ID_HEADER: HeaderName = HeaderName::from_static("x-request-id");

async fn request_id_middleware(mut req: Request<axum::body::Body>, next: Next) -> Response {
    let request_id = match req.headers().get(&REQUEST_ID_HEADER) {
        Some(val) => val.clone(),
        None => {
            let id = Uuid::new_v4().to_string();
            HeaderValue::from_str(&id).unwrap_or_else(|_| HeaderValue::from_static("unknown"))
        }
    };

    req.headers_mut()
        .insert(REQUEST_ID_HEADER.clone(), request_id.clone());

    let mut res = next.run(req).await;
    res.headers_mut()
        .insert(REQUEST_ID_HEADER.clone(), request_id);
    res
}

pub fn create_router(state: AppState) -> Router {
    let cors_origins = state.config.cors_allowed_origins.trim();
    let cors = if cors_origins == "*"
        || cors_origins.eq_ignore_ascii_case("any")
        || cors_origins.is_empty()
    {
        CorsLayer::new().allow_origin(Any)
    } else {
        let origins: Vec<HeaderValue> = cors_origins
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .filter_map(|s| HeaderValue::from_str(s).ok())
            .collect();
        CorsLayer::new().allow_origin(origins)
    };

    let cors = cors
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            REQUEST_ID_HEADER.clone(),
        ]);

    features::configure_routes(state)
        .layer(middleware::from_fn(request_id_middleware))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(CompressionLayer::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_id_header_constant() {
        assert_eq!(REQUEST_ID_HEADER.as_str(), "x-request-id");
    }
}
