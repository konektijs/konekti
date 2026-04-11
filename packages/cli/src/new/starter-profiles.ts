import type {
  BootstrapPlatform,
  BootstrapRuntime,
  BootstrapSchema,
  BootstrapShape,
  BootstrapToolingPreset,
  BootstrapTopology,
  BootstrapTransport,
} from './types.js';

export type StarterEmitterType = 'http' | 'microservice' | 'mixed';
export type StarterScaffoldRecipeId =
  | 'application-bun-bun-http'
  | 'application-cloudflare-workers-cloudflare-workers-http'
  | 'application-deno-deno-http'
  | 'application-node-express-http'
  | 'application-node-fastify-http'
  | 'application-node-nodejs-http'
  | 'microservice-node-none-grpc'
  | 'microservice-node-none-mqtt'
  | 'microservice-node-none-redis-streams'
  | 'microservice-node-none-tcp'
  | 'mixed-node-fastify-tcp';

type StarterDependencies = {
  dependencies: readonly string[];
  devDependencies: readonly string[];
};

export interface StarterProfile {
  dependencies: StarterDependencies;
  emitter: {
    platform: BootstrapPlatform;
    preset: BootstrapToolingPreset;
    runtime: BootstrapRuntime;
    transport: BootstrapTransport;
    type: StarterEmitterType;
  };
  id: StarterScaffoldRecipeId;
  platformPromptLabel?: string;
  promptLabel: string;
  schema: BootstrapSchema;
}

const DEFAULT_TOPOLOGY: BootstrapTopology = {
  deferred: true,
  mode: 'single-package',
};

function createSchema(
  shape: BootstrapShape,
  runtime: BootstrapRuntime,
  platform: BootstrapPlatform,
  transport: BootstrapTransport,
  tooling: BootstrapToolingPreset = 'standard',
): BootstrapSchema {
  return {
    platform,
    runtime,
    shape,
    tooling,
    topology: { ...DEFAULT_TOPOLOGY },
    transport,
  };
}

function cloneBootstrapSchema(schema: BootstrapSchema): BootstrapSchema {
  return {
    ...schema,
    topology: { ...schema.topology },
  };
}

export const DOCUMENTED_MICROSERVICE_TRANSPORTS: readonly BootstrapTransport[] = [
  'tcp',
  'redis',
  'redis-streams',
  'nats',
  'kafka',
  'rabbitmq',
  'mqtt',
  'grpc',
];

export const STARTER_PROFILE_REGISTRY: readonly StarterProfile[] = [
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/validation',
        '@fluojs/di',
        '@fluojs/http',
        '@fluojs/platform-bun',
        '@fluojs/runtime',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'bun',
      preset: 'standard',
      runtime: 'bun',
      transport: 'http',
      type: 'http',
    },
    id: 'application-bun-bun-http',
    platformPromptLabel: 'Bun native HTTP',
    promptLabel: 'Application (HTTP starter)',
    schema: createSchema('application', 'bun', 'bun', 'http'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/validation',
        '@fluojs/di',
        '@fluojs/http',
        '@fluojs/platform-deno',
        '@fluojs/runtime',
      ],
      devDependencies: [
        '@fluojs/cli',
      ],
    },
    emitter: {
      platform: 'deno',
      preset: 'standard',
      runtime: 'deno',
      transport: 'http',
      type: 'http',
    },
    id: 'application-deno-deno-http',
    platformPromptLabel: 'Deno native HTTP',
    promptLabel: 'Application (HTTP starter)',
    schema: createSchema('application', 'deno', 'deno', 'http'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/core',
        '@fluojs/validation',
        '@fluojs/di',
        '@fluojs/http',
        '@fluojs/platform-cloudflare-workers',
        '@fluojs/runtime',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'cloudflare-workers',
      preset: 'standard',
      runtime: 'cloudflare-workers',
      transport: 'http',
      type: 'http',
    },
    id: 'application-cloudflare-workers-cloudflare-workers-http',
    platformPromptLabel: 'Cloudflare Workers',
    promptLabel: 'Application (HTTP starter)',
    schema: createSchema('application', 'cloudflare-workers', 'cloudflare-workers', 'http'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/validation',
        '@fluojs/di',
        '@fluojs/http',
        '@fluojs/platform-fastify',
        '@fluojs/runtime',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'fastify',
      preset: 'standard',
      runtime: 'node',
      transport: 'http',
      type: 'http',
    },
    id: 'application-node-fastify-http',
    platformPromptLabel: 'Fastify',
    promptLabel: 'Application (HTTP starter)',
    schema: createSchema('application', 'node', 'fastify', 'http'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/validation',
        '@fluojs/di',
        '@fluojs/http',
        '@fluojs/platform-express',
        '@fluojs/runtime',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'express',
      preset: 'standard',
      runtime: 'node',
      transport: 'http',
      type: 'http',
    },
    id: 'application-node-express-http',
    platformPromptLabel: 'Express',
    promptLabel: 'Application (HTTP starter)',
    schema: createSchema('application', 'node', 'express', 'http'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/validation',
        '@fluojs/di',
        '@fluojs/http',
        '@fluojs/platform-nodejs',
        '@fluojs/runtime',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'nodejs',
      preset: 'standard',
      runtime: 'node',
      transport: 'http',
      type: 'http',
    },
    id: 'application-node-nodejs-http',
    platformPromptLabel: 'Raw Node.js HTTP',
    promptLabel: 'Application (HTTP starter)',
    schema: createSchema('application', 'node', 'nodejs', 'http'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/di',
        '@fluojs/microservices',
        '@fluojs/runtime',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'none',
      preset: 'standard',
      runtime: 'node',
      transport: 'tcp',
      type: 'microservice',
    },
    id: 'microservice-node-none-tcp',
    promptLabel: 'Microservice (transport-first starter)',
    schema: createSchema('microservice', 'node', 'none', 'tcp'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/di',
        '@fluojs/microservices',
        '@fluojs/runtime',
        'ioredis',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'none',
      preset: 'standard',
      runtime: 'node',
      transport: 'redis-streams',
      type: 'microservice',
    },
    id: 'microservice-node-none-redis-streams',
    promptLabel: 'Microservice (Redis Streams starter)',
    schema: createSchema('microservice', 'node', 'none', 'redis-streams'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/di',
        '@fluojs/microservices',
        '@fluojs/runtime',
        'mqtt',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'none',
      preset: 'standard',
      runtime: 'node',
      transport: 'mqtt',
      type: 'microservice',
    },
    id: 'microservice-node-none-mqtt',
    promptLabel: 'Microservice (MQTT starter)',
    schema: createSchema('microservice', 'node', 'none', 'mqtt'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/di',
        '@fluojs/microservices',
        '@fluojs/runtime',
        '@grpc/grpc-js',
        '@grpc/proto-loader',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'none',
      preset: 'standard',
      runtime: 'node',
      transport: 'grpc',
      type: 'microservice',
    },
    id: 'microservice-node-none-grpc',
    promptLabel: 'Microservice (gRPC starter)',
    schema: createSchema('microservice', 'node', 'none', 'grpc'),
  },
  {
    dependencies: {
      dependencies: [
        '@fluojs/config',
        '@fluojs/core',
        '@fluojs/validation',
        '@fluojs/di',
        '@fluojs/http',
        '@fluojs/microservices',
        '@fluojs/platform-fastify',
        '@fluojs/runtime',
      ],
      devDependencies: [
        '@fluojs/cli',
        '@fluojs/testing',
      ],
    },
    emitter: {
      platform: 'fastify',
      preset: 'standard',
      runtime: 'node',
      transport: 'tcp',
      type: 'mixed',
    },
    id: 'mixed-node-fastify-tcp',
    promptLabel: 'Mixed (HTTP API + microservice starter)',
    schema: createSchema('mixed', 'node', 'fastify', 'tcp'),
  },
] as const;

export const SUPPORTED_BOOTSTRAP_SHAPES: readonly BootstrapShape[] = STARTER_PROFILE_REGISTRY.map((profile) => profile.schema.shape);
export const SUPPORTED_BOOTSTRAP_RUNTIMES: readonly BootstrapRuntime[] = ['bun', 'cloudflare-workers', 'deno', 'node'];
export const SUPPORTED_BOOTSTRAP_PLATFORMS: readonly BootstrapPlatform[] = [
  'bun',
  'cloudflare-workers',
  'deno',
  'express',
  'fastify',
  'nodejs',
  'none',
];
export const SUPPORTED_BOOTSTRAP_TRANSPORTS: readonly BootstrapTransport[] = ['http', ...DOCUMENTED_MICROSERVICE_TRANSPORTS];
export const SUPPORTED_BOOTSTRAP_TOOLING_PRESETS: readonly BootstrapToolingPreset[] = ['standard'];
export const SUPPORTED_BOOTSTRAP_TOPOLOGY_MODES: readonly BootstrapTopology['mode'][] = ['single-package'];

export const DEFAULT_BOOTSTRAP_PROFILE = STARTER_PROFILE_REGISTRY.find((profile) => profile.id === 'application-node-fastify-http')!;

export function getStarterProfileForShape(shape: BootstrapShape, runtime?: BootstrapRuntime): StarterProfile {
  if (runtime !== undefined) {
    return STARTER_PROFILE_REGISTRY.find((profile) => (
      profile.schema.shape === shape && profile.schema.runtime === runtime
    )) ?? DEFAULT_BOOTSTRAP_PROFILE;
  }

  if (shape === 'application') {
    return DEFAULT_BOOTSTRAP_PROFILE;
  }

  if (shape === 'microservice') {
    return STARTER_PROFILE_REGISTRY.find((profile) => profile.id === 'microservice-node-none-tcp') ?? DEFAULT_BOOTSTRAP_PROFILE;
  }

  if (shape === 'mixed') {
    return STARTER_PROFILE_REGISTRY.find((profile) => profile.id === 'mixed-node-fastify-tcp') ?? DEFAULT_BOOTSTRAP_PROFILE;
  }

  return DEFAULT_BOOTSTRAP_PROFILE;
}

export function getApplicationStarterProfiles(runtime?: BootstrapRuntime): readonly StarterProfile[] {
  return STARTER_PROFILE_REGISTRY.filter((profile) => (
    profile.schema.shape === 'application' && (runtime === undefined || profile.schema.runtime === runtime)
  ));
}

export function getDefaultBootstrapSchemaForShape(shape: BootstrapShape, runtime?: BootstrapRuntime): BootstrapSchema {
  return cloneBootstrapSchema(getStarterProfileForShape(shape, runtime).schema);
}

export function getDefaultBootstrapSchema(): BootstrapSchema {
  return cloneBootstrapSchema(DEFAULT_BOOTSTRAP_PROFILE.schema);
}

export function getStarterProfileFromSchema(schema: BootstrapSchema): StarterProfile | undefined {
  return STARTER_PROFILE_REGISTRY.find((profile) => (
    profile.schema.shape === schema.shape
    && profile.schema.runtime === schema.runtime
    && profile.schema.platform === schema.platform
    && profile.schema.transport === schema.transport
    && profile.schema.tooling === schema.tooling
    && profile.schema.topology.deferred === schema.topology.deferred
    && profile.schema.topology.mode === schema.topology.mode
  ));
}

export function isDocumentedMicroserviceTransport(transport: BootstrapTransport): boolean {
  return DOCUMENTED_MICROSERVICE_TRANSPORTS.includes(transport);
}
