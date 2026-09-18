.PHONY: help setup docker-up docker-down docker-logs docker-erase destroy dev-api dev-web dev test-rust test-web test fmt-rust check-rust check-web check build clean

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## Prepare environment files and initial config
	@if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example"; else echo ".env already exists"; fi

docker-up: ## Start Docker services (PostgreSQL, Redis, NATS, MinIO)
	docker compose up -d

docker-down: ## Stop Docker services
	docker compose down

docker-logs: ## Follow Docker logs
	docker compose logs -f

docker-erase: ## Remove containers, volumes, networks, and orphans (only images remain)
	docker compose down -v --remove-orphans

destroy: docker-erase ## Erase containers, volumes, and kill dev-api and dev-web port processes
	@echo "Terminating processes on ports 8080 (dev-api) and 3000 (dev-web)..."
	@fuser -k 8080/tcp 2>/dev/null || lsof -ti :8080 | xargs -r kill -9 2>/dev/null || true
	@fuser -k 3000/tcp 2>/dev/null || lsof -ti :3000 | xargs -r kill -9 2>/dev/null || true
	@echo "System destroyed: all containers, volumes, and dev server processes cleared."

dev-api: ## Run Rust backend
	cargo run --manifest-path api/Cargo.toml

dev-web: ## Run Next.js frontend with Bun
	bun run --cwd web dev

dev: docker-up ## Start Docker services and print dev instructions
	@echo "Services started. Run 'make dev-api' in one terminal and 'make dev-web' in another."

test-rust: ## Run Rust tests
	cargo test --manifest-path api/Cargo.toml

test-web: ## Run TypeScript tests via Bun
	bun run --cwd web test

test: test-rust test-web ## Run both Rust and TypeScript tests

fmt-rust: ## Auto-format Rust codebase
	cargo fmt --manifest-path api/Cargo.toml

check-rust: ## Run Rust verification pipeline (test, fmt, clippy, check)
	cargo test --manifest-path api/Cargo.toml
	cargo fmt --manifest-path api/Cargo.toml --check
	cargo clippy --manifest-path api/Cargo.toml -- -D warnings
	cargo check --manifest-path api/Cargo.toml

check-web: ## Run TypeScript verification pipeline (test, build, lint with Bun)
	bun run --cwd web test
	bun run --cwd web build
	bun run --cwd web lint

check: check-rust check-web ## Run all verification checks (Rust and TypeScript)

build: ## Build production artifacts for both API and Web
	cargo build --release --manifest-path api/Cargo.toml
	bun run --cwd web build

clean: ## Clean build artifacts
	cargo clean --manifest-path api/Cargo.toml
	rm -rf web/.next web/dist
