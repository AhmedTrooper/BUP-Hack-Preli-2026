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

pub fn extract_hours_from_note(note: &str) -> Vec<u8> {
    let normalized = note.replace(['–', '—'], "-");
    let lower = normalized.to_lowercase();

    let delimiters = ["until", "through", "to", "and", "-"];
    let prefix_markers = ["from", "between", "during"];

    for prefix in prefix_markers {
        if let Some(start_idx) = lower.find(prefix) {
            let after_prefix = &lower[start_idx + prefix.len()..];
            for delim in delimiters {
                if let Some(delim_idx) = after_prefix.find(delim) {
                    let first_part = after_prefix[..delim_idx].trim();
                    let second_part_raw = &after_prefix[delim_idx + delim.len()..];
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

                    let mut first_str = first_part.to_string();
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

                    if let (Some(h1), Some(h2)) =
                        (parse_hour_str(&first_str), parse_hour_str(&second_part))
                        && h1 < h2
                    {
                        return (h1..h2).collect();
                    }
                }
            }
        }
    }

    Vec::new()
}

pub fn fallback_extract_directive(
    note: &str,
    note_index: usize,
    capacity_kwh: f64,
) -> DirectiveInterpretation {
    let lower = note.to_lowercase();
    let hours = extract_hours_from_note(note);

    if lower.contains("solar") || lower.contains("panel") {
        let mut factor = 1.0;
        if lower.contains("25%") {
            factor = 0.25;
        } else if lower.contains("80% reduction") {
            factor = 0.20;
        } else if lower.contains("half") {
            factor = 0.50;
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
            || lower.contains("outage"))
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
            || lower.contains("stop"))
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
        || lower.contains("remain"))
        && (lower.contains("at least") || lower.contains("keep") || lower.contains("requires"))
    {
        let mut val = 0.0;
        if let Some(pct_idx) = lower.find('%') {
            let slice = &lower[..pct_idx];
            let digits: String = slice
                .chars()
                .rev()
                .take_while(|c| c.is_ascii_digit())
                .collect();
            let digits: String = digits.chars().rev().collect();
            if let Ok(pct) = digits.parse::<f64>() {
                val = (pct / 100.0) * capacity_kwh;
            }
        } else if let Some(kwh_idx) = lower.find("kwh") {
            let slice = &lower[..kwh_idx].trim_end();
            let digits: String = slice
                .chars()
                .rev()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            let digits: String = digits.chars().rev().collect();
            if let Ok(kwh) = digits.parse::<f64>() {
                val = kwh;
            }
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
        || lower.contains("transformer")
        || lower.contains("substation")
        || lower.contains("feeder"))
        && (lower.contains("not exceed")
            || lower.contains("limit")
            || lower.contains("stay at or below")
            || lower.contains("cap"))
    {
        let mut val = f64::INFINITY;
        if let Some(kwh_idx) = lower.find("kwh") {
            let slice = &lower[..kwh_idx].trim_end();
            let digits: String = slice
                .chars()
                .rev()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            let digits: String = digits.chars().rev().collect();
            if let Ok(kwh) = digits.parse::<f64>() {
                val = kwh;
            }
        }

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
}
