use super::{config::Config, error::AppError};
use axum::{
    extract::FromRequestParts,
    http::{header, request::Parts},
};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Claims {
    pub sub: String,
    pub exp: u64,
    pub iat: u64,
}

pub fn create_access_token(user_id: &str, config: &Config) -> Result<String, AppError> {
    let now = chrono::Utc::now().timestamp() as u64;
    let exp = now + (config.jwt_access_expiration_minutes * 60);

    let claims = Claims {
        sub: user_id.to_string(),
        exp,
        iat: now,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Failed to create token: {e}")))
}

pub fn verify_token(token: &str, config: &Config) -> Result<Claims, AppError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| AppError::Unauthorized(format!("Invalid or expired token: {e}")))?;

    Ok(token_data.claims)
}

pub fn hash_password(password: &str) -> Result<String, AppError> {
    bcrypt::hash(password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError::Internal(format!("Failed to hash password: {e}")))
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    bcrypt::verify(password, hash)
        .map_err(|e| AppError::Internal(format!("Failed to verify password: {e}")))
}

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub user_id: String,
}

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".to_string()))?;

        if !auth_header.starts_with("Bearer ") {
            return Err(AppError::Unauthorized(
                "Invalid Authorization format, expected 'Bearer <token>'".to_string(),
            ));
        }

        let token = &auth_header[7..];
        let config = Config::from_env();
        let claims = verify_token(token, &config)?;

        Ok(AuthenticatedUser {
            user_id: claims.sub,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_create_and_verify() {
        let config = Config::from_env();
        let user_id = "user-12345";

        let token = create_access_token(user_id, &config).unwrap();
        assert!(!token.is_empty());

        let claims = verify_token(&token, &config).unwrap();
        assert_eq!(claims.sub, user_id);
    }

    #[test]
    fn test_password_hash_and_verify() {
        let password = "SuperSecretPassword123!";
        let hash = hash_password(password).unwrap();
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("WrongPassword", &hash).unwrap());
    }
}
