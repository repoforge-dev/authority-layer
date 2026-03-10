# AuthorityLayer

[![RepoScore](https://repoforge.dev/badge/repoforge-dev/authority-layer)](https://repoforge.dev/repos/repoforge-dev/authority-layer)

AuthorityLayer enforces hard runtime limits for AI agents so budgets, loop counts, and tool-call rates fail closed instead of drifting until after damage is done.

## What This Project Does

AuthorityLayer gives developers a minimal runtime control layer for autonomous or tool-using agents. It wraps an execution loop, tracks spend, limits tool-call volume, and throws a typed halt when an agent crosses a configured boundary. The goal is not observability after the fact. The goal is deterministic enforcement during execution.

The library is aimed at developers building agent runtimes, internal automation, LLM-backed services, and safety-sensitive tools that need explicit operational limits. If a workflow should stop after a dollar budget, after a certain number of tool calls, or after a rate cap is reached, AuthorityLayer provides those controls directly in code.

## Why It Exists

Many agent systems fail in ordinary ways long before they fail in exotic ones. A loop retries a tool forever. A model call path consumes more tokens than expected. A badly bounded automation script keeps hitting an external API because nothing in the runtime says stop. Post-run dashboards can describe the incident, but they do not prevent it.

AuthorityLayer was created to make those boundaries local, explicit, and enforceable. It treats spend caps, loop limits, and rate limits as runtime invariants rather than optional monitoring. That keeps the implementation small, easy to audit, and practical for teams that want guardrails without adopting a full platform.

## Quickstart

Install the package and run the environment check:

```bash
npm install authority-layer
npx authority-layer doctor
```

If the doctor command passes, you can create an `AuthorityLayer` instance and wrap the part of your agent loop that must stay within budget and call limits.

## Example

Minimal example:

```typescript
import { AuthorityLayer, EnforcementHalt } from "authority-layer";

const authority = new AuthorityLayer({
  budget: { dailyUSD: 25 },
  loopGuard: { maxToolCallsPerRun: 12 },
  toolThrottle: { maxCallsPerMinute: 30 },
});

try {
  await authority.wrap(async () => {
    const result = await authority.tool("llm.chat", () => callModel(prompt));
    authority.recordSpend(calculateCostUSD(result));
  });
} catch (error) {
  if (error instanceof EnforcementHalt) {
    console.error(error.enforcement);
  }
}
```

For a runnable project example, use the bundled demo in `examples/` and the workspace script:

```bash
npm run example
```

That flow exercises the same enforcement surface used by the package: `wrap()` defines the run boundary, `tool()` tracks tool usage and rate limits, and `recordSpend()` reports explicit provider cost data.

## How It Works

AuthorityLayer is organized as a small workspace with the package implementation, runnable examples, and reference docs kept close together.

- `packages/core/src/` contains the runtime implementation, CLI entrypoint, enforcement primitives, integrity helpers, and exported types.
- `examples/` contains runnable examples for quick integration checks and demos.
- `docs/` contains concept notes, API reference, enforcement details, and integrity-chain documentation.
- `tests/` contains workspace-level smoke tests that keep the top-level layout and package metadata honest.
- `src/` documents the workspace source map so contributors can find the package entrypoints quickly.

There are exactly three enforcement primitives: a budget cap, a loop guard, and a tool throttle. Each primitive is opt-in. If you omit a config block, that guard is not instantiated. When a configured limit is breached, AuthorityLayer throws `EnforcementHalt` with structured data instead of forcing callers to parse log output.

Operational boundaries are explicit. AuthorityLayer does not claim to sandbox arbitrary code, but it does define clear permission and approval boundaries inside an agent runtime: only wrapped runs are counted, only calls made through `authority.tool()` are throttled, and spend is recorded only when the host reports it. Evaluation should happen before release using repeatable tests and demos so halt behavior is visible under controlled conditions.

## Use Cases

- Stop an internal agent after a daily spend budget is exhausted.
- Prevent a tool-using workflow from entering an unbounded retry loop.
- Enforce a maximum number of external tool calls per run.
- Rate-limit calls to a provider or internal service from an autonomous workflow.
- Add fail-closed controls to a prototype agent before exposing it to users.
- Demonstrate runtime guardrail behavior in a reproducible example or CI pipeline.

## Installation

For package consumers:

```bash
npm install authority-layer
```

For contributors working on the repository:

```bash
git clone https://github.com/repoforge-dev/authority-layer.git
cd authority-layer
npm install
npm test
npm run -w authority-layer build
npm run -w authority-layer typecheck
```

The workspace keeps contributor commands small. The root package coordinates examples and tests, while `packages/core` contains the published package source and build scripts.

## Why RepoScore Matters

Many GitHub repositories have thousands of stars but still lack strong documentation, onboarding clarity, or discoverability.

RepoScore automatically analyzes repositories and identifies practical improvements that make projects easier for developers and AI agents to use.

## RepoScore

Badge:

```md
[![RepoScore](https://repoforge.dev/badge/repoforge-dev/authority-layer)](https://repoforge.dev/repos/repoforge-dev/authority-layer)
```

Analysis page:

- [repoforge-dev/authority-layer](https://repoforge.dev/repos/repoforge-dev/authority-layer)

The RepoScore page is useful here because AuthorityLayer is a runtime-safety package. A public analysis page makes it easy to inspect documentation quality, discoverability, and onboarding clarity from the perspective of a developer evaluating whether to trust the project in a real workflow.

## Contributing

Contributions should keep the runtime surface explicit and easy to audit. Favor small changes, typed interfaces, and examples that demonstrate enforcement behavior clearly. When you change runtime semantics, update the docs and example flows in the same pull request so contributors can evaluate the impact without reverse-engineering the source.

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). It documents the workspace layout, test commands, and expectations for changes that affect halt behavior, permissions, or approval boundaries.

## License

MIT. See [LICENSE](./LICENSE).
