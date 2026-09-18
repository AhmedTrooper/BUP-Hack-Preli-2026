use crate::{
    core::config::Config,
    features::energy::{
        dto::DirectiveInterpretation,
        guardrails::{fallback_extract_directive, validate_and_normalize_directive},
    },
    infra::complete_prompt,
};

const SYSTEM_PROMPT: &str = r#"You are an expert energy grid operator and directive interpreter for the GridWise system.
Given a battery capacity (in kWh) and a list of operator notes (0-indexed), interpret each note into a structured JSON directive.

Allowed directive_type values:
- "solar_reduction": Usable solar output reduced during panel maintenance/cleaning/inverter work.
  structured_adjustment: {"hours": [int...], "factor": float}
  Note: factor is the fraction of solar remaining (0.0 to 1.0). "25% of forecast" -> 0.25. "80% reduction" -> 0.20. "half" -> 0.50.
- "minimum_battery_reserve": Battery reserve requirement.
  structured_adjustment: {"hours": [int...], "minimum_energy_kwh": float}
  Note: If given in percent (e.g. 50%), compute as (percentage / 100.0) * capacity_kwh.
- "no_charge_window": Battery charger isolated or charging prohibited.
  structured_adjustment: {"hours": [int...]}
- "no_discharge_window": Battery discharge prohibited or protection/relay testing.
  structured_adjustment: {"hours": [int...]}
- "max_grid_window": Grid import/intake capped due to feeder/transformer/substation limits.
  structured_adjustment: {"hours": [int...], "max_grid_kwh": float}
- "no_op": Irrelevant notices (e.g. sports deadlines, library hours, student club news, room bookings).
  applies: false, structured_adjustment: null

Hour Window Normalization (0-23, start-inclusive, end-exclusive):
- "noon until 2 PM" -> [12, 13]
- "2 AM until 5 AM" -> [2, 3, 4]
- "6 PM until 9 PM" -> [18, 19, 20]
- "6 PM until 10 PM" -> [18, 19, 20, 21]
- "10 AM until noon" -> [10, 11]
- "11 AM until 1 PM" -> [11, 12]
- "11 AM until 2 PM" -> [11, 12, 13]
- "2 PM until 4 PM" -> [14, 15]
- "5 PM until 7 PM" -> [17, 18]
- "7 PM until 9 PM" -> [19, 20]
- "7 PM until 10 PM" -> [19, 20, 21]

Format requirement:
Return ONLY a valid JSON array of directive objects matching this schema:
[
  {
    "note_index": 0,
    "applies": true,
    "directive_type": "...",
    "structured_adjustment": {...},
    "explanation": "..."
  }
]
No markdown formatting, no code fences.
"#;

pub async fn interpret_notes_with_llm(
    notes: &[String],
    capacity_kwh: f64,
    config: &Config,
) -> Vec<DirectiveInterpretation> {
    if let Some(api_key) = &config.llm_api_key
        && !api_key.trim().is_empty()
    {
        let user_prompt = format!(
            "Battery capacity: {:.2} kWh.\nOperator Notes:\n{}",
            capacity_kwh,
            notes
                .iter()
                .enumerate()
                .map(|(i, n)| format!("[Note {}]: {}", i, n))
                .collect::<Vec<_>>()
                .join("\n")
        );

        for attempt in 0..2 {
            if attempt > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
            if let Ok(response_text) =
                complete_prompt(config, Some(SYSTEM_PROMPT), &user_prompt, Some(0.0)).await
                && let Some(mut parsed) = parse_llm_json_response(&response_text)
                && parsed.len() == notes.len()
            {
                for interp in parsed.iter_mut() {
                    validate_and_normalize_directive(interp, capacity_kwh);
                }
                return parsed;
            }
        }
    }

    notes
        .iter()
        .enumerate()
        .map(|(idx, note)| fallback_extract_directive(note, idx, capacity_kwh))
        .collect()
}

fn parse_llm_json_response(raw: &str) -> Option<Vec<DirectiveInterpretation>> {
    let mut cleaned = raw.trim();
    if let Some(start) = cleaned.find('[')
        && let Some(end) = cleaned.rfind(']')
    {
        cleaned = &cleaned[start..=end];
    }
    serde_json::from_str::<Vec<DirectiveInterpretation>>(cleaned).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fallback_when_no_api_key() {
        let mut config = Config::from_env();
        config.llm_api_key = None;

        let notes = vec![
            "Facilities will wash the rooftop solar panels from noon until 2 PM. Usable solar roughly 25%.".to_string(),
            "Sports day moved.".to_string(),
        ];

        let interpretations = interpret_notes_with_llm(&notes, 220.0, &config).await;
        assert_eq!(interpretations.len(), 2);
        assert_eq!(interpretations[0].directive_type, "solar_reduction");
        assert!(interpretations[0].applies);
        assert_eq!(interpretations[1].directive_type, "no_op");
        assert!(!interpretations[1].applies);
    }
}
