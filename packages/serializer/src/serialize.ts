import { type MetadataPropertyKey } from '@konekti/core';

import { getClassSerializationOptions, getFieldSerializationMetadata, type SerializationFieldMetadata } from './metadata.js';

function isObjectLike(value: unknown): value is Record<string | symbol, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObjectLike(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function applyTransforms(value: unknown, metadata: SerializationFieldMetadata): unknown {
  let transformed = value;

  for (const transform of metadata.transforms ?? []) {
    transformed = transform(transformed);
  }

  return transformed;
}

function resolveCandidateKeys(
  value: Record<string | symbol, unknown>,
  fieldMetadata: Map<MetadataPropertyKey, SerializationFieldMetadata>,
  excludeExtraneous: boolean,
): MetadataPropertyKey[] {
  if (excludeExtraneous) {
    return [...fieldMetadata.entries()]
      .filter(([, metadata]) => metadata.exposed === true)
      .map(([propertyKey]) => propertyKey);
  }

  const keys = new Set<MetadataPropertyKey>([
    ...Object.keys(value),
    ...Object.getOwnPropertySymbols(value),
  ]);

  for (const [propertyKey, metadata] of fieldMetadata) {
    if (metadata.exposed === true) {
      keys.add(propertyKey);
    }
  }

  return [...keys];
}

function serializeClassInstance(value: Record<string | symbol, unknown>): Record<string | symbol, unknown> {
  const constructor = value.constructor as Function;
  const classOptions = getClassSerializationOptions(constructor);
  const fieldMetadata = getFieldSerializationMetadata(constructor);
  const hasMetadata = fieldMetadata.size > 0 || classOptions.excludeExtraneous === true;

  if (!hasMetadata) {
    if (isPlainObject(value)) {
      return serializeRecord(value);
    }

    return value;
  }

  const serialized: Record<string | symbol, unknown> = {};
  const candidateKeys = resolveCandidateKeys(value, fieldMetadata, classOptions.excludeExtraneous === true);

  for (const propertyKey of candidateKeys) {
    const metadata = fieldMetadata.get(propertyKey);

    if (metadata?.excluded) {
      continue;
    }

    const raw = value[propertyKey as keyof typeof value];

    if (raw === undefined && classOptions.excludeExtraneous === true && metadata?.exposed !== true) {
      continue;
    }

    const transformed = metadata ? applyTransforms(raw, metadata) : raw;
    serialized[propertyKey] = serialize(transformed);
  }

  return serialized;
}

function serializeRecord(value: Record<string | symbol, unknown>): Record<string | symbol, unknown> {
  const serialized: Record<string | symbol, unknown> = {};

  for (const [propertyKey, propertyValue] of Object.entries(value)) {
    serialized[propertyKey] = serialize(propertyValue);
  }

  return serialized;
}

export function serialize<T = unknown>(value: T): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serialize(item));
  }

  if (value instanceof Date) {
    return value;
  }

  if (isObjectLike(value)) {
    return serializeClassInstance(value);
  }

  return value;
}
