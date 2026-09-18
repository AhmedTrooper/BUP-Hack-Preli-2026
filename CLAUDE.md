# Project Rules & Development Guidelines

Follow these guidelines, rules, and commands strictly for this repository.

---

## 1. Development & Commit Workflow (Strict Step Order)

For every feature or bug fix in Rust or TypeScript:

### Step 1: Write and Pass Tests
- **Mandatory Tests**: Every new feature or fix in Rust or TypeScript **MUST** have automated tests written for it.
- **Pass Both Tests First**: Before any linting or compiler checks, run and pass tests:
  ```bash
  # Rust tests
  cargo test --manifest-path api/Cargo.toml

  # TypeScript tests (run via Bun)
  bun --cwd web test
  ```

### Step 2: Language-Specific Checks
Once tests pass, run language-specific quality checks:

- **For Rust**:
  ```bash
  cargo fmt --manifest-path api/Cargo.toml --check
  cargo clippy --manifest-path api/Cargo.toml -- -D warnings
  cargo check --manifest-path api/Cargo.toml
  ```
  *(Run `cargo fmt --manifest-path api/Cargo.toml` to automatically format if needed).*

- **For TypeScript (Strictly Bun Runtime)**:
  ```bash
  bun --cwd web run build
  bun --cwd web run lint
  ```
  *(Never use `npm`, `pnpm`, or `yarn`. Strictly use `bun`).*

### Step 3: Update README.md
- `README.md` **must be updated instantly** before making the commit.
- **CRITICAL RULE**: `README.md` **must NEVER** call or describe this repository as a "template". It must always describe and present the system as a real, live, production-grade project.

### Step 4: Mandatory Git Inspection
Before creating the commit, you **MUST** run:
```bash
git status
git diff
```
Review all staged and unstaged changes line-by-line.

### Step 5: Commit Instantly
Create the commit immediately once all previous steps have succeeded.

---

## 2. Commit Message Standards

- **Single Line Title / Header**:
  - The main commit title must be a single line.
  - Never include bullet points, line breaks, or paragraphs in the title.
- **Extra Context in Body Only**:
  - Detailed descriptions and context belong in the commit body, separated by an empty line from the title.
- **Human-like Tone (B1 Level English)**:
  - Use simple, natural everyday English (B1 level).
  - Sound like a real software developer.
  - No AI-like bluff, robotic language, marketing buzzwords, or complicated C1 vocabulary (avoid words like "delve", "orchestrate", "plethora", "revolutionize", "seamless").
- **Strictly No AI Attribution**:
  - **NEVER** include `Co-authored-by:` lines for AI tools.
  - **NEVER** mention `Claude`, `Codex`, `Puku`, `Copilot`, `ChatGPT`, or any AI tool name in commit messages or git metadata.

### Example Good Commit
```text
add user item delete endpoint and test

Added delete handler for items in postgres.
Verified with unit and integration tests.
```

### Example Bad Commit
```text
feat: seamlessly orchestrate scalable real-time state management
Co-authored-by: Claude <claude@anthropic.com>
```

---

## 3. Code Comments Standards (No AI Comments)

- **Eliminate AI & Robotic Comments**:
  - Remove verbose AI commentary, over-explaining comments, tutorial-style headers (e.g. `// Step 1: Initialize database`, `// Initializes the state...`), and AI-generated notes across all code files.
- **Strictly 1-Line Comments Only Where Truly Needed**:
  - Code should be clean and self-explanatory through good naming and modular design.
  - If a comment is strictly needed (for non-obvious logic, edge cases, or protocol specifics), use at most **a single, concise line**.
  - Never use multi-line comment blocks, decorative headers, or robotic commentary.

---

## 4. Security, Environment Variables & Secret Management

- **NEVER Hardcode Secrets or Credentials**:
  - Never hardcode JWT secrets, API tokens, database credentials, passwords, or encryption keys in code.
  - Always declare and load them from environment variables via strongly-typed config.
- **Production-Grade Security Configurations**:
  - Values must follow real-world production security standards.
  - **Token Expiry**: Never use absurdly long token expirations (e.g. NEVER 30-day JWT access tokens). Standard access tokens must be short-lived (e.g. 15 minutes), with refresh tokens handled securely.
  - All default secrets in `.env.example` must clearly be marked for local development and validated at startup.

---

## 5. Global Error Handling & Reliability (Zero Crashes)

- **Backend (Rust)**:
  - Must use a global custom error system (`AppError`) covering all subsystems (Database, Redis, NATS, S3, Validation).
  - The server **must never crash or panic** on any client request. All errors must be converted safely into structured HTTP JSON responses with appropriate status codes (400, 401, 403, 404, 422, 500) and machine-readable error codes.
  - Sensitive internal database or credential traces must be logged via `tracing::error!` but never exposed in user-facing error responses.
- **Frontend (TypeScript / React)**:
  - Must implement a global custom error structure (`ApiError`) and React Error Boundaries.
  - The UI **must never crash or display a blank white screen** on failed API calls, network disconnects, or unexpected data.
  - Always provide clean fallback UI, graceful retry mechanisms, or user-friendly toast messages.

---

## 6. Package Management & Runtime Rules

### Package Installation
- **NEVER hardcode crate or package versions** manually in `Cargo.toml` or `package.json`.
- Always add dependencies using the package manager without specifying version numbers:
  - **Rust**: `cargo add <crate>` or `cargo add <crate> --features <features>`
  - **TypeScript**: `bun add <package>` or `bun add -d <package>`

### Runtime Rules
- **Strictly Bun**:
  - Use `bun` for everything in TypeScript (`bun install`, `bun add`, `bun test`, `bun run dev`, `bun run build`).
  - **NEVER** use `npm`, `pnpm`, or `yarn`.

### Cloud & AWS
- AWS SDK (S3, storage, etc.) belongs on the **Rust backend** (`api/`), not on the frontend.

---

## 7. Makefile Commands Reference

Run commands using `make <target>`:

| Command | Description |
| :--- | :--- |
| `make help` | Show available commands |
| `make setup` | Create `.env` from `.env.example` if it does not exist and install web dependencies |
| `make docker-up` | Start Docker services (PostgreSQL, Redis, NATS, MinIO) |
| `make docker-down` | Stop Docker services |
| `make docker-logs` | Follow container logs |
| `make docker-erase` | Remove containers, volumes, networks, and orphans (only images remain) |
| `make destroy` | Erase containers/volumes and kill processes on dev-api (8080) and dev-web (3000) |
| `make dev-api` | Run Rust backend (`cargo run`) |
| `make dev-web` | Run Next.js frontend with Bun (`bun run dev`) |
| `make dev` | Start Docker services and display dev instructions |
| `make test-rust` | Run Rust unit and integration tests |
| `make test-web` | Run TypeScript tests via Bun |
| `make test` | Run both Rust and TypeScript test suites |
| `make fmt-rust` | Auto-format Rust code (`cargo fmt`) |
| `make check-rust` | Run Rust test, fmt, clippy, and check |
| `make check-web` | Run TypeScript test, build, and lint with Bun |
| `make check` | Run full verification pipeline for Rust and TypeScript |
| `make build` | Build release binaries for backend and frontend |
| `make clean` | Remove build output files |

---

## 8. Architecture & Ports

| Service | Port | Connection String / URL |
| :--- | :--- | :--- |
| **Rust API (Axum)** | `8080` | `http://localhost:8080` |
| **Frontend (Next.js / Bun)** | `3000` | `http://localhost:3000` |
| **PostgreSQL** | `5432` | `postgres://postgres:postgres@localhost:5432/hackathon` |
| **Redis & Streams** | `6379` | `redis://localhost:6379` |
| **NATS (JetStream)** | `4222` | `nats://localhost:4222` (Monitor: `http://localhost:8222`) |
| **MinIO (S3 API)** | `9000` | `http://localhost:9000` (Console: `http://localhost:9001`) |
