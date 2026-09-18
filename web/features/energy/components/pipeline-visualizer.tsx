"use client"

export function PipelineVisualizer() {
  const steps = [
    {
      step: "01",
      title: "Natural Language Input",
      badge: "Operator Logs",
      description: "Receives 1–3 shift notes with informal wording, maintenance windows, and distractors.",
      icon: "📝",
    },
    {
      step: "02",
      title: "LLM Cognitive Parsing",
      badge: "Multi-Provider AI",
      description: "Rig-core dispatches prompt to Claude/Gemini/DeepSeek with zero temperature for JSON extraction.",
      icon: "🧠",
    },
    {
      step: "03",
      title: "Deterministic Guardrails",
      badge: "Normalizer",
      description: "Sorts hours [0..23], bounds factor [0..1], clamps reserve, and downgrades invalid rules to no_op.",
      icon: "🛡️",
    },
    {
      step: "04",
      title: "Simplex LP Optimization",
      badge: "minilp Solver",
      description: "Solves 24-hour linear objective min ∑(grid × tariff) with strict physical invariants and neutrality.",
      icon: "⚡",
    },
  ]

  return (
    <div className="rounded-2xl border bg-card/80 backdrop-blur-md p-6 shadow-sm">
      <div className="flex flex-col gap-1 border-b pb-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <span>⚙️</span> GridWise 4-Stage Autonomous Pipeline
        </h3>
        <p className="text-xs text-muted-foreground">
          Architected for Section 1 Challenge Overview & Section 6 Deterministic Guardrails
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s, idx) => (
          <div
            key={s.step}
            className="relative rounded-xl border bg-background p-4 flex flex-col justify-between text-xs group hover:border-primary/40 transition-all"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-lg">{s.icon}</span>
                <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  STEP {s.step}
                </span>
              </div>
              <h4 className="mt-2 font-semibold text-foreground">{s.title}</h4>
              <span className="mt-0.5 inline-block text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {s.badge}
              </span>
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </div>

            {idx < steps.length - 1 && (
              <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/40 font-mono text-sm">
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
