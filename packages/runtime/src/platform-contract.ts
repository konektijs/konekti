/**
 * Shared configuration knobs understood by runtime platform components.
 */
export interface PlatformOptionsBase {
  id?: string;
  enabled?: boolean;
  readiness?: {
    critical?: boolean;
    timeoutMs?: number;
  };
  shutdown?: {
    timeoutMs?: number;
  };
  diagnostics?: {
    expose?: boolean;
    tags?: Record<string, string>;
  };
  telemetry?: {
    namespace?: string;
    tags?: Record<string, string>;
  };
}

/** Lifecycle states emitted by platform components and the platform shell. */
export type PlatformState =
  | 'created'
  | 'validated'
  | 'starting'
  | 'ready'
  | 'degraded'
  | 'stopping'
  | 'stopped'
  | 'failed';

/**
 * Runtime-managed infrastructure component that participates in validation,
 * startup, readiness, health, diagnostics, and shutdown orchestration.
 */
export interface PlatformComponent {
  id: string;
  kind: string;
  state(): PlatformState;
  validate(): Promise<PlatformValidationResult> | PlatformValidationResult;
  start(): Promise<void>;
  ready(): Promise<PlatformReadinessReport>;
  health(): Promise<PlatformHealthReport>;
  snapshot(): PlatformSnapshot;
  stop(): Promise<void>;
}

/** Registration wrapper used when a component declares platform dependencies. */
export interface PlatformComponentRegistration {
  component: PlatformComponent;
  dependencies?: readonly string[];
}

/** Component registration input accepted by runtime bootstrap options. */
export type PlatformComponentInput = PlatformComponent | PlatformComponentRegistration;

/** Outcome for one named readiness or health probe inside a platform report. */
export interface PlatformCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'degraded';
  message?: string;
}

/**
 * Readiness semantics for one component or the aggregated platform shell.
 */
export interface PlatformReadinessReport {
  status: 'ready' | 'not-ready' | 'degraded';
  critical: boolean;
  reason?: string;
  checks?: PlatformCheckResult[];
}

/**
 * Health semantics for one component or the aggregated platform shell.
 */
export interface PlatformHealthReport {
  status: 'healthy' | 'unhealthy' | 'degraded';
  reason?: string;
  checks?: PlatformCheckResult[];
}

/** Snapshot payload stored when persistence-backed platform status is exported. */
export interface PersistencePlatformStatusSnapshot {
  readiness: PlatformReadinessReport;
  health: PlatformHealthReport;
  ownership: PlatformSnapshot['ownership'];
  details: Record<string, unknown>;
}

/** Machine-readable diagnostic issue reported during platform validation. */
export interface PlatformDiagnosticIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  componentId: string;
  message: string;
  cause?: string;
  fixHint?: string;
  dependsOn?: string[];
  docsUrl?: string;
}

/** Validation result returned before platform startup proceeds. */
export interface PlatformValidationResult {
  ok: boolean;
  issues: PlatformDiagnosticIssue[];
  warnings?: PlatformDiagnosticIssue[];
}

/** Immutable component snapshot included in runtime diagnostics and telemetry. */
export interface PlatformSnapshot {
  id: string;
  kind: string;
  state: PlatformState;
  readiness: {
    status: PlatformReadinessReport['status'];
    critical: boolean;
    reason?: string;
  };
  health: {
    status: PlatformHealthReport['status'];
    reason?: string;
  };
  dependencies: string[];
  telemetry: {
    namespace: string;
    tags: Record<string, string>;
  };
  ownership: {
    ownsResources: boolean;
    externallyManaged: boolean;
  };
  details: Record<string, unknown>;
}

/**
 * Aggregate platform snapshot emitted by the shell after collecting component
 * health, readiness, and validation diagnostics.
 */
export interface PlatformShellSnapshot {
  generatedAt: string;
  readiness: PlatformReadinessReport;
  health: PlatformHealthReport;
  components: PlatformSnapshot[];
  diagnostics: PlatformDiagnosticIssue[];
}

/**
 * High-level runtime facade that coordinates platform components as one unit.
 */
export interface PlatformShell {
  start(): Promise<void>;
  stop(): Promise<void>;
  ready(): Promise<PlatformReadinessReport>;
  health(): Promise<PlatformHealthReport>;
  snapshot(): Promise<PlatformShellSnapshot>;
}
