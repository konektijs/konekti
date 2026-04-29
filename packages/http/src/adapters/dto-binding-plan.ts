import { type Constructor, type MetadataPropertyKey, type MetadataSource } from '@fluojs/core';
import { getDtoBindingSchema, type DtoBindingSchemaEntry, type DtoFieldBindingMetadata } from '@fluojs/core/internal';

import type { FrameworkRequest } from '../types.js';

function toFieldName(propertyKey: MetadataPropertyKey): string {
  return typeof propertyKey === 'string' ? propertyKey : String(propertyKey);
}

function resolveSourceKey(propertyKey: MetadataPropertyKey, key?: string): string {
  return key ?? toFieldName(propertyKey);
}

function readHeader(request: FrameworkRequest, key: string): string | string[] | undefined {
  return request.headers[key.toLowerCase()] ?? request.headers[key];
}

export interface CompiledDtoBindingPlanEntry {
  readonly converter?: DtoFieldBindingMetadata['converter'];
  readonly fieldName: string;
  readonly optional: boolean;
  readonly propertyKey: MetadataPropertyKey;
  readonly read: (request: FrameworkRequest) => unknown;
  readonly source: MetadataSource;
  readonly sourceKey: string;
}

export interface CompiledDtoBindingPlan {
  readonly bodyKeys: ReadonlySet<string>;
  readonly entries: readonly CompiledDtoBindingPlanEntry[];
  readonly propertyKeys: readonly MetadataPropertyKey[];
}

const dtoBindingPlanCache = new WeakMap<Constructor, CompiledDtoBindingPlan>();

function createSourceReader(source: MetadataSource, sourceKey: string): (request: FrameworkRequest) => unknown {
  switch (source) {
    case 'path':
      return (request) => request.params[sourceKey];
    case 'query':
      return (request) => request.query[sourceKey];
    case 'header':
      return (request) => readHeader(request, sourceKey);
    case 'cookie':
      return (request) => request.cookies[sourceKey];
    case 'body':
      return (request) => (request.body as Record<string, unknown> | undefined)?.[sourceKey];
    default:
      return () => undefined;
  }
}

export function getCompiledDtoBindingPlan(dto: Constructor): CompiledDtoBindingPlan {
  const cached = dtoBindingPlanCache.get(dto);

  if (cached) {
    return cached;
  }

  const entries = getDtoBindingSchema(dto).map((entry: DtoBindingSchemaEntry) => {
    const sourceKey = resolveSourceKey(entry.propertyKey, entry.metadata.key);

    return {
      ...(entry.metadata.converter === undefined ? {} : { converter: entry.metadata.converter }),
      fieldName: toFieldName(entry.propertyKey),
      optional: entry.metadata.optional === true,
      propertyKey: entry.propertyKey,
      read: createSourceReader(entry.metadata.source, sourceKey),
      source: entry.metadata.source,
      sourceKey,
    } satisfies CompiledDtoBindingPlanEntry;
  });
  const next: CompiledDtoBindingPlan = {
    bodyKeys: new Set(entries.filter((entry: CompiledDtoBindingPlanEntry) => entry.source === 'body').map((entry: CompiledDtoBindingPlanEntry) => entry.sourceKey)),
    entries,
    propertyKeys: entries.map((entry: CompiledDtoBindingPlanEntry) => entry.propertyKey),
  };

  dtoBindingPlanCache.set(dto, next);
  return next;
}
