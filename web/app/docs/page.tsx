"use client"

import Link from "next/link"
import { NavigationBar } from "@/components/navigation-bar"

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      <NavigationBar />

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-12">
        {/* Hero Section */}
        <section className="space-y-4 border-b pb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span>⚡</span> Enterprise Documentation & Architecture Manual
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            GridWise Energy Management System (EMS)
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
            Autonomous 24-hour campus microgrid optimization platform combining multi-provider Large
            Language Models (LLM) with exact mathematical Simplex Linear Programming (LP).
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              <span>⚡ Open Energy Studio</span>
            </Link>
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Quick-Start Guide ↓
            </a>
            <a
              href="#api-reference"
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              REST API Reference ↓
            </a>
          </div>
        </section>

        {/* 1. Why GridWise EMS Exists */}
        <section id="why-gridwise" className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <span>01</span>
            <span>Platform Overview & Motivation</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Why GridWise EMS is Built
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span>📉</span> The Energy Volatility Problem
              </h3>
              <p>
                Universities and industrial campuses operate rooftop solar arrays and battery storage
                while connected to the utility grid. Electricity tariffs fluctuate wildly by time-of-use
                (ToU)—ranging from <strong>5 BDT/kWh off-peak</strong> to over <strong>30 BDT/kWh during evening peak</strong>.
                Without coordinated storage dispatch, utility bills surge and solar energy is needlessly curtailed.
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <span>🗣️</span> The Natural-Language Barrier
              </h3>
              <p>
                Facility operators, electricians, and security teams write daily shift logs in plain English:
                <em> &quot;Facilities will wash solar panels from noon until 2 PM. During cleaning, solar output is roughly 25%.&quot;</em>
                Traditional optimization solvers require strict mathematical inequalities and cannot parse human text, while conventional LLMs hallucinate numbers and cannot guarantee physical energy conservation.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-xs text-foreground/90 space-y-2">
            <h4 className="font-bold text-primary flex items-center gap-2 text-sm">
              <span>💡</span> The GridWise Solution: Autonomous Cognitive Dispatch
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              GridWise bridges human operational reality with linear programming precision. It ingests natural-language operator logs, parses them into structured linear constraints using LLM cognitive agents, validates all parameters with deterministic guardrails, and executes an exact Simplex LP solver in Rust in under <strong>50 milliseconds</strong>—guaranteeing 100% physical invariant compliance.
            </p>
          </div>
        </section>

        {/* 2. Quick-Start User Guide */}
        <section id="quickstart" className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <span>02</span>
            <span>Operator Guide</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            How to Use the Energy Dispatch Studio
          </h2>
          <p className="text-xs text-muted-foreground">
            Follow this 4-step workflow to generate and verify a cost-optimal 24-hour campus schedule:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Step 1
              </span>
              <h3 className="font-semibold text-foreground text-sm">Select Scenario</h3>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Choose an official reference scenario (`SAMPLE-01`, `SAMPLE-02`, `SAMPLE-03`) or customize the battery capacity and inverter rates.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-2">
              <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Step 2
              </span>
              <h3 className="font-semibold text-foreground text-sm">Enter Shift Notes</h3>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Type 1 to 3 natural-language maintenance notices (e.g. panel cleaning, battery charger isolation, or convocation backup reserves).
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-2">
              <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Step 3
              </span>
              <h3 className="font-semibold text-foreground text-sm">Run Optimization</h3>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Click <strong>&quot;Run 24-Hour Optimization&quot;</strong>. The backend cognitive pipeline parses directives and solves the Simplex LP schedule.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-2">
              <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Step 4
              </span>
              <h3 className="font-semibold text-foreground text-sm">Inspect & Export</h3>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Analyze interactive SVG energy charts, review the Invariant Compliance Audit, and export the official JSON dispatch schedule.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Directive Taxonomy */}
        <section id="directives" className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <span>03</span>
            <span>Directive Extraction Standards</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Supported Operational Directive Types
          </h2>
          <p className="text-xs text-muted-foreground">
            The cognitive pipeline standardizes all operator logs into exactly six machine-verifiable directive types:
          </p>

          <div className="overflow-x-auto rounded-xl border bg-card text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted text-[11px] text-muted-foreground uppercase border-b">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Directive Type</th>
                  <th className="py-2.5 px-4 font-semibold">Applies</th>
                  <th className="py-2.5 px-4 font-semibold">Structured Parameters</th>
                  <th className="py-2.5 px-4 font-semibold">Operational Semantic Rules</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-[11px]">
                <tr className="hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-bold text-primary">solar_reduction</td>
                  <td className="py-2.5 px-4 text-emerald-600 font-semibold">true</td>
                  <td className="py-2.5 px-4 font-mono">{`{"hours": [int...], "factor": float}`}</td>
                  <td className="py-2.5 px-4 font-sans text-muted-foreground">
                    `factor` represents the <strong>usable fraction remaining</strong> (0 ≤ factor ≤ 1). An 80% reduction means `factor = 0.20`. &quot;Drop to 25%&quot; means `factor = 0.25`.
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-bold text-primary">minimum_battery_reserve</td>
                  <td className="py-2.5 px-4 text-emerald-600 font-semibold">true</td>
                  <td className="py-2.5 px-4 font-mono">{`{"hours": [int...], "minimum_energy_kwh": float}`}</td>
                  <td className="py-2.5 px-4 font-sans text-muted-foreground">
                    Enforces an elevated energy safety floor during critical hours. Stated percentage values (e.g. 50%) are converted as `percentage × capacity_kwh`.
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-bold text-primary">no_charge_window</td>
                  <td className="py-2.5 px-4 text-emerald-600 font-semibold">true</td>
                  <td className="py-2.5 px-4 font-mono">{`{"hours": [int...]}`}</td>
                  <td className="py-2.5 px-4 font-sans text-muted-foreground">
                    Forbids battery charging during specified hours (`battery_action` cannot be `charge`, `battery_kwh = 0`). Used during charger inspection or thermal outages.
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-bold text-primary">no_discharge_window</td>
                  <td className="py-2.5 px-4 text-emerald-600 font-semibold">true</td>
                  <td className="py-2.5 px-4 font-mono">{`{"hours": [int...]}`}</td>
                  <td className="py-2.5 px-4 font-sans text-muted-foreground">
                    Forbids battery discharge during specified hours (`battery_action` cannot be `discharge`, `battery_kwh = 0`). Used during electrical protection relay testing.
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-bold text-primary">max_grid_window</td>
                  <td className="py-2.5 px-4 text-emerald-600 font-semibold">true</td>
                  <td className="py-2.5 px-4 font-mono">{`{"hours": [int...], "max_grid_kwh": float}`}</td>
                  <td className="py-2.5 px-4 font-sans text-muted-foreground">
                    Imposes an upper ceiling on grid electricity intake (grid_kwh ≤ max_grid_kwh) to protect substations or transformers from overloading.
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-bold text-muted-foreground">no_op</td>
                  <td className="py-2.5 px-4 text-muted-foreground font-semibold">false</td>
                  <td className="py-2.5 px-4 font-mono text-muted-foreground">null</td>
                  <td className="py-2.5 px-4 font-sans text-muted-foreground">
                    Applied to irrelevant or distractor notices (e.g. sports announcements, registration deadlines, library hours, cafeteria changes).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Mathematical LP Formulation */}
        <section id="mathematical-model" className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <span>04</span>
            <span>Mathematical Model</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Simplex Linear Program Formulation
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The optimization engine solves an exact continuous Linear Program over the 24-hour horizon (h = 0 ... 23):
          </p>

          <div className="rounded-xl border bg-card p-5 space-y-3 font-mono text-xs">
            <div className="text-primary font-bold">
              Objective: Minimize Total Purchased Electricity Cost
            </div>
            <div className="rounded bg-muted/40 p-3 text-foreground">
              min ∑ [ grid_kwh[h] × tariff_bdt_per_kwh[h] ] across h ∈ [0 .. 23]
            </div>

            <div className="text-foreground font-semibold pt-2">Physical Invariants & Constraints:</div>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
              <li>
                <strong className="text-foreground">Hourly Energy Balance:</strong> grid_kwh[h] + solar_used_kwh[h] + discharge_kwh[h] = demand_kwh[h] + charge_kwh[h] (∀ h)
              </li>
              <li>
                <strong className="text-foreground">Solar Curtailment Limit:</strong> 0 ≤ solar_used_kwh[h] ≤ effective_solar[h]. Grid solar export is prohibited.
              </li>
              <li>
                <strong className="text-foreground">State of Charge Transition Dynamics:</strong> E[h] = E[h-1] + charge_kwh[h] - discharge_kwh[h], with E[-1] = initial_energy_kwh.
              </li>
              <li>
                <strong className="text-foreground">Storage Bounds:</strong> max(minimum_energy_kwh, directive_reserve[h]) ≤ E[h] ≤ capacity_kwh.
              </li>
              <li>
                <strong className="text-foreground">Inverter Transfer Limits:</strong> charge_kwh[h] ≤ max_charge_rate, discharge_kwh[h] ≤ max_discharge_rate.
              </li>
              <li>
                <strong className="text-foreground">Grid Intake Cap:</strong> grid_kwh[h] ≤ max_grid_kwh[h] for active max_grid windows.
              </li>
              <li>
                <strong className="text-foreground">End-of-Day Neutrality:</strong> E[23] = initial_energy_kwh (guarantees conservation of stored energy).
              </li>
            </ol>
          </div>
        </section>

        {/* 5. REST API Reference */}
        <section id="api-reference" className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <span>05</span>
            <span>REST API Reference</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            API Endpoints & Integration
          </h2>

          <div className="space-y-4 text-xs">
            {/* Health Endpoint */}
            <div className="rounded-xl border bg-card p-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  GET
                </span>
                <code className="font-mono text-xs font-bold text-foreground">/health</code>
              </div>
              <p className="text-muted-foreground">
                Health and readiness probe. Responds immediately on container startup.
              </p>
              <div className="rounded-lg bg-muted/40 p-3 font-mono text-[11px] text-foreground">
                HTTP/1.1 200 OK<br />
                {`{"status": "ok"}`}
              </div>
            </div>

            {/* Optimize Endpoint */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                  POST
                </span>
                <code className="font-mono text-xs font-bold text-foreground">/optimize-energy</code>
              </div>
              <p className="text-muted-foreground">
                Autonomous optimization engine. Ingests natural-language operator logs, battery limits, and 24-hour demand/solar/tariff matrices, returning the optimal dispatch schedule.
              </p>

              <div className="font-semibold text-foreground text-[11px]">Example cURL Request:</div>
              <pre className="rounded-lg bg-muted/40 p-3 font-mono text-[11px] overflow-x-auto text-foreground">
{`curl -X POST https://your-app.up.railway.app/optimize-energy \\
  -H "Content-Type: application/json" \\
  -d '{
    "scenario_id": "SAMPLE-01",
    "operator_notes": [
      "Facilities will wash rooftop panels from noon until 2 PM. Usable solar is 25%."
    ],
    "hours": [ ... 24 hourly objects ... ],
    "battery": {
      "capacity_kwh": 220,
      "initial_energy_kwh": 110,
      "minimum_energy_kwh": 40,
      "max_charge_kwh_per_hour": 50,
      "max_discharge_kwh_per_hour": 50
    }
  }'`}
              </pre>

              <div className="font-semibold text-foreground text-[11px]">Response Status Codes:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="border rounded p-2 bg-background">
                  <span className="text-emerald-500 font-bold">200 OK</span>
                  <p className="font-sans text-[10px] text-muted-foreground">Optimal plan solved</p>
                </div>
                <div className="border rounded p-2 bg-background">
                  <span className="text-amber-500 font-bold">400 Bad Request</span>
                  <p className="font-sans text-[10px] text-muted-foreground">Malformed JSON payload</p>
                </div>
                <div className="border rounded p-2 bg-background">
                  <span className="text-rose-500 font-bold">422 Unprocessable</span>
                  <p className="font-sans text-[10px] text-muted-foreground">Infeasible physical bounds</p>
                </div>
                <div className="border rounded p-2 bg-background">
                  <span className="text-destructive font-bold">500 Server Error</span>
                  <p className="font-sans text-[10px] text-muted-foreground">Internal failure handled</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        GridWise EMS v2.0 Enterprise · Autonomous Campus Microgrid & Energy Dispatch Platform
      </footer>
    </div>
  )
}
