use crate::features::energy::dto::{DirectiveInterpretation, StructuredAdjustment};
use std::collections::BTreeSet;

pub const ALLOWED_DIRECTIVES: &[&str] = &[
    "solar_reduction",
    "minimum_battery_reserve",
    "no_charge_window",
    "no_discharge_window",
    "max_grid_window",
    "no_op",
];

pub fn validate_and_normalize_directive(interp: &mut DirectiveInterpretation, capacity_kwh: f64) {
    if !ALLOWED_DIRECTIVES.contains(&interp.directive_type.as_str()) {
        interp.directive_type = "no_op".to_string();
        interp.applies = false;
        interp.structured_adjustment = None;
        return;
    }

    if interp.directive_type == "no_op" {
        interp.applies = false;
        interp.structured_adjustment = None;
        return;
    }

    if let Some(adj) = &mut interp.structured_adjustment {
        let has_valid_hours = if let Some(hours) = &mut adj.hours {
            let mut unique_hours = BTreeSet::new();
            for &h in hours.iter() {
                if h < 24 {
                    unique_hours.insert(h);
                }
            }
            *hours = unique_hours.into_iter().collect();
            !hours.is_empty()
        } else {
            false
        };

        if !has_valid_hours {
            interp.directive_type = "no_op".to_string();
            interp.applies = false;
            interp.structured_adjustment = None;
            return;
        }

        interp.applies = true;

        match interp.directive_type.as_str() {
            "solar_reduction" => {
                let Some(factor) = adj.factor else {
                    interp.directive_type = "no_op".to_string();
                    interp.applies = false;
                    interp.structured_adjustment = None;
                    return;
                };
                adj.factor = Some(factor.clamp(0.0, 1.0));
                adj.minimum_energy_kwh = None;
                adj.max_grid_kwh = None;
            }
            "minimum_battery_reserve" => {
                let Some(min_energy) = adj.minimum_energy_kwh else {
                    interp.directive_type = "no_op".to_string();
                    interp.applies = false;
                    interp.structured_adjustment = None;
                    return;
                };
                adj.minimum_energy_kwh = Some(min_energy.clamp(0.0, capacity_kwh));
                adj.factor = None;
                adj.max_grid_kwh = None;
            }
            "max_grid_window" => {
                let Some(max_grid) = adj.max_grid_kwh else {
                    interp.directive_type = "no_op".to_string();
                    interp.applies = false;
                    interp.structured_adjustment = None;
                    return;
                };
                adj.max_grid_kwh = Some(max_grid.max(0.0));
                adj.factor = None;
                adj.minimum_energy_kwh = None;
            }
            "no_charge_window" | "no_discharge_window" => {
                adj.factor = None;
                adj.minimum_energy_kwh = None;
                adj.max_grid_kwh = None;
            }
            _ => {
                interp.directive_type = "no_op".to_string();
                interp.applies = false;
                interp.structured_adjustment = None;
            }
        }
    } else {
        interp.directive_type = "no_op".to_string();
        interp.applies = false;
    }
}

fn parse_hour_str(s: &str) -> Option<u8> {
    let lower = s.trim().to_lowercase();
    if lower == "noon" || lower == "12 pm" {
        return Some(12);
    }
    if lower == "midnight" || lower == "12 am" {
        return Some(0);
    }

    let is_pm = lower.contains("pm");
    let is_am = lower.contains("am");

    let hour_part = if let Some((h_str, _)) = lower.split_once(':') {
        h_str
    } else {
        &lower
    };

    let num_str: String = hour_part.chars().filter(|c| c.is_ascii_digit()).collect();
    if let Ok(mut h) = num_str.parse::<u8>() {
        if is_pm && h < 12 {
            h += 12;
        } else if is_am && h == 12 {
            h = 0;
        }
        if h < 24 {
            return Some(h);
        }
    }
    None
}

fn try_parse_range_from_slice(slice: &str, delimiters: &[&str]) -> Option<Vec<u8>> {
    for delim in delimiters {
        if let Some(delim_idx) = slice.find(delim) {
            let first_part = slice[..delim_idx].trim();
            let first_words: Vec<String> = first_part
                .split_whitespace()
                .map(|w| {
                    w.trim_matches(|c: char| !c.is_alphanumeric() && c != ':')
                        .to_string()
                })
                .filter(|w| !w.is_empty())
                .collect();
            if first_words.is_empty() {
                continue;
            }

            let first_token = if first_words.len() >= 2
                && (first_words[first_words.len() - 1].eq_ignore_ascii_case("am")
                    || first_words[first_words.len() - 1].eq_ignore_ascii_case("pm"))
            {
                format!(
                    "{} {}",
                    first_words[first_words.len() - 2],
                    first_words[first_words.len() - 1]
                )
            } else {
                first_words[first_words.len() - 1].clone()
            };

            let second_part_raw = &slice[delim_idx + delim.len()..];
            let clean_words: Vec<String> = second_part_raw
                .split_whitespace()
                .map(|w| {
                    w.trim_matches(|c: char| !c.is_alphanumeric() && c != ':')
                        .to_string()
                })
                .filter(|w| !w.is_empty())
                .collect();
            if clean_words.is_empty() {
                continue;
            }

            let mut second_part = clean_words[0].clone();
            if clean_words.len() > 1
                && (clean_words[1].eq_ignore_ascii_case("am")
                    || clean_words[1].eq_ignore_ascii_case("pm"))
            {
                second_part.push(' ');
                second_part.push_str(&clean_words[1]);
            }

            let mut first_str = first_token.clone();
            if !first_str.contains("am")
                && !first_str.contains("pm")
                && !first_str.contains("noon")
                && !first_str.contains("midnight")
            {
                if second_part.contains("pm") {
                    first_str.push_str(" pm");
                } else if second_part.contains("am") {
                    first_str.push_str(" am");
                }
            }

            if let (Some(h1), Some(h2)) = (parse_hour_str(&first_str), parse_hour_str(&second_part))
            {
                if h1 < h2 {
                    return Some((h1..h2).collect());
                } else if h1 > h2 {
                    let mut hrs: Vec<u8> = (h1..24).chain(0..h2).collect();
                    hrs.sort();
                    return Some(hrs);
                }
            }
        }
    }
    None
}

pub fn extract_hours_from_note(note: &str) -> Vec<u8> {
    let normalized = note.replace(['–', '—'], "-");
    let lower = normalized.to_lowercase();

    let delimiters = ["until", "through", "to", "and", "-"];
    let prefix_markers = ["from", "between", "during", "in", "at"];

    for prefix in prefix_markers {
        if let Some(start_idx) = lower.find(prefix) {
            let after_prefix = &lower[start_idx + prefix.len()..];
            if let Some(res) = try_parse_range_from_slice(after_prefix, &delimiters) {
                return res;
            }
        }
    }

    if let Some(res) = try_parse_range_from_slice(&lower, &delimiters) {
        return res;
    }

    Vec::new()
}

fn extract_kwh_near_keywords(text: &str, keywords: &[&str]) -> Option<f64> {
    let mut best_val = None;
    let mut min_dist = usize::MAX;

    let mut start = 0;
    while let Some(rel_idx) = text[start..].find("kwh") {
        let kwh_idx = start + rel_idx;
        let slice = &text[..kwh_idx].trim_end();
        let digits: String = slice
            .chars()
            .rev()
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect();
        let digits: String = digits.chars().rev().collect();
        if let Ok(val) = digits.parse::<f64>() {
            let mut closest = usize::MAX;
            for kw in keywords {
                let mut kw_start = 0;
                while let Some(kw_rel) = text[kw_start..].find(kw) {
                    let kw_pos = kw_start + kw_rel;
                    let dist = kw_pos.abs_diff(kwh_idx);
                    closest = closest.min(dist);
                    kw_start = kw_pos + kw.len();
                }
            }
            if closest < min_dist {
                min_dist = closest;
                best_val = Some(val);
            }
        }
        start = kwh_idx + 3;
    }

    best_val
}

pub fn fallback_extract_directive(
    note: &str,
    note_index: usize,
    capacity_kwh: f64,
) -> DirectiveInterpretation {
    let lower = note.to_lowercase();
    let hours = extract_hours_from_note(note);

    if lower.contains("solar")
        || lower.contains("panel")
        || lower.contains("pv")
        || lower.contains("inverter")
    {
        let mut factor = 1.0;
        if let Some(pct_idx) = lower.find('%') {
            let slice = &lower[..pct_idx];
            let digits: String = slice
                .chars()
                .rev()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            let digits: String = digits.chars().rev().collect();
            if let Ok(pct) = digits.parse::<f64>() {
                if lower.contains("reduction")
                    || lower.contains("reduce")
                    || lower.contains("cut")
                    || lower.contains("loss")
                    || lower.contains("lost")
                    || lower.contains("drop by")
                    || lower.contains("down by")
                {
                    factor = ((100.0 - pct) / 100.0).clamp(0.0, 1.0);
                } else {
                    factor = (pct / 100.0).clamp(0.0, 1.0);
                }
            }
        } else if lower.contains("half") || lower.contains("halve") {
            factor = 0.50;
        } else if lower.contains("one third") || lower.contains("1/3") {
            factor = 1.0 / 3.0;
        } else if lower.contains("one fourth") || lower.contains("quarter") || lower.contains("1/4")
        {
            factor = 0.25;
        }

        let mut interp = DirectiveInterpretation {
            note_index,
            applies: true,
            directive_type: "solar_reduction".to_string(),
            structured_adjustment: Some(StructuredAdjustment {
                hours: Some(hours),
                factor: Some(factor),
                minimum_energy_kwh: None,
                max_grid_kwh: None,
            }),
            explanation: "Solar output adjusted per maintenance directive.".to_string(),
        };
        validate_and_normalize_directive(&mut interp, capacity_kwh);
        return interp;
    }

    if (lower.contains("charger") || lower.contains("charging"))
        && (lower.contains("isolated")
            || lower.contains("unavailable")
            || lower.contains("disabled")
            || lower.contains("outage")
            || lower.contains("stop")
            || lower.contains("prohibit")
            || lower.contains("no charge"))
    {
        let mut interp = DirectiveInterpretation {
            note_index,
            applies: true,
            directive_type: "no_charge_window".to_string(),
            structured_adjustment: Some(StructuredAdjustment {
                hours: Some(hours),
                factor: None,
                minimum_energy_kwh: None,
                max_grid_kwh: None,
            }),
            explanation: "Battery charging circuit disabled during maintenance window.".to_string(),
        };
        validate_and_normalize_directive(&mut interp, capacity_kwh);
        return interp;
    }

    if (lower.contains("discharge") || lower.contains("discharging"))
        && (lower.contains("not discharge")
            || lower.contains("relay testing")
            || lower.contains("stop")
            || lower.contains("prohibit")
            || lower.contains("prevent")
            || lower.contains("disabled")
            || lower.contains("isolated"))
    {
        let mut interp = DirectiveInterpretation {
            note_index,
            applies: true,
            directive_type: "no_discharge_window".to_string(),
            structured_adjustment: Some(StructuredAdjustment {
                hours: Some(hours),
                factor: None,
                minimum_energy_kwh: None,
                max_grid_kwh: None,
            }),
            explanation: "Battery discharge prohibited during protection testing.".to_string(),
        };
        validate_and_normalize_directive(&mut interp, capacity_kwh);
        return interp;
    }

    if (lower.contains("battery")
        || lower.contains("capacity")
        || lower.contains("stored")
        || lower.contains("reserve")
        || lower.contains("soc")
        || lower.contains("energy level")
        || lower.contains("remain"))
        && (lower.contains("at least")
            || lower.contains("keep")
            || lower.contains("requires")
            || lower.contains("maintain")
            || lower.contains("minimum")
            || lower.contains("reserve")
            || lower.contains("floor"))
    {
        let mut val = 0.0;
        if let Some(pct_idx) = lower.find('%') {
            let slice = &lower[..pct_idx];
            let digits: String = slice
                .chars()
                .rev()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            let digits: String = digits.chars().rev().collect();
            if let Ok(pct) = digits.parse::<f64>() {
                val = (pct / 100.0) * capacity_kwh;
            }
        } else if let Some(extracted) = extract_kwh_near_keywords(
            &lower,
            &[
                "battery", "reserve", "capacity", "keep", "maintain", "least",
            ],
        ) {
            val = extracted;
        }

        let mut interp = DirectiveInterpretation {
            note_index,
            applies: true,
            directive_type: "minimum_battery_reserve".to_string(),
            structured_adjustment: Some(StructuredAdjustment {
                hours: Some(hours),
                factor: None,
                minimum_energy_kwh: Some(val),
                max_grid_kwh: None,
            }),
            explanation: "Minimum battery reserve requirement enforced.".to_string(),
        };
        validate_and_normalize_directive(&mut interp, capacity_kwh);
        return interp;
    }

    if (lower.contains("grid import")
        || lower.contains("grid intake")
        || lower.contains("grid")
        || lower.contains("transformer")
        || lower.contains("substation")
        || lower.contains("feeder"))
        && (lower.contains("not exceed")
            || lower.contains("limit")
            || lower.contains("stay at or below")
            || lower.contains("cap")
            || lower.contains("maximum")
            || lower.contains("ceiling"))
    {
        let val = extract_kwh_near_keywords(
            &lower,
            &[
                "grid",
                "import",
                "intake",
                "transformer",
                "cap",
                "limit",
                "below",
                "exceed",
                "maximum",
            ],
        )
        .unwrap_or(f64::INFINITY);

        let mut interp = DirectiveInterpretation {
            note_index,
            applies: true,
            directive_type: "max_grid_window".to_string(),
            structured_adjustment: Some(StructuredAdjustment {
                hours: Some(hours),
                factor: None,
                minimum_energy_kwh: None,
                max_grid_kwh: Some(val),
            }),
            explanation: "Grid intake ceiling enforced.".to_string(),
        };
        validate_and_normalize_directive(&mut interp, capacity_kwh);
        return interp;
    }

    DirectiveInterpretation {
        note_index,
        applies: false,
        directive_type: "no_op".to_string(),
        structured_adjustment: None,
        explanation: "This note does not affect today's 24-hour energy schedule.".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_hours_noon_to_2pm() {
        let note = "Facilities will wash panels from noon until 2 PM.";
        let hours = extract_hours_from_note(note);
        assert_eq!(hours, vec![12, 13]);
    }

    #[test]
    fn test_extract_hours_2am_to_5am() {
        let note = "The battery charger will be isolated from 2 AM until 5 AM.";
        let hours = extract_hours_from_note(note);
        assert_eq!(hours, vec![2, 3, 4]);
    }

    #[test]
    fn test_no_op_normalization() {
        let mut interp = DirectiveInterpretation {
            note_index: 0,
            applies: true,
            directive_type: "no_op".to_string(),
            structured_adjustment: Some(StructuredAdjustment {
                hours: Some(vec![1, 2]),
                factor: None,
                minimum_energy_kwh: None,
                max_grid_kwh: None,
            }),
            explanation: "test".to_string(),
        };
        validate_and_normalize_directive(&mut interp, 200.0);
        assert!(!interp.applies);
        assert!(interp.structured_adjustment.is_none());
    }

    #[test]
    fn test_extract_hours_colon_and_dash() {
        let note = "Panel cleaning between 11:00 AM – 1:00 PM.";
        let hours = extract_hours_from_note(note);
        assert_eq!(hours, vec![11, 12]);
    }

    #[test]
    fn test_empty_hours_downgrade_to_no_op() {
        let mut interp = DirectiveInterpretation {
            note_index: 0,
            applies: true,
            directive_type: "solar_reduction".to_string(),
            structured_adjustment: Some(StructuredAdjustment {
                hours: Some(vec![]),
                factor: Some(0.5),
                minimum_energy_kwh: None,
                max_grid_kwh: None,
            }),
            explanation: "test".to_string(),
        };
        validate_and_normalize_directive(&mut interp, 100.0);
        assert_eq!(interp.directive_type, "no_op");
        assert!(!interp.applies);
        assert!(interp.structured_adjustment.is_none());
    }

    #[test]
    fn test_missing_factor_downgrade_to_no_op() {
        let mut interp = DirectiveInterpretation {
            note_index: 0,
            applies: true,
            directive_type: "solar_reduction".to_string(),
            structured_adjustment: Some(StructuredAdjustment {
                hours: Some(vec![12, 13]),
                factor: None,
                minimum_energy_kwh: None,
                max_grid_kwh: None,
            }),
            explanation: "test".to_string(),
        };
        validate_and_normalize_directive(&mut interp, 100.0);
        assert_eq!(interp.directive_type, "no_op");
        assert!(!interp.applies);
        assert!(interp.structured_adjustment.is_none());
    }

    #[test]
    fn test_extract_hours_without_prefix() {
        let note = "Battery discharge prohibited 6 PM - 9 PM for relay testing.";
        let hours = extract_hours_from_note(note);
        assert_eq!(hours, vec![18, 19, 20]);
    }

    #[test]
    fn test_fallback_solar_reduction_generic_percentage() {
        let note = "Solar output cut by 40% between 11 AM and 2 PM.";
        let interp = fallback_extract_directive(note, 0, 200.0);
        assert_eq!(interp.directive_type, "solar_reduction");
        assert!(interp.applies);
        let adj = interp.structured_adjustment.unwrap();
        assert_eq!(adj.hours, Some(vec![11, 12, 13]));
        assert!((adj.factor.unwrap() - 0.60).abs() < 1e-4);
    }

    #[test]
    fn test_fallback_max_grid_kwh_near_keyword() {
        let note = "Discharge 50 kWh max, but grid import cap is 120 kWh from 6 PM to 9 PM.";
        let interp = fallback_extract_directive(note, 0, 200.0);
        assert_eq!(interp.directive_type, "max_grid_window");
        let adj = interp.structured_adjustment.unwrap();
        assert_eq!(adj.hours, Some(vec![18, 19, 20]));
        assert_eq!(adj.max_grid_kwh, Some(120.0));
    }

    #[test]
    fn test_sample_cases_fallback_extraction_all_10() {
        let file_content =
            std::fs::read_to_string("../data/BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json")
                .or_else(|_| {
                    std::fs::read_to_string("data/BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json")
                })
                .expect("Sample cases file should be present");

        let json_val: serde_json::Value = serde_json::from_str(&file_content).unwrap();
        let cases = json_val["cases"].as_array().unwrap();

        for case in cases {
            let id = case["id"].as_str().unwrap();
            let notes = case["input"]["operator_notes"].as_array().unwrap();
            let capacity = case["input"]["battery"]["capacity_kwh"].as_f64().unwrap();
            let exp_dirs = case["expected_output"]["directive_interpretation"]
                .as_array()
                .unwrap();

            for (idx, (note_val, exp_val)) in notes.iter().zip(exp_dirs.iter()).enumerate() {
                let note_str = note_val.as_str().unwrap();
                let extracted = fallback_extract_directive(note_str, idx, capacity);

                let exp_type = exp_val["directive_type"].as_str().unwrap();
                let exp_applies = exp_val["applies"].as_bool().unwrap();

                assert_eq!(
                    extracted.directive_type, exp_type,
                    "{} Note {}: type mismatch got {}, exp {}",
                    id, idx, extracted.directive_type, exp_type
                );
                assert_eq!(
                    extracted.applies, exp_applies,
                    "{} Note {}: applies mismatch",
                    id, idx
                );

                if let Some(exp_adj) = exp_val
                    .get("structured_adjustment")
                    .filter(|v| !v.is_null())
                {
                    let act_adj = extracted
                        .structured_adjustment
                        .expect("Expected adjustment");
                    if let Some(exp_hours) = exp_adj.get("hours").and_then(|h| h.as_array()) {
                        let exp_h: Vec<u8> = exp_hours
                            .iter()
                            .map(|v| v.as_u64().unwrap() as u8)
                            .collect();
                        assert_eq!(
                            act_adj.hours,
                            Some(exp_h),
                            "{} Note {}: hours mismatch",
                            id,
                            idx
                        );
                    }
                    if let Some(exp_f) = exp_adj.get("factor").and_then(|f| f.as_f64()) {
                        let act_f = act_adj.factor.expect("Expected factor");
                        assert!(
                            (act_f - exp_f).abs() < 1e-4,
                            "{} Note {}: factor mismatch got {}, exp {}",
                            id,
                            idx,
                            act_f,
                            exp_f
                        );
                    }
                    if let Some(exp_r) = exp_adj.get("minimum_energy_kwh").and_then(|r| r.as_f64())
                    {
                        let act_r = act_adj.minimum_energy_kwh.expect("Expected reserve");
                        assert!(
                            (act_r - exp_r).abs() < 1e-4,
                            "{} Note {}: reserve mismatch got {}, exp {}",
                            id,
                            idx,
                            act_r,
                            exp_r
                        );
                    }
                    if let Some(exp_g) = exp_adj.get("max_grid_kwh").and_then(|g| g.as_f64()) {
                        let act_g = act_adj.max_grid_kwh.expect("Expected max grid");
                        assert!(
                            (act_g - exp_g).abs() < 1e-4,
                            "{} Note {}: max grid mismatch got {}, exp {}",
                            id,
                            idx,
                            act_g,
                            exp_g
                        );
                    }
                }
            }
        }
    }
}
