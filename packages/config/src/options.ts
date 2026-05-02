import { cloneConfigDictionary } from './clone.js';
import type { ConfigDictionary, ConfigLoadOptions, ConfigModuleOptions } from './types.js';

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' || typeof value === 'function') && value !== null;
}

function deepFreeze<T>(value: T): T {
  if (!isObjectLike(value) || Object.isFrozen(value)) {
    return value;
  }

  for (const key of Reflect.ownKeys(value)) {
    const child = (value as Record<PropertyKey, unknown>)[key];
    deepFreeze(child);
  }

  return Object.freeze(value);
}

function snapshotConfigDictionary(value: ConfigDictionary | undefined): ConfigDictionary | undefined {
  return value === undefined ? undefined : deepFreeze(cloneConfigDictionary(value));
}

function snapshotProcessEnv(processEnv: NodeJS.ProcessEnv | undefined): NodeJS.ProcessEnv | undefined {
  if (processEnv === undefined) {
    return undefined;
  }

  const snapshot: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(processEnv)) {
    if (value !== undefined) {
      snapshot[key] = value;
    }
  }

  return deepFreeze(snapshot);
}

/**
 * Creates a detached, frozen snapshot of config module registration options.
 *
 * @param options Caller-owned module options captured at registration time.
 * @returns Immutable options that cannot observe later caller mutations.
 */
export function snapshotConfigModuleOptions(options?: ConfigModuleOptions): ConfigModuleOptions {
  if (options === undefined) {
    return {};
  }

  return deepFreeze({
    ...options,
    defaults: snapshotConfigDictionary(options.defaults),
    processEnv: snapshotProcessEnv(options.processEnv),
  });
}

/**
 * Creates a detached, frozen snapshot of config load and reload options.
 *
 * @param options Caller-owned load options captured by loaders or reload modules.
 * @returns Immutable options that preserve registration-time config inputs.
 */
export function snapshotConfigLoadOptions(options?: ConfigLoadOptions): ConfigLoadOptions {
  if (options === undefined) {
    return {};
  }

  return deepFreeze({
    ...options,
    defaults: snapshotConfigDictionary(options.defaults),
    processEnv: snapshotProcessEnv(options.processEnv),
    runtimeOverrides: snapshotConfigDictionary(options.runtimeOverrides),
  });
}
