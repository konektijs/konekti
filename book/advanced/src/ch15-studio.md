<!-- packages: @fluojs/studio, @fluojs/runtime, @fluojs/cli -->
<!-- project-state: FluoBlog v0 -->

# Chapter 15. Studio — 시각적 진단과 관찰성

## What You Will Learn in This Chapter
- The role of `@fluojs/studio` in the development lifecycle
- Generating and parsing platform snapshots with `fluo inspect`
- Understanding the `PlatformShellSnapshot` and `PlatformDiagnosticIssue` contracts
- Using the Studio Viewer for dependency graph visualization
- Troubleshooting initialization bottlenecks and provider-diagnostic scenarios

## Prerequisites
- Familiarity with the Fluo module system and dependency injection
- Understanding of the Fluo CLI commands
- Basic knowledge of JSON and web-based visualization tools

## 15.1 Beyond the Terminal: Why Studio?

As applications grow, the dependency graph can become too complex to keep in one's head. Circular dependencies, scope mismatches, and failed provider resolutions become harder to track through terminal logs alone.

**@fluojs/studio** is Fluo's answer to this complexity. It is a file-first, shared platform snapshot viewer designed to provide a visual and actionable overview of your application's internal state. It transforms the "black box" of the DI container into a transparent, visual map.

Unlike heavy APM (Application Performance Monitoring) tools, Studio focuses on the **static and bootstrap-time architecture**, helping you find "why it didn't start" rather than just "why it is slow now."

## 15.2 The Studio Ecosystem

Studio is composed of three primary layers, as defined in `packages/studio/README.md`:

1. **Producer**: The `fluo inspect` command (part of `@fluojs/cli`) which crawls the module graph and emits a JSON snapshot.
2. **Contracts**: The `@fluojs/studio/contracts` subpath, providing the schema and validation logic for snapshots and timing data.
3. **Viewer**: The `@fluojs/studio/viewer` package, a React/Vite-based web interface for loading and exploring these snapshots.

## 15.3 Generating Snapshots with `fluo inspect`

The primary way to interact with Studio is by generating a snapshot of your application.

```bash
fluo inspect ./src/app.module.ts --json > platform-state.json
```

This command invokes the Fluo runtime in a special "inspection mode" where providers are resolved and the graph is built, but the actual server doesn't start listening. The resulting JSON contains:
- Every registered component (Module, Controller, Provider)
- Full dependency mapping
- Health and readiness status
- Detailed bootstrap timing per phase

## 15.4 Understanding the Snapshot Contract

The data emitted by the CLI follows the `PlatformShellSnapshot` contract defined in `packages/studio/src/contracts.ts`. This contract ensures that any producer (CLI, custom script, or external tool) generates data that the Viewer can reliably interpret.

### PlatformShellSnapshot Structure

```typescript
export interface PlatformShellSnapshot {
  generatedAt: string;
  readiness: { status: 'ready' | 'not-ready' | 'degraded'; critical: boolean };
  health: { status: 'healthy' | 'unhealthy' | 'degraded' };
  components: PlatformComponent[];
  diagnostics: PlatformDiagnosticIssue[];
}
```

### PlatformDiagnosticIssue: The Heart of Troubleshooting

Each diagnostic issue provides actionable metadata to help you fix configuration errors. The `fixHint` and `docsUrl` fields are particularly valuable for guided troubleshooting.

```typescript
export interface PlatformDiagnosticIssue {
  code: string;           // e.g., "FL0042"
  severity: 'error' | 'warning' | 'info';
  componentId: string;    // Which component failed
  message: string;        // Human-readable description
  cause?: string;         // Root cause analysis
  fixHint?: string;       // Explicit suggestion: "Add @Injectable() to X"
  dependsOn?: string[];   // Which blockers prevent resolution
  docsUrl?: string;       // Link to detailed guide
}
```

## 15.5 Using the Studio Viewer

The Studio Viewer is a standalone web application. You can run it locally within the monorepo or use the published version.

```bash
pnpm --dir packages/studio dev
```

Once opened, you simply drag and drop your `platform-state.json` file into the browser. The `parseStudioPayload` helper validates the file against our internal versioning and schema rules before rendering.

### Key Features of the Viewer

- **The Graph View**: Renders your application as a Mermaid-powered dependency diagram. You can see which services depend on which repositories at a glance.
- **The Diagnostics Tab**: Lists all `PlatformDiagnosticIssue` entries. It groups them by severity and allows you to filter by component.
- **The Timing Tab**: Visualizes the bootstrap sequence, showing exactly how many milliseconds each phase (Module Graph Build, Instance Resolution, Lifecycle Hooks) took.

### Visualizing Scopes and Lifecycles

One of the most powerful aspects of Studio is its ability to visualize provider scopes. In complex applications, it's easy to accidentally inject a Request-scoped provider into a Singleton-scoped one, leading to runtime errors or memory leaks.

Studio flags these scope mismatches in the component details view. By selecting a component, you can see its resolved scope and any potential violations in its dependency chain. The viewer also provides a "Lifecycle Trace" for each component, showing when it was instantiated and when its various hooks (`onModuleInit`, `onApplicationBootstrap`, etc.) were executed.

## 15.6 Scenario: Diagnosing a Provider Deadlock

Imagine your application hangs during startup. By inspecting the snapshot in Studio, you might find a "Circular Dependency" error in the Diagnostics tab.

1. **Identify**: Studio marks the offending components in red.
2. **Analyze**: The `dependsOn` field shows the cycle: `ServiceA -> ServiceB -> ServiceA`.
3. **Fix**: Use the `fixHint` which might suggest using `forwardRef()` or refactoring the shared logic into a third service.

## 15.7 Programmatic Consumption of Snapshots

If you are building custom CI/CD tooling, you can use `@fluojs/studio` as a library to parse and validate snapshots using `parseStudioPayload` and `applyFilters`.

```typescript
// packages/studio/src/contracts.test.ts (logic walkthrough)
import { parseStudioPayload, applyFilters } from '@fluojs/studio';
import { readFileSync } from 'node:fs';

const raw = readFileSync('platform-state.json', 'utf8');
const { payload } = parseStudioPayload(raw);

if (payload.snapshot) {
  const errors = applyFilters(payload.snapshot, {
    query: '',
    readinessStatuses: [],
    severities: ['error']
  });
  
  if (errors.diagnostics.length > 0) {
    console.error('Platform has critical issues!');
  }
}
```

## 15.8 Mermaid Export for Documentation

Studio allows you to export the visual graph as Mermaid text using the `renderMermaid(snapshot)` helper. This is incredibly useful for maintaining up-to-date architecture documentation in your `README.md` or Notion pages without manual drawing.

### Studio as an Architecture Guard

Beyond interactive use, Studio snapshots can be integrated into your CI/CD pipeline as architecture guards. By analyzing the `PlatformShellSnapshot` programmatically, you can enforce rules that are difficult to check with linters alone.

For example, you could write a script that fails the build if any service from the `billing` module depends on a repository from the `inventory` module, ensuring strict domain isolation. This "Policy as Code" approach, powered by Fluo's transparent metadata, brings a new level of governance to large-scale TypeScript projects.

## 15.9 Why Line-by-Line Consistency Matters

In the Fluo project, we maintain a strict policy where English and Korean documentation must have identical headings. This isn't just for aesthetics; it allows our CI/CD pipelines to perform automated diffing to ensure that no technical section is missed during translation.

Every heading in this file corresponds exactly to a section in the Korean version. This consistency is also vital for the Studio diagnostics themselves. Since Studio issues are often mapped to documentation URLs, having a stable and synchronized heading structure allows the framework to provide precise links to both English and Korean readers.

## Summary

Studio transforms the "black box" of the DI container into a transparent, visual map. By leveraging snapshots, diagnostics, and timing data, you can move from guessing why a dependency failed to seeing the exact blocker and its suggested fix.

Effective diagnostics also shorten the feedback loop for new developers. Instead of teaching every nuance of the module graph, you can point them to the Studio viewer to explore the system on their own. Moreover, Studio’s ability to export to Mermaid ensures that your documentation remains a living part of your codebase.

As you move forward, keep the "Studio-first" mindset in your diagnostics workflow. Whenever you hit a complex configuration issue, reach for `fluo inspect` and let the visual data guide your troubleshooting.

---
<!-- lines: 203 -->

