# AuthorityLayer

[![CI](https://github.com/032383justin/authority-layer/actions/workflows/ci.yml/badge.svg)](https://github.com/032383justin/authority-layer/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/authority-layer?color=blue)](https://www.npmjs.com/package/authority-layer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Hard execution and budget limits for autonomous agents — enforced locally.

✔ No telemetry  
✔ Works fully offline  
✔ Fail-closed by default  
✔ Zero runtime dependencies

---

## Why AuthorityLayer Exists

Autonomous AI agents can fail in expensive, hard-to-detect ways:

- **Runaway token spend** — a looping agent burns thousands of dollars before anyone notices
- **Infinite tool loops** — agents retry the same failing call indefinitely
- **Retry storms** — cascading failures hammer external APIs with no ceiling
- **Cascading tool call explosions** — one agent spawns sub-calls that spawn more

Most tooling detects these problems after they happen — in dashboards, alerts, or post-run analytics.

AuthorityLayer prevents them inside the runtime, before cost or damage accumulates.

It helps developers:

- prevent runaway LLM costs
- stop infinite agent loops
- limit AI agent tool calls per run and per minute
- enforce runtime safety for autonomous agents

---

## Live Enforcement Demo (10-second example)

![AuthorityLayer enforcement demo](https://raw.githubusercontent.com/032383justin/authority-layer/main/docs/assets/enforcement-demo.svg)

---

## Quick Start

```bash
npm install authority-layer
```

Verify the install:

```bash
npx authority-layer doctor
```

```
AuthorityLayer Doctor  authority-layer@0.1.2

  ✔  Node.js version >= 18                  pass
  ✔  crypto module (sha256)                 pass
  ✔  AUTHORITY_LAYER_DISABLE not set        pass
  ✔  core module loads offline              pass
  ✔  AuthorityLayer instantiates            pass

All checks passed. AuthorityLayer is ready.
```

## CLI Tools

| Command | What it does |
|---------|-------------|
| `npx authority-layer doctor` | Verify your installation passes all environment checks |
| `npx authority-layer simulate` | Run a live enforcement simulation — see a halt in action without writing any code |

---

## Minimal Integration

```typescript
import { AuthorityLayer, EnforcementHalt } from "authority-layer";

const authority = new AuthorityLayer({
  budget:       { dailyUSD: 50 },           // Hard USD spend cap
  loopGuard:    { maxToolCallsPerRun: 25 }, // Max tool calls per run
  toolThrottle: { maxCallsPerMinute: 60 },  // Sliding-window rate cap
});

try {
  await authority.wrap(async () => {
    const result = await authority.tool("llm.chat", () =>
      callYourModel(prompt)
    );
    authority.recordSpend(calculateCostUSD(result));
  });
} catch (err) {
  if (err instanceof EnforcementHalt) {
    console.error(err.enforcement);
    // { status: "halted", reason: "budget_exceeded", limit: 50, spent: 52.14, event_id: "evt_..." }
  }
}
```

---

## Enforcement Primitives

AuthorityLayer V1 provides three composable enforcement primitives. Each is opt-in — omit a config key to disable it.

These primitives enforce boundaries directly inside the execution loop — not in dashboards or external monitoring.

| Primitive | Config key | What it enforces |
|-----------|------------|------------------|
| **Budget cap** | `budget.dailyUSD` | Cumulative USD spend across the process lifetime. Halts when spend exceeds the cap. → [docs](./docs/enforcement.md#1-budget-cap) |
| **Loop guard** | `loopGuard.maxToolCallsPerRun` | Total tool calls per `wrap()` invocation. Counter resets each run. → [docs](./docs/enforcement.md#2-loop-guard) |
| **Tool throttle** | `toolThrottle.maxCallsPerMinute` | Rate of tool calls using a sliding 60-second window — no fixed buckets. → [docs](./docs/enforcement.md#3-tool-throttle) |

When a primitive breaches, AuthorityLayer throws a typed `EnforcementHalt` error with a structured `.enforcement` object. Execution never crashes silently.

---

## How AuthorityLayer Is Different

Most AI guardrail tools focus on moderation or observability. AuthorityLayer focuses on **runtime enforcement**.

| Tool type | What it does |
|-----------|-------------|
| Prompt guardrails | Filter or rewrite prompts and outputs |
| Observability platforms | Analyze agent behavior after execution |
| Cost analytics | Track and report token usage |
| **AuthorityLayer** | Enforces hard limits **during** execution — halts immediately when a boundary is crossed |

---

## Documentation

| Topic | File |
|------|------|
| Concepts & philosophy | [docs/concepts.md](./docs/concepts.md) |
| Enforcement primitives | [docs/enforcement.md](./docs/enforcement.md) |
| API reference | [docs/api.md](./docs/api.md) |
| Integrity chain | [docs/integrity.md](./docs/integrity.md) |
| Example run | `npm run example` |

---

AuthorityLayer is designed as a minimal enforcement primitive — not a platform, dashboard, or governance system.

---

## License

MIT © 2025 AuthorityLayer Contributors

[GitHub](https://github.com/032383justin/authority-layer) · [npm](https://www.npmjs.com/package/authority-layer) · [Issues](https://github.com/032383justin/authority-layer/issues)
