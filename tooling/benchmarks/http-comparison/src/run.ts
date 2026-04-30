import autocannon, { type Request as AutocannonRequest, type Result } from 'autocannon';
import { spawn, type ChildProcess } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { join } from 'node:path';

import { printReport, type ScenarioResult, type TargetResult } from './report';

const FLUO_FASTIFY_PORT = 3001;
const NESTJS_PORT = 3002;
const FLUO_BUN_PORT = 3003;
const WDIR = process.cwd();
const FLUO_BUN_BUILD_DIR = join(WDIR, 'dist/fluo-bun');

type TargetName = 'nestjs-fastify' | 'fluo-fastify' | 'fluo-bun';
type AppShape =
  | 'baseline'
  | 'dto-1'
  | 'dto-20'
  | 'direct-1'
  | 'direct-20'
  | 'query-1'
  | 'body-1'
  | 'query-web-1'
  | 'json-1';

interface ScenarioRequestTemplate {
  readonly body?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method?: 'GET' | 'POST';
}

interface TargetConfig {
  name: TargetName;
  label: string;
  port: number;
  command: string;
  args: string[];
}

interface ScenarioConfig {
  readonly appShape: AppShape;
  readonly description: string;
  readonly expectedBodies: readonly string[];
  readonly name: string;
  readonly path?: string;
  readonly paths?: readonly string[];
  readonly request?: ScenarioRequestTemplate;
}

const TARGETS: TargetConfig[] = [
  {
    name: 'nestjs-fastify',
    label: 'Nest+Fastify',
    port: NESTJS_PORT,
    command: 'ts-node',
    args: ['--transpile-only', '--project', 'nestjs/tsconfig.json', 'src/nestjs/server.ts'],
  },
  {
    name: 'fluo-fastify',
    label: 'fluo+Fastify',
    port: FLUO_FASTIFY_PORT,
    command: 'tsx',
    args: ['src/fluo/server.ts'],
  },
  {
    name: 'fluo-bun',
    label: 'fluo+Bun',
    port: FLUO_BUN_PORT,
    command: 'bun',
    args: ['run', 'dist/fluo-bun/server.js'],
  },
];

const USER_RESPONSE = JSON.stringify({ id: '1', name: 'Alice', email: 'alice@example.com' });
const BASELINE_RESPONSE = JSON.stringify({ ok: true });
const QUERY_DTO_RESPONSE = JSON.stringify({
  limit: '25',
  page: '2',
  region: 'west',
  role: 'admin',
  sort: 'createdAt',
  term: 'alice',
});
const BODY_DTO_REQUEST = JSON.stringify({
  email: 'alice@example.com',
  name: 'Alice',
  role: 'admin',
  status: 'active',
  team: 'platform',
  title: 'maintainer',
});
const BODY_DTO_RESPONSE = JSON.stringify({
  email: 'alice@example.com',
  name: 'Alice',
  role: 'admin',
  status: 'active',
  team: 'platform',
  title: 'maintainer',
});
const QUERY_WEB_RESPONSE = JSON.stringify({ encoded: 'hello world', tag: ['one', 'two'] });
const JSON_BODY_REQUEST = JSON.stringify({ count: 3, title: 'runtime-web' });
const JSON_BODY_RESPONSE = JSON.stringify({ count: 3, title: 'runtime-web' });

function routePaths(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `/di-chain/r${String(index + 1).padStart(2, '0')}/1`);
}

function directRoutePaths(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `/di-chain-direct/r${String(index + 1).padStart(2, '0')}/1`);
}

const SCENARIOS: readonly ScenarioConfig[] = [
  {
    name: 'baseline',
    description: 'Single baseline route without DI-chain path param binding',
    appShape: 'baseline',
    path: '/baseline',
    expectedBodies: [BASELINE_RESPONSE],
  },
  {
    name: 'di-chain-dto-deterministic-1',
    description: 'Deterministic 1-route path DTO + 3-level DI chain',
    appShape: 'dto-1',
    paths: ['/di-chain-one/r01/1'],
    expectedBodies: [USER_RESPONSE],
  },
  {
    name: 'di-chain-dto-deterministic-20',
    description: 'Deterministic 20-route path DTO + 3-level DI chain',
    appShape: 'dto-20',
    paths: routePaths(20),
    expectedBodies: [USER_RESPONSE],
  },
  {
    name: 'di-chain-direct-param-deterministic-1',
    description: 'Deterministic 1-route direct param + 3-level DI chain',
    appShape: 'direct-1',
    paths: ['/di-chain-direct-one/r01/1'],
    expectedBodies: [USER_RESPONSE],
  },
  {
    name: 'di-chain-direct-param-deterministic-20',
    description: 'Deterministic 20-route direct param + 3-level DI chain',
    appShape: 'direct-20',
    paths: directRoutePaths(20),
    expectedBodies: [USER_RESPONSE],
  },
  {
    name: 'query-dto-deterministic-1',
    description: 'Single-route query DTO with six bound fields',
    appShape: 'query-1',
    path: '/query-dto-one/r01?term=alice&role=admin&region=west&sort=createdAt&page=2&limit=25',
    expectedBodies: [QUERY_DTO_RESPONSE],
  },
  {
    name: 'body-dto-deterministic-1',
    description: 'Single-route body DTO with six bound fields',
    appShape: 'body-1',
    path: '/body-dto-one/r01',
    expectedBodies: [BODY_DTO_RESPONSE],
    request: {
      body: BODY_DTO_REQUEST,
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    },
  },
  {
    name: 'query-deterministic-1',
    description: 'Single query-focused route that reads repeated query parameters',
    appShape: 'query-web-1',
    path: '/query-one?tag=one&tag=two&encoded=hello+world',
    expectedBodies: [QUERY_WEB_RESPONSE],
  },
  {
    name: 'json-body-deterministic-1',
    description: 'Single JSON body route that exercises request body materialization',
    appShape: 'json-1',
    path: '/body-one',
    expectedBodies: [JSON_BODY_RESPONSE],
    request: {
      body: JSON_BODY_REQUEST,
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    },
  },
];

const WARMUP_SEC = readPositiveIntegerEnv('BENCH_WARMUP_SEC', 10);
const MEASURE_SEC = readPositiveIntegerEnv('BENCH_MEASURE_SEC', 40);
const CONNECTIONS = readPositiveIntegerEnv('BENCH_CONNECTIONS', 100);

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got ${raw}`);
  }

  return value;
}

function waitForPort(port: number, timeoutMs = 20_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = (): void => {
      const sock = createConnection({ port, host: '127.0.0.1' });
      sock.on('connect', () => { sock.destroy(); resolve(); });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`port ${port} not ready within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 300);
        }
      });
    };
    attempt();
  });
}

function assertCleanResult(label: string, result: Result): void {
  const failures = [
    ['errors', result.errors],
    ['timeouts', result.timeouts],
    ['non2xx', result.non2xx],
    ['mismatches', result.mismatches],
  ].filter(([, count]) => count !== 0);

  if (failures.length > 0) {
    const details = failures.map(([name, count]) => `${name}=${count}`).join(', ');
    throw new Error(`${label} returned invalid benchmark traffic: ${details}`);
  }
}

function createDeterministicPathSequence(paths: readonly string[]): () => string {
  let index = 0;
  return () => {
    const path = paths[index % paths.length] ?? paths[0] ?? '/';
    index += 1;
    return path;
  };
}

function shoot(
  url: string,
  duration: number,
  expectedBodies: readonly string[],
  label: string,
  requestTemplate: ScenarioRequestTemplate = {},
  paths?: readonly string[],
): Promise<Result> {
  return new Promise((resolve, reject) => {
    const nextPath = paths ? createDeterministicPathSequence(paths) : undefined;
    const hasCustomRequest = nextPath !== undefined
      || requestTemplate.method !== undefined
      || requestTemplate.body !== undefined
      || requestTemplate.headers !== undefined;

    autocannon({
      url,
      connections: CONNECTIONS,
      duration,
      verifyBody: (body: unknown) => expectedBodies.includes(String(body)),
      bailout: 1,
      ...(hasCustomRequest
        ? {
            requests: [{
              setupRequest(request: AutocannonRequest, _context: object) {
                request.path = nextPath?.() ?? request.path;
                request.method = requestTemplate.method ?? request.method;
                request.body = requestTemplate.body ?? request.body;
                request.headers = requestTemplate.headers
                  ? { ...(request.headers ?? {}), ...requestTemplate.headers }
                  : request.headers;
                return request;
              },
            }],
          }
        : {}),
    }, (err: Error | null, result: Result | undefined) => {
      if (err) {
        reject(err);
        return;
      }

      assertCleanResult(label, result!);
      resolve(result!);
    });
  });
}

async function measure(
  label: string,
  url: string,
  expectedBodies: readonly string[],
  requestTemplate: ScenarioRequestTemplate = {},
  paths?: readonly string[],
): Promise<Result> {
  process.stdout.write(`  measuring ${label.padEnd(6)} (${MEASURE_SEC}s)...`);
  const result = await shoot(url, MEASURE_SEC, expectedBodies, label, requestTemplate, paths);
  process.stdout.write(' done\n');
  return result;
}

async function runScenario(s: ScenarioConfig, index: number): Promise<ScenarioResult> {
  const processes = startTargets(s.appShape);
  const cleanup = (): void => {
    for (const child of processes) {
      child.kill();
    }
  };

  await Promise.all(TARGETS.map((target) => waitForPort(target.port)));

  const scenarioTargets = rotationFor(index).map((target) => ({
    target,
    url: `http://127.0.0.1:${target.port}${s.path ?? ''}`,
  }));

  try {
    process.stdout.write(`  [${s.name}] warm-up (${WARMUP_SEC}s)...`);
    await Promise.all(scenarioTargets.map(({ target, url }) => (
      shoot(url, WARMUP_SEC, s.expectedBodies, `${s.name}/${target.label} warm-up`, s.request, s.paths)
    )));
    process.stdout.write(' done\n');

    const measured: TargetResult[] = [];
    for (const { target, url } of scenarioTargets) {
      measured.push({
        label: target.label,
        result: await measure(target.label, url, s.expectedBodies, s.request, s.paths),
      });
    }

    const targets = TARGETS.map((target) => {
      const result = measured.find((item) => item.label === target.label);
      if (!result) {
        throw new Error(`missing result for ${target.label}`);
      }
      return result;
    });

    return { name: s.name, description: s.description, targets };
  } finally {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function rotationFor(index: number): TargetConfig[] {
  const offset = index % TARGETS.length;
  return [...TARGETS.slice(offset), ...TARGETS.slice(0, offset)];
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: WDIR,
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    child.on('error', reject);
    child.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with ${signal ?? `exit code ${code}`}`));
    });
  });
}

function startTargets(appShape: AppShape): ChildProcess[] {
  return TARGETS.map((target) => {
    const child = spawn(target.command, target.args, {
      cwd: WDIR,
      env: { ...process.env, BENCH_APP_SHAPE: appShape, PORT: String(target.port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stderr?.on('data', (d: Buffer) => process.stderr.write(`[${target.name}] ${String(d)}`));
    return child;
  });
}

async function buildBunTarget(): Promise<void> {
  await rm(FLUO_BUN_BUILD_DIR, { force: true, recursive: true });
  await runCommand('tsc', [
    'src/fluo-bun/server.ts',
    '--target', 'ES2022',
    '--module', 'ESNext',
    '--moduleResolution', 'Bundler',
    '--strict',
    '--skipLibCheck',
    '--outDir', 'dist/fluo-bun',
  ]);
}

async function main(): Promise<void> {
  await buildBunTarget();

  const results: ScenarioResult[] = [];
  for (const [index, s] of SCENARIOS.entries()) {
    console.log(`Scenario: ${s.name}`);
    results.push(await runScenario(s, index));
  }

  printReport(results, { connections: CONNECTIONS, duration: MEASURE_SEC });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
