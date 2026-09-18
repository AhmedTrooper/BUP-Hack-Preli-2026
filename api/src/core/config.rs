use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub nats_url: String,
    pub s3_endpoint: Option<String>,
    pub s3_region: String,
    pub s3_bucket: String,
    pub s3_access_key: String,
    pub s3_secret_key: String,
    pub s3_force_path_style: bool,
    pub log_level: String,
    pub cors_allowed_origins: String,
    pub jwt_secret: String,
    pub jwt_access_expiration_minutes: u64,
    pub jwt_refresh_expiration_days: u64,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8080);

        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://postgres:postgres@127.0.0.1:5432/hackathon".to_string()
        });

        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

        let nats_url = env::var("NATS_URL").unwrap_or_else(|_| "nats://127.0.0.1:4222".to_string());

        let s3_endpoint = env::var("S3_ENDPOINT")
            .ok()
            .or_else(|| Some("http://127.0.0.1:9000".to_string()));

        let s3_region = env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".to_string());
        let s3_bucket = env::var("S3_BUCKET").unwrap_or_else(|_| "hackathon-bucket".to_string());
        let s3_access_key = env::var("S3_ACCESS_KEY").unwrap_or_else(|_| "minioadmin".to_string());
        let s3_secret_key = env::var("S3_SECRET_KEY").unwrap_or_else(|_| "minioadmin".to_string());
        let s3_force_path_style = env::var("S3_FORCE_PATH_STYLE")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(true);

        let log_level = env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string());
        let cors_allowed_origins =
            env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| "*".to_string());

        let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| {
            "super-secure-production-random-jwt-secret-min-32-chars".to_string()
        });
        let jwt_access_expiration_minutes = env::var("JWT_ACCESS_EXPIRATION_MINUTES")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(15);
        let jwt_refresh_expiration_days = env::var("JWT_REFRESH_EXPIRATION_DAYS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(7);

        Self {
            host,
            port,
            database_url,
            redis_url,
            nats_url,
            s3_endpoint,
            s3_region,
            s3_bucket,
            s3_access_key,
            s3_secret_key,
            s3_force_path_style,
            log_level,
            cors_allowed_origins,
            jwt_secret,
            jwt_access_expiration_minutes,
            jwt_refresh_expiration_days,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_loading() {
        let config = Config::from_env();
        assert!(!config.host.is_empty());
        assert!(config.port > 0);
        assert!(!config.database_url.is_empty());
        assert!(!config.redis_url.is_empty());
        assert!(!config.nats_url.is_empty());
        assert!(!config.s3_bucket.is_empty());
        assert!(!config.jwt_secret.is_empty());
        assert!(!config.cors_allowed_origins.is_empty());
        assert!(config.jwt_access_expiration_minutes <= 60);
        assert_eq!(config.jwt_access_expiration_minutes, 15);
    }
}
