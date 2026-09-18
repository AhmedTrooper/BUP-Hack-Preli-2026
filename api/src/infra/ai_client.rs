use crate::core::config::Config;
use rig_core::{
    client::CompletionClient,
    completion::{AssistantContent, CompletionModel},
    providers::{anthropic, deepseek, gemini, openai},
};
use std::time::Duration;
use tokio::time::timeout;

pub async fn complete_prompt(
    config: &Config,
    system_prompt: Option<&str>,
    user_prompt: &str,
    temperature: Option<f64>,
) -> Result<String, String> {
    let api_key = config
        .llm_api_key
        .as_deref()
        .filter(|k| !k.trim().is_empty())
        .ok_or_else(|| "LLM API key is not configured".to_string())?;

    let provider = config.llm_provider.trim().to_lowercase();
    let model = config.llm_model.trim();
    let temp = temperature.unwrap_or(0.0);
    let base_url = config.llm_base_url.as_deref();

    let query_future = async {
        let choice = match provider.as_str() {
            "gemini" | "google" => {
                let client = gemini::Client::new(api_key).map_err(|e| e.to_string())?;
                let model = client.completion_model(model);
                let mut req = model.completion_request(user_prompt).temperature(temp);
                if let Some(sys) = system_prompt {
                    req = req.preamble(sys.to_string());
                }
                let resp = model
                    .completion(req.build())
                    .await
                    .map_err(|e| e.to_string())?;
                resp.choice
            }
            "anthropic" | "claude" => {
                let client = anthropic::Client::new(api_key).map_err(|e| e.to_string())?;
                let model = client.completion_model(model);
                let mut req = model.completion_request(user_prompt).temperature(temp);
                if let Some(sys) = system_prompt {
                    req = req.preamble(sys.to_string());
                }
                let resp = model
                    .completion(req.build())
                    .await
                    .map_err(|e| e.to_string())?;
                resp.choice
            }
            "deepseek" | "deep-seek" => {
                let client = deepseek::Client::new(api_key).map_err(|e| e.to_string())?;
                let model = client.completion_model(model);
                let mut req = model.completion_request(user_prompt).temperature(temp);
                if let Some(sys) = system_prompt {
                    req = req.preamble(sys.to_string());
                }
                let resp = model
                    .completion(req.build())
                    .await
                    .map_err(|e| e.to_string())?;
                resp.choice
            }
            // Matches "openai", "openrouter", "groq", and any OpenAI-compatible provider
            _ => {
                let client = if let Some(url) = base_url {
                    openai::Client::builder()
                        .api_key(api_key)
                        .base_url(url)
                        .build()
                        .map_err(|e| e.to_string())?
                } else {
                    openai::Client::new(api_key).map_err(|e| e.to_string())?
                };
                let model = client.completion_model(model);
                let mut req = model.completion_request(user_prompt).temperature(temp);
                if let Some(sys) = system_prompt {
                    req = req.preamble(sys.to_string());
                }
                let resp = model
                    .completion(req.build())
                    .await
                    .map_err(|e| e.to_string())?;
                resp.choice
            }
        };

        Ok(extract_text(choice))
    };

    match timeout(Duration::from_secs(10), query_future).await {
        Ok(res) => res,
        Err(_) => Err("LLM query timed out after 10 seconds".to_string()),
    }
}

fn extract_text(choice: Vec<AssistantContent>) -> String {
    let mut out = String::new();
    for item in choice {
        if let AssistantContent::Text(t) = item {
            out.push_str(&t.text);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_missing_api_key_returns_err() {
        let mut config = Config::from_env();
        config.llm_api_key = None;

        let res = complete_prompt(&config, Some("System"), "User", None).await;
        assert!(res.is_err());
    }
}
