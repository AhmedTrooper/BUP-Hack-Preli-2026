use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiGenerateRequest {
    pub prompt: String,
    pub model: Option<String>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiGenerateResponse {
    pub text: String,
    pub model: String,
    pub tokens_used: u32,
    pub execution_time_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_request_deserialization() {
        let json_str =
            r#"{"prompt": "Generate a test plan", "model": "gemini-1.5-pro", "temperature": 0.7}"#;
        let req: AiGenerateRequest = serde_json::from_str(json_str).unwrap();
        assert_eq!(req.prompt, "Generate a test plan");
        assert_eq!(req.model, Some("gemini-1.5-pro".to_string()));
        assert_eq!(req.temperature, Some(0.7));
    }

    #[test]
    fn test_ai_response_serialization() {
        let resp = AiGenerateResponse {
            text: "Generated response from agent".to_string(),
            model: "gemini-1.5-flash".to_string(),
            tokens_used: 42,
            execution_time_ms: 120,
        };
        let serialized = serde_json::to_string(&resp).unwrap();
        assert!(serialized.contains("Generated response from agent"));
        assert!(serialized.contains("42"));
    }
}
