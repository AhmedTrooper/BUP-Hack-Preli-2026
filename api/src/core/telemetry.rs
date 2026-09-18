use tracing_subscriber::{EnvFilter, Registry, layer::SubscriberExt, util::SubscriberInitExt};

pub fn init_telemetry(log_level: &str) {
    let env_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(log_level));

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true);

    Registry::default()
        .with(env_filter)
        .with(fmt_layer)
        .try_init()
        .ok();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_init_idempotent() {
        init_telemetry("info");
        init_telemetry("debug");
    }
}
