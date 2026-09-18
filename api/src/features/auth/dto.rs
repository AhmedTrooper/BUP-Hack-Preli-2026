use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub token_type: String,
    pub user_id: String,
    pub expires_in_minutes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeResponse {
    pub user_id: String,
    pub authenticated: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_login_request_deserialization() {
        let json_str = r#"{"username": "admin", "password": "secure_password"}"#;
        let req: LoginRequest = serde_json::from_str(json_str).unwrap();
        assert_eq!(req.username, "admin");
        assert_eq!(req.password, "secure_password");
    }

    #[test]
    fn test_login_response_serialization() {
        let resp = LoginResponse {
            token: "jwt-token-xyz".to_string(),
            token_type: "Bearer".to_string(),
            user_id: "user-1".to_string(),
            expires_in_minutes: 15,
        };
        let serialized = serde_json::to_string(&resp).unwrap();
        assert!(serialized.contains("jwt-token-xyz"));
        assert!(serialized.contains("Bearer"));
    }
}
