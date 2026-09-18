```markdown
# BUP CSE FEST 2026 Hackathon — GridWise LLM Challenge Master Specification

## 1. Challenge Overview & System Goal
* **Event:** BUP CSE FEST 2026 Hackathon (In association with Poridhi)[cite: 1, 3].
* **Round:** Online Preliminary Round (4 hours: 7:00 PM – 11:00 PM)[cite: 1, 3].
* **Task:** Build a deployed public HTTP API service that optimizes campus electricity purchase for a 24-hour horizon[cite: 1, 3]. It purchases electricity from the grid, utilizes rooftop solar generation, and schedules battery energy storage system (BESS) charge/discharge while interpreting natural-language operator directives[cite: 3].
* **Core Processing Flow:**
  1. Receive energy scenario (24 hours demand, solar forecast, hourly grid tariff, battery parameters) and 1–3 operator notes[cite: 3].
  2. Parse/interpret operator notes using a mandatory language model (LLM) into fixed machine-checkable structured directives[cite: 1, 3].
  3. Validate LLM interpretations using deterministic guardrails[cite: 1, 3].
  4. Pass validated directives to a mathematical optimization solver[cite: 1, 3].
  5. Compute a cost-optimal 24-hour schedule satisfying physical and operational constraints[cite: 3].
  6. Replay and verify the schedule[cite: 1, 3].
  7. Return structured JSON with directive interpretations, 24-hour schedule, and summary totals[cite: 3].

---

## 2. API Endpoints & Protocols
The service must expose exactly two endpoints over HTTP[cite: 1, 3]. Base URL must be public with no authentication, no VPN, and no manual approvals[cite: 1].

### 2.1 `GET /health`
* **Purpose:** Readiness endpoint used by judging harness prior to running tests[cite: 1, 3].
* **Status Code:** `200 OK`[cite: 3].
* **Response Body:**
```json
{
  "status": "ok"
}

```

* **Readiness Requirement:** Must return within 60 seconds of service startup.



### 2.2 `POST /optimize-energy`

* **Purpose:** Optimization and LLM interpretation engine.


* **Status Codes:**
* `200 OK`: Valid scenario processed and solved.


* `400 Bad Request`: Malformed JSON or structurally invalid request.


* `422 Unprocessable Entity`: Semantically invalid but well-formed request.


* `500 Internal Server Error`: Controlled internal error without secret leakage or stack traces.




* **Timeout & Latency Requirements:**
* Per-request hard timeout: 30 seconds.


* Latency scoring: p95 $\le$ 5s (3/3 pts), 5s–15s (2/3 pts), 15s–30s (1/3 pts), >30s (0/3 pts and counted as failure).





---

## 3. Data Contracts & Schemas

### 3.1 Request Schema (`POST /optimize-energy`)

Top-level JSON Object:

* `scenario_id` (string, required): Unique synthetic identifier.


* `operator_notes` (array of strings, required): 1 to 3 non-empty natural language strings.


* `hours` (array of 24 objects, required): Exactly 24 entries for hours 0 through 23.


* `hour` (integer, required): 0 to 23.


* `demand_kwh` (number, required): Campus energy demand to satisfy.


* `solar_kwh` (number, required): Forecasted base solar generation.


* `tariff_bdt_per_kwh` (number, required): Grid electricity purchase price.




* `battery` (object, required): Battery operational limits:


* `capacity_kwh` (number, required): Maximum battery energy capacity.


* `initial_energy_kwh` (number, required): Starting state of charge at hour 0.


* `minimum_energy_kwh` (number, required): Base reserve energy floor.


* `max_charge_kwh_per_hour` (number, required): Maximum charge rate.


* `max_discharge_kwh_per_hour` (number, required): Maximum discharge rate.





### 3.2 Response Schema (`POST /optimize-energy`)

Top-level JSON Object:

* `scenario_id` (string): Must match request `scenario_id`.


* `directive_interpretation` (array of objects): Exactly one object per note in `operator_notes`, ordered by `note_index` (0 to $N-1$).


* `hourly_plan` (array of 24 objects): Exactly 24 entries (hours 0 to 23).


* `total_grid_kwh` (number): Recalculated sum of `grid_kwh` across all 24 hours.


* `total_cost_bdt` (number): Recalculated sum of `(grid_kwh * tariff_bdt_per_kwh)` across all 24 hours.


* `peak_grid_kwh` (number): Maximum single-hour `grid_kwh` in `hourly_plan`.


* `plan_summary` (string): Human-readable strategy description.



#### 3.2.1 `directive_interpretation` Element

* `note_index` (integer): 0-indexed reference to input note.


* `applies` (boolean): `true` if directive modifies operations; `false` only if `directive_type` is `no_op`.


* `directive_type` (string): Enum from Section 4.


* `structured_adjustment` (object or null): Adjustment parameters or `null` for `no_op`.


* `explanation` (string): Brief rationale of interpretation.



#### 3.2.2 `hourly_plan` Element

* `hour` (integer): 0 to 23.


* `grid_kwh` (number): Grid energy consumed $\ge 0$.


* `solar_used_kwh` (number): Solar consumed $\ge 0$, $\le \text{effective\_solar}$.


* `battery_action` (string): Exactly one of `"charge"`, `"discharge"`, `"idle"`.


* `battery_kwh` (number): Energy transferred $\ge 0$. Must be 0 when `idle`.


* `battery_energy_after_kwh` (number): Ending energy state at completion of hour.



---

## 4. Supported Directives & Extraction Semantics

Only the following 6 directive types are recognized:

| `directive_type` | `applies` | `structured_adjustment` Schema | Semantic Interpretation Rules |
| --- | --- | --- | --- |
| `solar_reduction`<br> | `true`<br> | `{"hours": [int...], "factor": float}`<br> | `factor` is the **usable fraction remaining** ($0 \le \text{factor} \le 1$). An 80% reduction means `factor = 0.2`. "Drop to 25%" means `factor = 0.25`.

 |
| `minimum_battery_reserve`<br> | `true`<br> | `{"hours": [int...], "minimum_energy_kwh": float}`<br> | If stated in percent (e.g. "at least 50%"), compute as `percentage * capacity_kwh`. Reserve must be $\ge 0$ and $\le \text{capacity\_kwh}$.

 |
| `no_charge_window`<br> | `true`<br> | `{"hours": [int...]}`<br> | Forbids battery charging in specified hours (`battery_action` cannot be `charge`, `battery_kwh = 0`).

 |
| `no_discharge_window`<br> | `true`<br> | `{"hours": [int...]}`<br> | Forbids battery discharging in specified hours (`battery_action` cannot be `discharge`, `battery_kwh = 0`).

 |
| `max_grid_window`<br> | `true`<br> | `{"hours": [int...], "max_grid_kwh": float}`<br> | Caps grid import such that $\text{grid\_kwh} \le \text{max\_grid\_kwh}$ for each specified hour.

 |
| `no_op`<br> | `false`<br> | `null`<br> | Used for irrelevant or distractor notes (e.g., cafeteria changes, library notices, sports updates).

 |

### Time & Value Normalization Rules

* **Hour Window Standard:** Whole-hour intervals, start-inclusive and end-exclusive ($[\text{start}, \text{end})$).


* "Noon until 2 PM" $\rightarrow [12, 13]$.


* "2 AM until 5 AM" $\rightarrow [2, 3, 4]$.


* "6 PM until 9 PM" $\rightarrow [18, 19, 20]$.


* "6 PM until 10 PM" $\rightarrow [18, 19, 20, 21]$.


* "11 AM until 1 PM" $\rightarrow [11, 12]$.




* **Hours Sorting:** `hours` array inside `structured_adjustment` must contain unique integers sorted in ascending order from 0 to 23.



---

## 5. Mathematical Optimization & Physical Rules

### 5.1 Objective Function

Minimize total purchased electricity cost:


$$\min \sum_{h=0}^{23} \text{grid\_kwh}[h] \times \text{tariff\_bdt\_per\_kwh}[h]$$

### 5.2 Constraints

1. **Hourly Energy Balance:**

$$\text{grid\_kwh}[h] + \text{solar\_used\_kwh}[h] + \text{discharge\_kwh}[h] = \text{demand\_kwh}[h] + \text{charge\_kwh}[h] \quad \forall h \in [0, 23]$$



2. **Solar Utilization & Curtailment:**
* $\text{effective\_solar}[h] = \text{solar\_kwh}[h] \times \text{factor}$ if `solar_reduction` active on hour $h$; else $\text{solar\_kwh}[h]$.


* $0 \le \text{solar\_used\_kwh}[h] \le \text{effective\_solar}[h]$.


* Grid solar export is disallowed.




3. **Battery Transition Dynamics:**
* If `charge`: $\text{battery\_energy\_after\_kwh}[h] = \text{battery\_energy\_after\_kwh}[h-1] + \text{battery\_kwh}[h]$.


* If `discharge`: $\text{battery\_energy\_after\_kwh}[h] = \text{battery\_energy\_after\_kwh}[h-1] - \text{battery\_kwh}[h]$.


* If `idle`: $\text{battery\_energy\_after\_kwh}[h] = \text{battery\_energy\_after\_kwh}[h-1]$ and $\text{battery\_kwh}[h] = 0$.


* Initial boundary: $\text{battery\_energy\_after\_kwh}[-1] = \text{initial\_energy\_kwh}$.




4. **Battery Energy Bounds:**

$$\max(\text{minimum\_energy\_kwh}, \text{directive\_min\_reserve}[h]) \le \text{battery\_energy\_after\_kwh}[h] \le \text{capacity\_kwh} \quad \forall h$$



5. **Battery Hourly Transfer Limits:**
* $0 \le \text{charge\_kwh}[h] \le \text{max\_charge\_kwh\_per\_hour}$.


* $0 \le \text{discharge\_kwh}[h] \le \text{max\_discharge\_kwh\_per\_hour}$.


* If $h \in \text{no\_charge\_window}$: $\text{charge\_kwh}[h] = 0$.


* If $h \in \text{no\_discharge\_window}$: $\text{discharge\_kwh}[h] = 0$.




6. **Grid Import Limit:**
* $0 \le \text{grid\_kwh}[h] \le \text{max\_grid\_kwh}$ for hours where `max_grid_window` is active.




7. **End-of-Day Neutrality:**

$$\text{battery\_energy\_after\_kwh}[23] = \text{initial\_energy\_kwh}$$




(Prevents treating stored initial energy as a one-time free source).



---

## 6. Deterministic Guardrails & Error Handling

Treat LLM outputs as untrusted raw JSON:

1. Validate enum values against known types (`solar_reduction`, `minimum_battery_reserve`, `no_charge_window`, `no_discharge_window`, `max_grid_window`, `no_op`).


2. Enforce `applies = false` and `structured_adjustment = null` if and only if `directive_type = no_op`.


3. For all other directive types, enforce `applies = true` and validate presence of non-null adjustments.


4. Sort and deduplicate all `hours` lists; drop/reject out-of-range hours ($< 0$ or $> 23$).


5. Clamp/verify `factor` $\in [0.0, 1.0]$.


6. Validate `minimum_energy_kwh` $\le \text{capacity\_kwh}$.


7. Fallback mechanism: If LLM produces invalid/unparseable JSON, return controlled safe errors or default to `no_op` rather than inventing constraints or crashing.


8. Consistency check: Prior to emitting output, independently recalculate `total_grid_kwh`, `total_cost_bdt`, and `peak_grid_kwh` directly from the generated `hourly_plan`.



---

## 7. Numerical Tolerance

All floating-point comparison calculations by judges allow an absolute tolerance of **0.01 kWh** and **0.01 BDT**.

---

## 8. Evaluation & Scoring Rubric (100 Base Points)

| Category | Points | Rubric Criteria |
| --- | --- | --- |
| **1. LLM Directive Interpretation**<br> | 25

 | $5\text{ pts}$ relevance/no_op detection + $5\text{ pts}$ directive_type classification + $5\text{ pts}$ affected hours extraction + $5\text{ pts}$ numeric values and adjustment shape + $5\text{ pts}$ paraphrase robustness across hidden notes.

 |
| **2. Directive Application & Constraints**<br> | 25

 | $10\text{ pts}$ ground-truth directive enforcement + $5\text{ pts}$ hourly energy balance & solar limits + $5\text{ pts}$ battery dynamics, bounds, and transfer limits + $5\text{ pts}$ action consistency, neutrality, and non-negativity.

 |
| **3. Optimization Quality**<br> | 10

 | $\text{Score} = 10 \times \text{average}(\min(1, \frac{\text{cost}_{\text{organizer\_optimal}}}{\text{cost}_{\text{team\_recalculated}}}))$ across all hidden cases. Invalid plans receive 0 credit.

 |
| **4. API Contract & Schema**<br> | 10

 | $2\text{ pts}$ endpoint names & status codes + $2\text{ pts}$ input schema validation + $3\text{ pts}$ `directive_interpretation` structure + $3\text{ pts}$ `hourly_plan` structure and scenario echo.

 |
| **5. Performance & Reliability**<br> | 10

 | $2\text{ pts}$ readiness on `/health` within 60s + $3\text{ pts}$ p95 latency + $3\text{ pts}$ failure rate / uptime + $2\text{ pts}$ controlled failure handling and secret safety.

 |
| **6. Deployment & Docker Fallback**<br> | 10

 | $3\text{ pts}$ live endpoint accessibility + $4\text{ pts}$ pullable and runnable Docker image reaching `/health` + $2\text{ pts}$ clean startup without intervention + $1\text{ pt}$ zero judge debugging needed.

 |
| **7. Documentation & Reproducibility**<br> | 10

 | $3\text{ pts}$ clean local quickstart + $2\text{ pts}$ environment/model docs + $2\text{ pts}$ sample test instructions + $1\text{ pt}$ architecture documentation + $1\text{ pt}$ Docker instructions + $1\text{ pt}$ dependency and limitation disclosures.

 |

*Note on 3-minute Video:* Carries **0 base points**. It serves strictly as the Priority 1 tie-breaker if total base scores are tied.

---

## 9. Disqualification & Critical Penalties

1. **Missing LLM in Interpretation Path:** If an LLM is not used to extract directives (or is used only for cosmetic summaries), the submission fails mandatory rules and is disqualified from the shortlist.


2. **Hard-coded Phrase Matching:** Hard-coding text strings or regex bypasses disqualifies the team; paraphrase robustness is evaluated across unseen prompts.


3. **Invalid Constraint Penalties:** Breaking energy balance, exceeding battery transfer rates, violating directive reserve/grid caps, or failing end-of-day battery neutrality zeroes all optimization credit for that test scenario.


4. **Secret Leaks:** API keys, tokens, or environment files committed to git or printed in logs/responses incur severe penalties.



---

## 10. Public Reference Test Cases Summary

* **SAMPLE-01 ("Solar cleaning + distractor"):**

* Notes: Washing rooftop panels noon–2 PM (25% usable solar); Sports office moved deadline.


* Adjustments: Note 0 $\rightarrow$ `solar_reduction`, `hours: [12, 13]`, `factor: 0.25`. Note 1 $\rightarrow$ `no_op`.




* **SAMPLE-02 ("Battery charging maintenance"):**

* Notes: Battery charger isolated 2 AM–5 AM.


* Adjustments: Note 0 $\rightarrow$ `no_charge_window`, `hours: [2, 3, 4]`.




* **SAMPLE-03 ("Emergency reserve as percentage"):**

* Notes: Keep at least 50% capacity stored from 6 PM–9 PM (capacity = 200 kWh).


* Adjustments: Note 0 $\rightarrow$ `minimum_battery_reserve`, `hours: [18, 19, 20]`, `minimum_energy_kwh: 100.0`.




* **SAMPLE-04 ("No-discharge protection test"):**

* Notes: Must not discharge battery 6 PM–8 PM.


* Adjustments: Note 0 $\rightarrow$ `no_discharge_window`, `hours: [18, 19]`.




* **SAMPLE-05 ("Temporary feeder grid cap"):**

* Notes: Campus grid import must not exceed 155 kWh from 6 PM–9 PM.


* Adjustments: Note 0 $\rightarrow$ `max_grid_window`, `hours: [18, 19, 20]`, `max_grid_kwh: 155.0`.




* **SAMPLE-06 ("Multiple notes with distractor"):**

* Notes: Half solar 10 AM–noon; Charging circuit unavailable 2 PM–4 PM; Library book-return hours next week.


* Adjustments: Note 0 $\rightarrow$ `solar_reduction`, `hours: [10, 11]`, `factor: 0.5`. Note 1 $\rightarrow$ `no_charge_window`, `hours: [14, 15]`. Note 2 $\rightarrow$ `no_op`.




* **SAMPLE-07 ("Reserve plus transformer cap"):**

* Notes: Keep $\ge 90$ kWh 6 PM–10 PM; Evening transformer limit 180 kWh grid import 7 PM–9 PM.


* Adjustments: Note 0 $\rightarrow$ `minimum_battery_reserve`, `hours: [18, 19, 20, 21]`, `minimum_energy_kwh: 90.0`. Note 1 $\rightarrow$ `max_grid_window`, `hours: [19, 20]`, `max_grid_kwh: 180.0`.




* **SAMPLE-08 ("Separate charge/discharge outages"):**

* Notes: Charging disabled 11 AM–1 PM; Do not discharge 5 PM–7 PM.


* Adjustments: Note 0 $\rightarrow$ `no_charge_window`, `hours: [11, 12]`. Note 1 $\rightarrow$ `no_discharge_window`, `hours: [17, 18]`.




* **SAMPLE-09 ("Reduction wording normalization"):**

* Notes: Expect an 80% reduction in solar between 11 AM and 2 PM; Student affairs notice.


* Adjustments: Note 0 $\rightarrow$ `solar_reduction`, `hours: [11, 12, 13]`, `factor: 0.2`. Note 1 $\rightarrow$ `no_op`.




* **SAMPLE-10 ("Multi-constraint evening operation"):**

* Notes: Data center requires $\ge 80$ kWh in battery 6 PM–10 PM; Grid intake $\le 190$ kWh 7 PM–10 PM; Seminar booking moved.


* Adjustments: Note 0 $\rightarrow$ `minimum_battery_reserve`, `hours: [18, 19, 20, 21]`, `minimum_energy_kwh: 80.0`. Note 1 $\rightarrow$ `max_grid_window`, `hours: [19, 20, 21]`, `max_grid_kwh: 190.0`. Note 2 $\rightarrow$ `no_op`.





---

## 11. Required Submission Artifacts

1. **Public API Base URL:** Servicing `GET /health` and `POST /optimize-energy`.


2. **GitHub Repository:** Created after question reveal, kept private during competition, turned public after deadline.


3. **`README.md`:** Comprehensive instructions for clean local quickstart, environment variables, solver setup, curl commands, and architectural flow.


4. **Pullable Docker Image:** Hosted on Docker Hub / GHCR, binds to port `0.0.0.0`, runs without baked-in secrets, ready on `/health`.


5. **3-minute Architecture Video:** Walkthrough explaining the LLM $\rightarrow$ Guardrails $\rightarrow$ Optimizer pipeline (for tie-break resolution).



```

```
