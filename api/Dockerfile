# Build stage
FROM rust:1.85-bookworm AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
# Create dummy source to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs && echo "" > src/lib.rs
RUN cargo build --release || true

# Copy actual source code and rebuild
COPY src ./src
RUN touch src/main.rs src/lib.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 -U appuser
USER appuser
WORKDIR /home/appuser

COPY --from=builder /app/target/release/hackathon /usr/local/bin/hackathon

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["hackathon"]
