# AuthorityLayer

[![CI](https://github.com/032383justin/authority-layer/actions/workflows/ci.yml/badge.svg)](https://github.com/032383justin/authority-layer/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/authority-layer)](https://www.npmjs.com/package/authority-layer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

**Hard execution and budget limits for autonomous agents — enforced locally.**

AuthorityLayer prevents runaway spend, infinite tool loops, and uncontrolled external calls in agentic systems. It enforces strict boundaries inside your runtime and halts execution safely when limits are breached.

- ✅ No telemetry
- ✅ No cloud dependency
- ✅ Fail-closed by default
- ✅ Works fully offline
- ✅ Zero runtime dependencies

---

## The Problem

Autonomous agents introduce a new risk surface that traditional systems don't account for:

- **Unbounded token spend** — a looping agent can burn thousands of dollars before you notice
- **Infinite tool loops** — agents can get stuck calling the same tool repeatedly
- **Retry storms** — failed API calls retried indefinitely with no ceiling
- **Cascading API calls** — one agent spawns sub-calls, which spawn more
- **Silent cost explosions** — spend accumulates across runs with no enforced ceiling

Most systems rely on warnings, dashboard alerts, or provider-level quotas — all of which react *after* the damage is done.

**AuthorityLayer enforces hard limits directly in your execution loop.** When a boundary is crossed, execution stops immediately.

---

## Quick Start

```bash
npm install authority-layer
```

Verify the install in seconds:

```bash
npx authority-layer doctor
```

Expected output:

```
AuthorityLayer Doctor  authority-layer@0.1.1

  ✔  Node.js version >= 18                  pass
  ✔  crypto module (sha256)                 pass
  ✔  AUTHORITY_LAYER_DISABLE not set        pass
  ✔  core module loads offline              pass
  ✔  AuthorityLayer instantiates            pass

All checks passed. AuthorityLayer is ready.
```

---

## Minimal Integration

```typescript
import { AuthorityLayer, EnforcementHalt } from "authority-layer";

const authority = new AuthorityLayer({
  budget:      { dailyUSD: 50 },            // Hard USD spend cap
  loopGuard:   { maxToolCallsPerRun: 25 },  // Max tool calls per run
  toolThrottle:{ maxCallsPerMinute: 60 },   // Sliding-window rate cap
});

try {
  await authority.wrap(async () => {
    // All tool calls go through authority.tool()
    const result = await authority.tool("llm.chat", () =>
      callYourModel(prompt)
    );

    // You calculate cost; authority enforces the cap
    authority.recordSpend(calculateCostUSD(result));
  });
} catch (err) {
  if (err instanceof EnforcementHalt) {
    // Structured halt object — never parse the message string
    console.error(err.enforcement);
    // { status: "halted", reason: "budget_exceeded", limit: 50, spent: 52.14, event_id: "evt_..." }
  }
}
```

---

## Enforcement Primitives

AuthorityLayer V1 implements three composable enforcement primitives. Each is independently opt-in — omit a config key to disable that primitive entirely.

### 1. Budget Cap

Tracks cumulative USD spend across the lifetime of the process. Halts when the total exceeds the configured cap.

```typescript
const authority = new AuthorityLayer({
  budget: { dailyUSD: 50 },
});

// After each billable call, report the cost
const response = await authority.tool("openai.chat", () =>
  openai.chat.completions.create({ model: "gpt-4o", messages })
);
const costUSD = response.usage.total_tokens * PRICE_PER_TOKEN;
authority.recordSpend(costUSD);
```

> **Why explicit spend reporting?** Different providers expose token counts and pricing differently. AuthorityLayer doesn't assume your pricing model — you calculate the USD cost and report it. This makes the integration provider-agnostic.

**Halt reason:** `"budget_exceeded"`

---

### 2. Loop Guard

Limits the total number of tool calls within a single `wrap()` invocation. The counter resets at the start of each `wrap()` call.

```typescript
const authority = new AuthorityLayer({
  loopGuard: { maxToolCallsPerRun: 25 },
});
```

Every call to `authority.tool()` increments the counter *before* the tool function executes. If the limit is already reached, the tool function is never called.

**Halt reason:** `"loop_limit_exceeded"`

---

### 3. Tool Throttle

Rate-limits tool calls using a **sliding 60-second window** — not a fixed reset bucket. This accurately reflects the true call density over the last minute, preventing bursts at bucket boundaries.

```typescript
const authority = new AuthorityLayer({
  toolThrottle: { maxCallsPerMinute: 60 },
});
```

On each `authority.tool()` call:
1. Timestamps older than 60 seconds are evicted
2. The current timestamp is added
3. If the count exceeds `maxCallsPerMinute`, execution halts

**Halt reason:** `"tool_throttle_exceeded"`

---

## API Reference

### `new AuthorityLayer(config)`

```typescript
interface AuthorityConfig {
  mode?:         "strict" | "warn";   // Default: "strict"
  budget?:       { dailyUSD: number };
  loopGuard?:    { maxToolCallsPerRun: number };
  toolThrottle?: { maxCallsPerMinute: number };
}
```

| Mode | Behavior |
|------|----------|
| `"strict"` | Throws `EnforcementHalt` immediately when a limit is breached (default) |
| `"warn"` | Emits a `console.warn` — **stubbed in V1**, full implementation coming in a future release |

---

### `authority.wrap(fn)`

Wraps an agent run with enforcement. Resets per-run counters (loop guard) and logs `run.start` / `run.complete` events to the audit chain.

```typescript
await authority.wrap(async () => {
  // your agent loop here
});
```

---

### `authority.tool(name, fn)`

The single hook for all external tool calls. Checks loop guard and throttle *before* calling `fn`. If either limit is breached, `fn` is never invoked.

```typescript
const data = await authority.tool("stripe.charge", () =>
  stripe.charges.create({ amount: 100, currency: "usd" })
);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Human-readable label logged to the event chain |
| `fn` | `() => Promise<T>` | The actual tool call |

---

### `authority.recordSpend(amountUSD)`

Report token or API spend in USD. Accumulates across all calls in the current process lifetime (not per-run). Call this after each model or billable API response.

```typescript
authority.recordSpend(0.0042); // $0.0042 spent this call
```

---

### `authority.getChain()`

Returns a read-only copy of the enforcement event chain. Useful for inspecting what happened during a run or persisting to disk.

```typescript
const events = authority.getChain(); // ReadonlyArray<EnforcementEvent>
```

Each event contains: `event_id`, `type`, `timestamp`, `data`, `hash`, `previousHash`.

---

### `authority.verifyChain()`

Verifies the integrity of the in-memory event chain. Returns `false` if any event has been tampered with, reordered, or removed.

```typescript
const intact = authority.verifyChain(); // true | false
```

---

## The HaltResult Object

When any guard breaches, AuthorityLayer throws an `EnforcementHalt` error. Access the structured result at `err.enforcement`:

```typescript
interface HaltResult {
  status:   "halted";
  reason:   "budget_exceeded" | "loop_limit_exceeded" | "tool_throttle_exceeded";
  limit:    number;   // The configured limit that was breached
  spent:    number;   // The value that exceeded it (USD, call count, etc.)
  event_id: string;   // Unique ID from the enforcement event chain
}
```

### Catching a halt

```typescript
import { AuthorityLayer, EnforcementHalt } from "authority-layer";

try {
  await authority.wrap(async () => {
    // ... agent loop
  });
} catch (err) {
  if (err instanceof EnforcementHalt) {
    // Always access via err.enforcement — never parse err.message
    const { reason, limit, spent, event_id } = err.enforcement;
    console.error(`Halted: ${reason} (${spent} > ${limit}) [${event_id}]`);
    // e.g. "Halted: budget_exceeded (52.14 > 50) [evt_3f9a2c1b...]"
  }
}
```

---

## Audit Chain

Every significant event in an agent run is logged to a hash-linked in-memory chain:

| Event type | When it fires |
|------------|---------------|
| `run.start` | At the start of each `wrap()` call |
| `tool.call` | Each time `authority.tool()` is called |
| `enforcement.halt` | When a limit is breached |
| `run.complete` | When `wrap()` completes without error |
| `run.error` | When an unexpected error is thrown inside `wrap()` |

Each event is cryptographically linked to its predecessor via SHA-256. Altering, reordering, or removing any event invalidates all subsequent hashes — detectable instantly with `verifyChain()`.

```typescript
const events = authority.getChain();
// [
//   { type: "run.start",         event_id: "evt_a1b2...", hash: "...", ... },
//   { type: "tool.call",         event_id: "evt_c3d4...", hash: "...", ... },
//   { type: "enforcement.halt",  event_id: "evt_e5f6...", hash: "...", ... },
// ]

authority.verifyChain(); // true — chain is intact
```

> **V1 note:** The chain lives in memory only. It is not persisted to disk or anchored remotely. Persistence is planned for a future release.

---

## Live Example

See a live enforcement halt in action:

```bash
git clone https://github.com/032383justin/authority-layer.git
cd authority-layer && npm install && npm run example
```

Output:

```
Starting agent run...

[Tool 1] LLM: LLM response to: "What is 2 + 2?"
[Tool 2] Search: Result 1 for "TypeScript enforcement patterns"
[Tool 3] LLM: LLM response to: "Summarize the search results"
[Tool 4] LLM: LLM response to: "Any follow-up questions?"
[Tool 5] LLM: LLM response to: "Final answer"

⛔ Execution halted by AuthorityLayer

{
  "status": "halted",
  "reason": "budget_exceeded",
  "limit": 0.05,
  "spent": 0.07,
  "event_id": "evt_53ab5487b37cd9c0"
}

── Enforcement Event Chain ──────────────────────────────────
  [run.start]        evt_a1b2... @ 2025-01-01T00:00:00.000Z
  [tool.call]        evt_c3d4... @ 2025-01-01T00:00:00.010Z
  [tool.call]        evt_e5f6... @ 2025-01-01T00:00:00.021Z
  [tool.call]        evt_g7h8... @ 2025-01-01T00:00:00.032Z
  [tool.call]        evt_i9j0... @ 2025-01-01T00:00:00.043Z
  [tool.call]        evt_k1l2... @ 2025-01-01T00:00:00.054Z
  [enforcement.halt] evt_m3n4... @ 2025-01-01T00:00:00.055Z

Chain integrity: ✅ verified
Total events: 7
```

---

## Example Run

![AuthorityLayer demo](https://raw.githubusercontent.com/032383justin/authority-layer/main/demo.svg)

---

## Core Guarantees

| Guarantee | Description |
|-----------|-------------|
| **Local-first enforcement** | Works fully offline — no network dependency in the enforcement path |
| **Fail-closed by default** | Breaches halt execution; nothing is silently ignored |
| **Structured halts** | Always throws `EnforcementHalt` with a typed `.enforcement` object — never a raw crash |
| **Tamper-evident audit log** | Hash-linked event chain detects any post-hoc modification |
| **Zero outbound calls** | Makes no network requests unless you explicitly wire an alert destination |
| **No silent defaults** | Omitting a config key fully disables that primitive — no hidden guards running |

---

## Requirements

- **Node.js** >= 18.0.0
- **TypeScript** >= 5.x (if using TypeScript) — types are bundled
- No runtime dependencies

---

## What AuthorityLayer Is Not

- Not a governance platform
- Not an observability suite
- Not a FinOps analytics tool
- Not a workflow orchestrator

It is a primitive. It enforces boundaries. Nothing more.

---

## License

MIT © 2025 AuthorityLayer Contributors

[GitHub](https://github.com/032383justin/authority-layer) · [npm](https://www.npmjs.com/package/authority-layer) · [Issues](https://github.com/032383justin/authority-layer/issues)
