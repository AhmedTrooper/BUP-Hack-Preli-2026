# GridWise EMS - Autonomous Campus Microgrid & Energy Dispatch Platform

GridWise EMS is an autonomous 24-hour energy optimization platform designed for university and industrial campuses. The system minimizes total electricity costs by arbitrating Time-of-Use (ToU) grid tariffs, maximizing rooftop solar self-consumption, and translating natural-language operator shift notes into exact mathematical constraints for a Simplex Linear Programming (LP) solver.

---

## 1. System Overview & Problem Motivation

### The Challenge
University and commercial campuses operate rooftop solar panels and battery energy storage systems (BESS) while connected to the utility grid. Electricity tariffs fluctuate significantly throughout the day under Time-of-Use (ToU) billing—ranging from off-peak rates (e.g. 5–6 BDT/kWh) to peak evening rates (e.g. 26–30 BDT/kWh).

Without automated scheduling:
- High peak tariffs result in expensive electricity bills.
- Rooftop solar generation is curtailed or wasted when demand dips at midday.
- Batteries remain underutilized or fail to store sufficient energy before peak hours.

### The Natural-Language Gap
Daily operational events are recorded by facility staff as informal text notes:
> *"Facilities will wash rooftop solar panels from noon until 2 PM. Usable solar roughly 25%."*  
> *"The battery charger will be isolated from 2 AM until 5 AM for circuit inspection."*  
> *"Campus security requires at least 50% battery reserve stored from 6 PM until 9 PM for the evening convocation."*

Traditional optimization solvers require strict mathematical inequalities and cannot parse human shift logs. Large language models alone cannot guarantee physical conservation laws or exact cost minimization.

### The Solution: Autonomous Cognitive Dispatch
GridWise bridges human operational reality with linear programming precision:
1. It extracts structured constraints from 1 to 3 natural-language shift notes using a multi-provider LLM engine.
2. It validates and normalizes all extracted directives through deterministic guardrails.
3. It solves an exact continuous Linear Program over the 24-hour horizon in pure Rust in under **50 milliseconds**.
4. It replays and verifies all physical invariants within 0.02 kWh tolerance before returning the dispatch plan.

---

## 2. System Architecture & 4-Stage Pipeline

```text
[ Natural-Language Operator Notes ] (1 to 3 shift logs, informal wording, distractors)
                 │
                 ▼
[ Stage 1: Multi-Provider LLM Cognitive Engine ]
  • Rig-Core abstraction supporting DeepSeek, Claude, Gemini, Groq, and OpenAI
  • Automatic provider & model inference from environment API keys
  • Strict JSON Schema output with temperature = 0.0
  • 2-attempt retry with 500ms exponential backoff
                 │
                 ▼
[ Stage 2: Deterministic Guardrails & Normalizer ]
  • Hour validation: bounds and deduplicates hours into [0..23]
  • Factor clamping: ensures solar reduction factor is in [0.0..1.0]
  • Reserve bounding: converts percentages to kWh and clamps to battery capacity
  • Invalidation: downgrades empty or unparseable directives to safe no_op
  • Zero-downtime fallback: deterministic regex parser for offline/no-key operation
                 │
                 ▼
[ Stage 3: Simplex LP Optimization Engine ]
  • Pure Rust solver using minilp
  • Continuous linear formulation over 24 time steps (h = 0..23)
  • Exact cost objective: min ∑ (grid_kwh[h] × tariff_bdt_per_kwh[h])
  • Solves in <50ms with zero numerical drift
                 │
                 ▼
[ Stage 4: Invariant Replay & Audit ]
  • Verifies hourly energy balance, battery continuity, inverter ratings, and neutrality
  • Returns comprehensive dispatch schedule with executive KPI metrics
```

---

## 3. Mathematical LP Formulation

The optimization engine solves an exact continuous Linear Program over a 24-hour discrete horizon ($h \in \{0, 1, \dots, 23\}$):

### Objective Function
Minimize total electricity purchase cost from the utility grid:

$$\min \sum_{h=0}^{23} \text{grid\_kwh}[h] \times \text{tariff\_bdt\_per\_kwh}[h]$$

### Physical Invariants & Constraints

1. **Hourly Energy Balance**:
   For every hour $h \in \{0, \dots, 23\}$, total energy supplied must equal total energy consumed:
   $$\text{grid\_kwh}[h] + \text{solar\_used\_kwh}[h] + \text{discharge\_kwh}[h] = \text{demand\_kwh}[h] + \text{charge\_kwh}[h]$$

2. **Solar Utilization & Curtailment**:
   Solar consumption cannot exceed the effective solar generation after applying operational reductions. Grid export of solar energy is prohibited:
   $$0 \le \text{solar\_used\_kwh}[h] \le \text{effective\_solar}[h]$$
   where $\text{effective\_solar}[h] = \text{solar\_kwh}[h] \times \text{factor}[h]$.

3. **Battery Storage Transition Dynamics**:
   The battery state of charge (SoC) updates continuously each hour:
   $$E[h] = E[h-1] + \text{charge\_kwh}[h] - \text{discharge\_kwh}[h]$$
   with boundary condition $E[-1] = \text{initial\_energy\_kwh}$.

4. **Storage Bounds & Reserve Floor**:
   The stored energy at each hour must remain within allowable limits:
   $$\max(\text{minimum\_energy\_kwh}, \text{directive\_reserve}[h]) \le E[h] \le \text{capacity\_kwh}$$

5. **Hourly Inverter Transfer Limits**:
   Battery charging and discharging are bounded by inverter throughput ratings:
   $$0 \le \text{charge\_kwh}[h] \le \text{max\_charge\_kwh\_per\_hour}$$
   $$0 \le \text{discharge\_kwh}[h] \le \text{max\_discharge\_kwh\_per\_hour}$$

6. **Mutual Exclusivity**:
   A battery cannot charge and discharge simultaneously in the same hour. This is naturally enforced by the positive cost of grid electricity and solar availability.

7. **Grid Import Ceiling**:
   When substation maintenance or transformer limits are active:
   $$\text{grid\_kwh}[h] \le \text{max\_grid\_kwh}[h]$$

8. **End-of-Day Neutrality**:
   The final energy stored at the end of the dispatch period must equal the initial stored energy:
   $$E[23] = \text{initial\_energy\_kwh}$$
   This guarantees that the optimization does not deplete the battery without replenishing it for the following day.

---

## 4. Supported Directives Taxonomy

The cognitive pipeline standardizes all operator shift notes into six machine-verifiable directive types:

| Directive Type | Applies | Structured Adjustment Fields | Description & Operational Semantics |
| :--- | :--- | :--- | :--- |
| `solar_reduction` | `true` | `hours: int[]`<br>`factor: float` | Models panel cleaning, dust storms, shading, or inverter outages. `factor` represents the **usable fraction remaining** ($0.0 \le \text{factor} \le 1.0$). An 80% reduction sets `factor = 0.20`. "Solar drops to 25%" sets `factor = 0.25`. |
| `minimum_battery_reserve` | `true` | `hours: int[]`<br>`minimum_energy_kwh: float` | Enforces an elevated battery reserve floor during critical periods (e.g. VIP visits, convocation, storm warnings). Percentage inputs are converted as $\text{percentage} \times \text{capacity\_kwh}$. |
| `no_charge_window` | `true` | `hours: int[]` | Prohibits battery charging during specified hours ($\text{battery\_action} \ne \text{"charge"}$, $\text{charge\_kwh} = 0$). Used for charger circuit inspection or thermal cooldown. |
| `no_discharge_window` | `true` | `hours: int[]` | Prohibits battery discharging during specified hours ($\text{battery\_action} \ne \text{"discharge"}$, $\text{discharge\_kwh} = 0$). Used during protection relay testing or maintenance. |
| `max_grid_window` | `true` | `hours: int[]`<br>`max_grid_kwh: float` | Limits campus grid electricity intake ($\text{grid\_kwh}[h] \le \text{max\_grid\_kwh}$) to protect local transformers or adhere to utility demand response requests. |
| `no_op` | `false` | `null` | Applied to irrelevant notices, administrative reminders, or non-actionable announcements (e.g. sports registration, visitor parking rules, cafeteria hours). |

---

## 5. REST API Reference

The backend exposes a high-performance REST API powered by Axum 0.8 and Tokio.

### Endpoint Matrix

| Method | Path | Description | Expected Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Readiness & health probe | `200 OK` |
| `POST` | `/optimize-energy` | 24-hour campus microgrid optimization | `200 OK`, `400 Bad Request`, `422 Unprocessable Entity` |

---

### `GET /health`
Returns service availability status.

**Response (`200 OK`)**:
```json
{
  "status": "ok"
}
```

---

### `POST /optimize-energy`
Takes a 24-hour campus profile, battery parameters, and 1 to 3 operator notes, returning an hourly dispatch schedule.

#### Request Headers
```text
Content-Type: application/json
```

#### Request Schema
```json
{
  "scenario_id": "string (e.g. SAMPLE-01)",
  "operator_notes": ["string (1 to 3 shift logs)"],
  "hours": [
    {
      "hour": "int (0 to 23)",
      "demand_kwh": "float (> 0)",
      "solar_kwh": "float (>= 0)",
      "tariff_bdt_per_kwh": "float (> 0)"
    }
  ],
  "battery": {
    "capacity_kwh": "float (> 0)",
    "initial_energy_kwh": "float (>= 0)",
    "minimum_energy_kwh": "float (>= 0)",
    "max_charge_kwh_per_hour": "float (> 0)",
    "max_discharge_kwh_per_hour": "float (> 0)"
  }
}
```

#### HTTP Response Status Codes
- `200 OK`: Optimization completed successfully; returns optimal hourly plan.
- `400 Bad Request`: Payload validation failed (e.g. missing fields, `hours` array length $\ne 24$, `operator_notes` array empty or $> 3$, duplicate hours).
- `422 Unprocessable Entity`: Physical or mathematical infeasibility (e.g. `initial_energy_kwh > capacity_kwh`, `minimum_energy_kwh > capacity_kwh`).
- `500 Internal Server Error`: Unhandled server exception.

#### Example cURL Command
```bash
curl -X POST http://localhost:8080/optimize-energy \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_id": "SAMPLE-01",
    "operator_notes": [
      "Facilities will wash the rooftop solar panels from noon until 2 PM. During cleaning, usable solar should be treated as roughly 25% of the forecast.",
      "The sports office moved next months registration deadline."
    ],
    "hours": [
      {"hour": 0, "demand_kwh": 90.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 6.0},
      {"hour": 1, "demand_kwh": 85.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 6.0},
      {"hour": 2, "demand_kwh": 80.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 5.0},
      {"hour": 3, "demand_kwh": 80.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 5.0},
      {"hour": 4, "demand_kwh": 85.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 5.0},
      {"hour": 5, "demand_kwh": 95.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 6.0},
      {"hour": 6, "demand_kwh": 110.0, "solar_kwh": 5.0, "tariff_bdt_per_kwh": 8.0},
      {"hour": 7, "demand_kwh": 130.0, "solar_kwh": 20.0, "tariff_bdt_per_kwh": 10.0},
      {"hour": 8, "demand_kwh": 150.0, "solar_kwh": 50.0, "tariff_bdt_per_kwh": 12.0},
      {"hour": 9, "demand_kwh": 165.0, "solar_kwh": 90.0, "tariff_bdt_per_kwh": 14.0},
      {"hour": 10, "demand_kwh": 175.0, "solar_kwh": 130.0, "tariff_bdt_per_kwh": 16.0},
      {"hour": 11, "demand_kwh": 180.0, "solar_kwh": 160.0, "tariff_bdt_per_kwh": 16.0},
      {"hour": 12, "demand_kwh": 185.0, "solar_kwh": 180.0, "tariff_bdt_per_kwh": 15.0},
      {"hour": 13, "demand_kwh": 180.0, "solar_kwh": 170.0, "tariff_bdt_per_kwh": 14.0},
      {"hour": 14, "demand_kwh": 170.0, "solar_kwh": 140.0, "tariff_bdt_per_kwh": 13.0},
      {"hour": 15, "demand_kwh": 165.0, "solar_kwh": 90.0, "tariff_bdt_per_kwh": 14.0},
      {"hour": 16, "demand_kwh": 170.0, "solar_kwh": 45.0, "tariff_bdt_per_kwh": 18.0},
      {"hour": 17, "demand_kwh": 185.0, "solar_kwh": 10.0, "tariff_bdt_per_kwh": 22.0},
      {"hour": 18, "demand_kwh": 205.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 28.0},
      {"hour": 19, "demand_kwh": 215.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 30.0},
      {"hour": 20, "demand_kwh": 205.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 26.0},
      {"hour": 21, "demand_kwh": 175.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 18.0},
      {"hour": 22, "demand_kwh": 135.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 10.0},
      {"hour": 23, "demand_kwh": 105.0, "solar_kwh": 0.0, "tariff_bdt_per_kwh": 7.0}
    ],
    "battery": {
      "capacity_kwh": 220.0,
      "initial_energy_kwh": 110.0,
      "minimum_energy_kwh": 40.0,
      "max_charge_kwh_per_hour": 50.0,
      "max_discharge_kwh_per_hour": 50.0
    }
  }'
```

#### Response Body (`200 OK`)
```json
{
  "scenario_id": "SAMPLE-01",
  "total_cost_bdt": 36155.0,
  "total_grid_kwh": 2420.0,
  "peak_grid_kwh": 175.0,
  "plan_summary": "Charge during low-tariff hours 02:00-04:00 (5 BDT/kWh). Discharge during peak-tariff hours 18:00-20:00 (26-30 BDT/kWh) while respecting panel wash reduction between 12:00-14:00.",
  "hourly_plan": [
    {
      "hour": 0,
      "grid_kwh": 90.0,
      "solar_used_kwh": 0.0,
      "battery_action": "idle",
      "battery_kwh": 0.0,
      "battery_energy_after_kwh": 110.0
    },
    {
      "hour": 2,
      "grid_kwh": 130.0,
      "solar_used_kwh": 0.0,
      "battery_action": "charge",
      "battery_kwh": 50.0,
      "battery_energy_after_kwh": 160.0
    },
    {
      "hour": 19,
      "grid_kwh": 165.0,
      "solar_used_kwh": 0.0,
      "battery_action": "discharge",
      "battery_kwh": 50.0,
      "battery_energy_after_kwh": 110.0
    }
  ],
  "directive_interpretation": [
    {
      "note_index": 0,
      "directive_type": "solar_reduction",
      "applies": true,
      "explanation": "Panel washing restricts solar output to 25% across hours 12, 13, and 14.",
      "structured_adjustment": {
        "hours": [12, 13, 14],
        "factor": 0.25
      }
    },
    {
      "note_index": 1,
      "directive_type": "no_op",
      "applies": false,
      "explanation": "Sports office announcement does not affect microgrid operations.",
      "structured_adjustment": null
    }
  ]
}
```

---

## 6. Frontend Dashboard & Features

The user interface is built with Next.js 16 (App Router), React 19, and Tailwind CSS v4, optimized for both desktop and mobile viewports.

### Features
1. **Energy Dispatch Studio**:
   - One-click loading of 5 reference campus scenarios (`SAMPLE-01` through `SAMPLE-05`).
   - Natural-language shift notes editor supporting up to 3 notes with instant validation.
   - Battery specification inspector and parameter editor.
   - One-click cURL generator using the live backend URL and JSON export.

2. **Executive KPI Cards**:
   - Total Grid Electricity Cost with baseline savings percentage.
   - Total Grid Energy Purchased (kWh).
   - Peak Single-Hour Grid Demand (kWh).
   - Rooftop Solar Absorption Percentage (zero grid export).
   - Optimization Engine Latency (<50ms).

3. **Interactive Telemetry Charts**:
   - **Energy Balance Chart**: Stacked visualization of grid import, solar utilization, and battery charge/discharge against campus demand.
   - **Battery SoC Curve**: State of charge trajectory across 24 hours with capacity ceiling, reserve floor, and neutrality target lines.
   - **Tariff Arbitrage Chart**: Correlation between ToU tariff rates and battery discharge timing.
   - Full touch/tap support on mobile devices for instant hourly telemetry readout.

4. **Compliance & Invariant Audit**:
   - Automated post-solve verification displaying green audit badges:
     - Hourly Energy Balance ($\Delta \le 0.02$ kWh)
     - Solar Generation Limits & Zero Grid Export
     - Battery State Transition Dynamics
     - Storage Floor and Ceiling Bounds
     - Hourly Inverter Transfer Throughput Limits
     - End-of-Day Storage Neutrality

5. **24-Hour Dispatch Schedule Matrix**:
   - Complete hourly table with sticky headers, action filters (`All`, `Charge`, `Discharge`, `Idle`), visual SoC progress bars, and horizontal scrolling on mobile.

6. **Judge Inspection Telemetry Badge**:
   - Live display of backend REST and WebSocket connection URLs with one-click clipboard copying and latency monitoring.

7. **Dedicated Documentation Manual**:
   - Accessible via `/docs` route, detailing operational procedures, directive semantics, mathematical equations, and API integration guides.

---

## 7. Environment Variables Reference

### Backend (`api/`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port for the Axum HTTP server |
| `HOST` | `0.0.0.0` | Binding host address (use `0.0.0.0` in container environments) |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/hackathon` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string for caching and streams |
| `NATS_URL` | `nats://localhost:4222` | NATS JetStream messaging connection string |
| `S3_ENDPOINT` | `http://localhost:9000` | S3 / MinIO object storage endpoint |
| `S3_BUCKET` | `hackathon-bucket` | Default S3 bucket name |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key ID |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret access key |
| `LLM_PROVIDER` | *(Auto-detected)* | LLM provider: `deepseek`, `gemini`, `anthropic`, `groq`, `openai` |
| `LLM_MODEL` | *(Auto-detected)* | Model name (e.g. `deepseek-chat`, `gemini-2.0-flash`, `claude-3-5-sonnet`) |
| `LLM_API_KEY` | `""` | Primary API key for the chosen LLM provider |
| `DEEPSEEK_API_KEY`| `""` | Auto-activates `deepseek` provider with model `deepseek-chat` |
| `GEMINI_API_KEY`  | `""` | Auto-activates `gemini` provider with model `gemini-2.0-flash` |
| `ANTHROPIC_API_KEY`| `""`| Auto-activates `anthropic` provider with model `claude-3-5-sonnet` |
| `GROQ_API_KEY`   | `""` | Auto-activates `groq` provider with model `llama-3.3-70b-versatile` |
| `CORS_ALLOWED_ORIGINS` | `*` | Allowed CORS origins (comma-separated or `*` for all) |

#### Automatic LLM Provider Inference
The backend inspects individual provider environment variables. If you set `DEEPSEEK_API_KEY`, the server automatically sets `LLM_PROVIDER=deepseek` and `LLM_MODEL=deepseek-chat` without requiring manual provider configuration.

---

### Frontend (`web/`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Public REST API base URL consumed by the browser |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8080/ws/signal` | Public WebSocket endpoint for real-time signaling |

---

## 8. Quickstart & Local Development

### Prerequisites
- [Rust](https://www.rust-lang.org/) (latest stable)
- [Bun](https://bun.sh/) (version 1.1 or higher)
- [Docker](https://www.docker.com/) & Docker Compose
- GNU Make

### Native Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AhmedTrooper/BUP-Hack-Preli-2026.git
   cd BUP-Hack-Preli-2026
   ```

2. **Initialize configuration**:
   ```bash
   make setup
   ```
   Creates `.env` from `.env.example` and installs frontend dependencies with Bun.

3. **Start infrastructure containers**:
   ```bash
   make docker-up
   ```
   Starts PostgreSQL, Redis, NATS, and MinIO in the background.

4. **Launch backend API server**:
   ```bash
   make dev-api
   ```
   API runs at `http://localhost:8080`. Verify with `curl http://localhost:8080/health`.

5. **Launch frontend dashboard**:
   ```bash
   make dev-web
   ```
   Dashboard runs at `http://localhost:3000`.

---

## 9. Docker & Production Deployment

### Docker Compose
Run the entire platform including the backend and frontend in Docker:
```bash
docker compose up --build -d
```

### Railway Deployment
To deploy on Railway or containerized cloud hosts:
- **Backend Service**:
  - Build context: `./api`
  - Dockerfile: `./api/Dockerfile`
  - Environment variables: Set `PORT=8080`, `HOST=0.0.0.0`, and your chosen LLM key (e.g. `DEEPSEEK_API_KEY`).
  - Health check path: `/health`
- **Frontend Service**:
  - Build context: `./web`
  - Dockerfile: `./web/Dockerfile`
  - Environment variables: Set `NEXT_PUBLIC_API_URL` to your deployed backend domain (e.g. `https://api.yourdomain.com`).

---

## 10. Automated Test Suite & Verification

The codebase includes comprehensive automated tests for both the Rust backend and TypeScript frontend.

### Running Backend Tests (Rust)
```bash
cargo test --manifest-path api/Cargo.toml
```
**40 test cases** verify:
- Simplex linear optimization with real campus scenario data.
- Deterministic guardrails (hour normalization, percentage parsing, factor clamping).
- Fallback keyword extraction for offline/no-key operation.
- HTTP error handling (`400 Bad Request`, `422 Unprocessable Entity`).
- Security (JWT issuance and verification, password hashing).
- Infrastructure clients (Redis, NATS, S3).

### Running Frontend Tests (TypeScript / Bun)
```bash
bun --cwd web test
```
**12 test cases** verify:
- Zod schema validation for all request and response types.
- Strict rejection of invalid array lengths and out-of-range values.
- Centralized `ApiError` conversion and state handling.
- Zustand store state initialization and notification management.

### Full Quality Pipeline
```bash
# Verify Rust formatting, lints, and compilation
make check-rust

# Verify TypeScript tests, build, and linter
make check-web

# Run all checks across backend and frontend
make check
```

---

## 11. Honest Trade-offs & Limitations

1. **Linearized Inverter Efficiency**:
   The Simplex formulation models inverter transfer with 100% round-trip efficiency. Real battery systems have a 5–10% conversion loss. This simplification ensures guaranteed global optimality and sub-50ms solve times.

2. **Hourly Discrete Resolution**:
   Optimization operates in 1-hour time steps. Sub-hourly demand spikes (e.g. 15-minute peaks) are averaged over the hour.

3. **No Grid Export by Design**:
   The model strictly prohibits selling solar or battery energy back to the grid ($\text{solar\_used\_kwh} \le \text{demand} + \text{charge}$), adhering to campus self-consumption rules common in regional microgrids.

---

## 12. Repository Structure

```text
├── Makefile                   # Developer lifecycle targets (dev, test, check, build)
├── docker-compose.yml         # Container services (PostgreSQL, Redis, NATS, MinIO)
├── .env.example               # Reference environment variables
├── CLAUDE.md                  # Development guidelines and quality workflow
├── README.md                  # Authoritative system documentation
├── api/                       # Rust Axum Backend (Vertical Slice Architecture)
│   ├── Cargo.toml             # Dependencies (Axum 0.8, minilp, rig-core, sqlx, tokio)
│   ├── Dockerfile             # Multi-stage production container build
│   └── src/
│       ├── core/              # Config, AppError, AppState, security, telemetry
│       ├── infra/             # PostgreSQL, Redis, NATS, S3, and AI client drivers
│       ├── servers/           # HTTP server and worker runners
│       ├── features/
│       │   ├── health/        # Health check handler (/health)
│       │   ├── energy/        # GridWise EMS: Simplex LP, Guardrails, LLM pipeline
│       │   ├── auth/          # JWT authentication and user management
│       │   ├── ai/            # General AI completion routes
│       │   ├── items/         # PostgreSQL CRUD handlers
│       │   ├── cache/         # Redis cache management
│       │   ├── streams/       # Redis stream workers
│       │   ├── nats_pubsub/   # NATS messaging handlers
│       │   ├── storage/       # S3 presigned URL operations
│       │   └── rtc/           # WebRTC signaling hub
│       ├── lib.rs             # Router assembly and middleware configuration
│       └── main.rs            # Entry point and graceful shutdown orchestration
└── web/                       # Next.js 16 Frontend (Feature-Sliced Design)
    ├── package.json           # Dependencies (Next.js 16, React 19, Tailwind CSS v4)
    ├── Dockerfile             # Production container build with Bun
    ├── app/
    │   ├── layout.tsx         # Root layout with theme provider
    │   ├── page.tsx           # Home page with Energy Dispatch Studio
    │   ├── docs/page.tsx      # Interactive documentation manual
    │   └── globals.css        # Global CSS variables and utility classes
    ├── components/
    │   ├── navigation-bar.tsx # Header navigation with status telemetry
    │   ├── backend-telemetry-badge.tsx # Active endpoint URL viewer
    │   └── error-boundary.tsx # React error boundary component
    ├── features/
    │   └── energy/            # Energy Studio components, charts, and presets
    │       ├── components/    # Studio panel, SVG charts, audit cards
    │       └── data/          # Official scenario presets (SAMPLE-01 to 05)
    ├── lib/                   # Schemas (Zod), Store (Zustand), env, error utilities
    └── test/                  # Automated test suites executed with Bun
```
