import type { MetadataPropertyKey } from '../types.js';
import { fallbackClone } from '../utils.js';

/**
 * Generic metadata bag shape used by the TC39 `Symbol.metadata` integration points.
 */
export type StandardMetadataBag = Record<PropertyKey, unknown>;

const symbolWithMetadata = Symbol as typeof Symbol & { metadata?: symbol };
const fallbackMetadataSymbol = Symbol.for('fluo.symbol.metadata');
/**
 * Active symbol key used to read and write standard metadata bags.
 */
export let metadataSymbol = symbolWithMetadata.metadata ?? fallbackMetadataSymbol;
let installedMetadataSymbol = symbolWithMetadata.metadata;

function createSymbolRegistry<const TEntries extends readonly (readonly [string, string])[]>(entries: TEntries): {
  [K in TEntries[number] as K[0]]: symbol;
} {
  const registry = new Map<string, symbol>();

  for (const [type, key] of entries) {
    registry.set(type, Symbol.for(key));
  }

  return Object.fromEntries(registry) as { [K in TEntries[number] as K[0]]: symbol };
}

/**
 * Ensures `Symbol.metadata` exists and returns the symbol used by Fluo metadata helpers.
 *
 * @returns The resolved metadata symbol.
 */
export function ensureMetadataSymbol(): symbol {
  if (symbolWithMetadata.metadata) {
    installedMetadataSymbol = symbolWithMetadata.metadata;
    metadataSymbol = installedMetadataSymbol;
    return metadataSymbol;
  }

  metadataSymbol = fallbackMetadataSymbol;

  Object.defineProperty(Symbol, 'metadata', {
    configurable: true,
    value: metadataSymbol,
  });
  installedMetadataSymbol = metadataSymbol;

  return metadataSymbol;
}

void ensureMetadataSymbol();

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function freezeMetadataValue<T>(value: T, seen: WeakSet<object>): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      freezeMetadataValue(item, seen);
    }
  } else if (value instanceof Map) {
    for (const [key, entryValue] of value.entries()) {
      freezeMetadataValue(key, seen);
      freezeMetadataValue(entryValue, seen);
    }
  } else if (value instanceof Set) {
    for (const entryValue of value.values()) {
      freezeMetadataValue(entryValue, seen);
    }
  } else if (isPlainObject(value)) {
    for (const key of Reflect.ownKeys(value)) {
      freezeMetadataValue((value as Record<PropertyKey, unknown>)[key], seen);
    }
  } else if (!(value instanceof Date)) {
    return value;
  }

  return Object.freeze(value);
}

/**
 * Freezes metadata snapshots after write-time cloning so read paths can return stable references.
 *
 * @param value Metadata value to freeze.
 * @returns The same value after recursively freezing metadata-owned mutable containers.
 */
export function freezeMetadataSnapshot<T>(value: T): T {
  return freezeMetadataValue(value, new WeakSet<object>());
}

/**
 * Clones mutable metadata payloads before storing or returning them from shared metadata helpers.
 *
 * @param value Metadata value to clone defensively.
 * @returns A detached clone for supported mutable shapes, or the original value for immutable references.
 */
export function cloneMutableValue<T>(value: T): T {
  if (Array.isArray(value) || value instanceof Date || value instanceof Map || value instanceof Set || isPlainObject(value)) {
    return fallbackClone(value);
  }

  return value;
}

/**
 * Canonical symbol keys for metadata emitted through the standard decorator metadata bag.
 */
export const standardMetadataKeys = {
  ...createSymbolRegistry([
    ['classValidation', 'fluo.standard.class-validation'],
    ['controller', 'fluo.standard.controller'],
    ['dtoFieldBinding', 'fluo.standard.dto-binding'],
    ['dtoFieldValidation', 'fluo.standard.dto-validation'],
    ['injection', 'fluo.standard.injection'],
    ['route', 'fluo.standard.route'],
  ] as const),
} as const;

/**
 * Canonical symbol keys for Fluo-owned metadata stores.
 */
export const metadataKeys = {
  ...createSymbolRegistry([
    ['module', 'fluo.metadata.module'],
    ['controller', 'fluo.metadata.controller'],
    ['route', 'fluo.metadata.route'],
    ['dtoFieldBinding', 'fluo.metadata.dto-field-binding'],
    ['dtoFieldValidation', 'fluo.metadata.dto-field-validation'],
    ['injection', 'fluo.metadata.injection'],
    ['classDi', 'fluo.metadata.class-di'],
    ['classValidation', 'fluo.metadata.class-validation'],
  ] as const),
} as const;

/**
 * Clones a readonly collection into a mutable array for defensive metadata reads and writes.
 *
 * @param collection Collection to clone.
 * @returns A cloned mutable array, or `undefined` when the collection is absent.
 */
export function cloneCollection<T>(collection: readonly T[] | undefined): T[] | undefined {
  return collection ? collection.map((value) => cloneMutableValue(value)) : undefined;
}

/**
 * Clones and freezes a readonly collection for immutable metadata snapshots.
 *
 * @param collection Collection to clone and freeze.
 * @returns A frozen cloned array, or `undefined` when the collection is absent.
 */
export function cloneFrozenCollection<T>(
  collection: readonly T[] | undefined,
  shouldPreserveReference: (value: T) => boolean = () => false,
): T[] | undefined {
  const cloned = collection?.map((value) => {
    if (shouldPreserveReference(value)) {
      return value;
    }

    return freezeMetadataSnapshot(cloneMutableValue(value));
  });

  return cloned ? (Object.freeze(cloned) as T[]) : undefined;
}

/**
 * Looks up or creates a property-keyed metadata map for a target object.
 *
 * @param store WeakMap-backed metadata store.
 * @param target Target object that owns the metadata map.
 * @returns The existing or newly created metadata map for the target.
 */
export function getOrCreatePropertyMap<T>(
  store: WeakMap<object, Map<MetadataPropertyKey, T>>,
  target: object,
): Map<MetadataPropertyKey, T> {
  let map = store.get(target);

  if (!map) {
    map = new Map<MetadataPropertyKey, T>();
    store.set(target, map);
  }

  return map;
}

/**
 * Merges two arrays into a single deduplicated array, preserving insertion order.
 * Deduplication uses reference equality (===), so two objects with identical shapes
 * are treated as distinct entries unless they are the exact same reference.
 * Returns `undefined` when both inputs are empty or absent.
 *
 * @param existing Existing values in insertion order.
 * @param values Additional values to merge.
 * @returns A deduplicated merged array, or `undefined` when both inputs are empty.
 */
export function mergeUnique<T>(existing: readonly T[] | undefined, values: readonly T[] | undefined): T[] | undefined {
  if (!existing?.length && !values?.length) {
    return undefined;
  }

  const merged = [...(existing ?? [])];
  const seen = new Set(merged);

  for (const value of values ?? []) {
    if (!seen.has(value)) {
      seen.add(value);
      merged.push(value);
    }
  }

  return merged;
}

/**
 * Reads the standard metadata bag stored directly on a target.
 *
 * @param target Target object that may own standard metadata.
 * @returns The metadata bag when present, otherwise `undefined`.
 */
export function getStandardMetadataBag(target: object): StandardMetadataBag | undefined {
  const metadata = Reflect.get(target, metadataSymbol);

  if (typeof metadata !== 'object' || metadata === null) {
    return undefined;
  }

  return metadata as StandardMetadataBag;
}

/**
 * Reads the standard metadata bag stored on a target's constructor.
 *
 * @param target Instance or prototype whose constructor metadata should be inspected.
 * @returns The constructor metadata bag when present, otherwise `undefined`.
 */
export function getStandardConstructorMetadataBag(target: object): StandardMetadataBag | undefined {
  const constructor = (target as { constructor?: Function }).constructor;

  return constructor ? getStandardMetadataBag(constructor) : undefined;
}

/**
 * Reads a constructor-level metadata record from the standard metadata bag.
 *
 * @param target Instance or prototype whose constructor metadata should be inspected.
 * @param key Symbol key of the stored metadata record.
 * @returns The stored record when present, otherwise `undefined`.
 */
export function getStandardConstructorMetadataRecord<T>(target: object, key: symbol): T | undefined {
  return getStandardConstructorMetadataBag(target)?.[key] as T | undefined;
}

/**
 * Reads a constructor-level property map from the standard metadata bag.
 *
 * @param target Instance or prototype whose constructor metadata should be inspected.
 * @param key Symbol key of the stored metadata map.
 * @returns The stored property map when present, otherwise `undefined`.
 */
export function getStandardConstructorMetadataMap<T>(target: object, key: symbol): Map<MetadataPropertyKey, T> | undefined {
  return getStandardConstructorMetadataRecord<Map<MetadataPropertyKey, T>>(target, key);
}

/**
 * Merges stored and standard metadata property keys while preserving first-seen order.
 *
 * @param stored Property keys from the explicit Fluo store.
 * @param standard Property keys from the standard metadata bag.
 * @returns A deduplicated ordered list of metadata property keys.
 */
export function mergeMetadataPropertyKeys<TStored, TStandard>(
  stored: ReadonlyMap<MetadataPropertyKey, TStored> | undefined,
  standard: ReadonlyMap<MetadataPropertyKey, TStandard> | undefined,
): MetadataPropertyKey[] {
  const keys: MetadataPropertyKey[] = [];
  const seen = new Set<MetadataPropertyKey>();

  for (const source of [stored, standard]) {
    if (!source) {
      continue;
    }

    for (const key of source.keys()) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }

  return keys;
}

/**
 * Appends a value into a property-keyed array store, creating the array on first write.
 *
 * @param store WeakMap-backed property store.
 * @param target Target object that owns the property map.
 * @param propertyKey Property key associated with the array entry.
 * @param value Value to append.
 */
export function appendPropertyMapValue<T>(
  store: WeakMap<object, Map<MetadataPropertyKey, T[]>>,
  target: object,
  propertyKey: MetadataPropertyKey,
  value: T,
): void {
  const map = getOrCreatePropertyMap(store, target);
  const existing = map.get(propertyKey);

  if (existing) {
    existing.push(value);
    return;
  }

  map.set(propertyKey, [value]);
}

/**
 * Appends a value into a WeakMap-backed array store, creating the array on first write.
 *
 * @param store WeakMap-backed array store.
 * @param target Target function used as the WeakMap key.
 * @param value Value to append.
 */
export function appendWeakMapValue<T>(store: WeakMap<Function, T[]>, target: Function, value: T): void {
  const existing = store.get(target);

  if (existing) {
    existing.push(value);
    return;
  }

  store.set(target, [value]);
}
