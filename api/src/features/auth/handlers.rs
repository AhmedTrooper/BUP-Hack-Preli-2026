use crate::{
    core::{
        error::AppError,
        security::{AuthenticatedUser, create_access_token},
        state::AppState,
    },
    features::auth::dto::{LoginRequest, LoginResponse, MeResponse},
};
use axum::{Json, extract::State};

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    if payload.username.trim().is_empty() || payload.password.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Username and password must not be empty".to_string(),
        ));
    }

    let token = create_access_token(&payload.username, &state.config)?;

    Ok(Json(LoginResponse {
        token,
        token_type: "Bearer".to_string(),
        user_id: payload.username,
        expires_in_minutes: state.config.jwt_access_expiration_minutes,
    }))
}

pub async fn me(user: AuthenticatedUser) -> Result<Json<MeResponse>, AppError> {
    Ok(Json(MeResponse {
        user_id: user.user_id,
        authenticated: true,
    }))
}
