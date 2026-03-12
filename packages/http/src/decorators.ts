import {
  defineControllerMetadata,
  defineDtoFieldBindingMetadata,
  defineRouteMetadata,
  getControllerMetadata,
  getDtoFieldBindingMetadata,
  getRouteMetadata,
  type Constructor,
  type ControllerMetadata,
  type DtoFieldBindingMetadata,
  type MetadataPropertyKey,
  type MetadataSource,
  type RouteMetadata,
} from '@konekti/core';

import type { GuardLike, HttpMethod, InterceptorLike } from './types';

type StandardMetadataBag = Record<PropertyKey, unknown>;
type StandardFieldContext = ClassFieldDecoratorContext<object, unknown>;
type StandardClassDecoratorFn = (value: Function, context: ClassDecoratorContext) => void;
type StandardMethodDecoratorFn = (value: Function, context: ClassMethodDecoratorContext) => void;
type StandardFieldDecoratorFn = <This, Value>(value: undefined, context: ClassFieldDecoratorContext<This, Value>) => void;
type LegacyClassDecorator = (target: Function) => void;
type LegacyMethodDecorator = (target: object, propertyKey: MetadataPropertyKey) => void;
type LegacyFieldDecorator = (target: object, propertyKey: MetadataPropertyKey) => void;
type MethodDecoratorLike = LegacyMethodDecorator & StandardMethodDecoratorFn;
type ClassDecoratorLike = LegacyClassDecorator & StandardClassDecoratorFn;
type ClassOrMethodDecoratorLike = (LegacyClassDecorator & LegacyMethodDecorator) & StandardClassDecoratorFn & StandardMethodDecoratorFn;
type FieldDecoratorLike = LegacyFieldDecorator & StandardFieldDecoratorFn;

const standardControllerMetadataKey = Symbol.for('konekti.standard.controller');
const standardRouteMetadataKey = Symbol.for('konekti.standard.route');
const standardDtoBindingMetadataKey = Symbol.for('konekti.standard.dto-binding');

interface StandardRouteMetadataRecord {
  guards?: GuardLike[];
  interceptors?: InterceptorLike[];
  method?: HttpMethod;
  path?: string;
  request?: Constructor;
  successStatus?: number;
}

function mergeUnique<T>(existing: T[] | undefined, values: T[]): T[] {
  const merged = [...(existing ?? [])];

  for (const value of values) {
    if (!merged.includes(value)) {
      merged.push(value);
    }
  }

  return merged;
}

function getPendingMethodMap<T>(store: WeakMap<object, Map<MetadataPropertyKey, T[]>>, target: object) {
  let map = store.get(target);

  if (!map) {
    map = new Map<MetadataPropertyKey, T[]>();
    store.set(target, map);
  }

  return map;
}

function getPendingMethodValueMap<T>(store: WeakMap<object, Map<MetadataPropertyKey, T>>, target: object) {
  let map = store.get(target);

  if (!map) {
    map = new Map<MetadataPropertyKey, T>();
    store.set(target, map);
  }

  return map;
}

function updateControllerMetadata(
  target: Function,
  updater: (metadata: ControllerMetadata | undefined) => ControllerMetadata,
): void {
  defineControllerMetadata(target, updater(getControllerMetadata(target)));
}

function updateRouteMetadata(
  target: object,
  propertyKey: MetadataPropertyKey,
  updater: (metadata: RouteMetadata | undefined) => RouteMetadata,
): void {
  defineRouteMetadata(target, propertyKey, updater(getRouteMetadata(target, propertyKey)));
}

function appendPendingMethodMetadata<T>(
  store: WeakMap<object, Map<MetadataPropertyKey, T[]>>,
  target: object,
  propertyKey: MetadataPropertyKey,
  values: T[],
): void {
  const map = getPendingMethodMap(store, target);
  map.set(propertyKey, mergeUnique(map.get(propertyKey), values));
}

function drainPendingMethodMetadata<T>(
  store: WeakMap<object, Map<MetadataPropertyKey, T[]>>,
  target: object,
  propertyKey: MetadataPropertyKey,
): T[] {
  const values = store.get(target)?.get(propertyKey) ?? [];
  store.get(target)?.delete(propertyKey);

  return values;
}

function drainPendingMethodValue<T>(
  store: WeakMap<object, Map<MetadataPropertyKey, T>>,
  target: object,
  propertyKey: MetadataPropertyKey,
): T | undefined {
  const value = store.get(target)?.get(propertyKey);
  store.get(target)?.delete(propertyKey);

  return value;
}

function appendPendingMethodValue<T>(
  store: WeakMap<object, Map<MetadataPropertyKey, T>>,
  target: object,
  propertyKey: MetadataPropertyKey,
  value: T,
): void {
  getPendingMethodValueMap(store, target).set(propertyKey, value);
}

function mergeDtoBindingMetadata(
  target: object,
  propertyKey: MetadataPropertyKey,
  partial: Partial<DtoFieldBindingMetadata>,
): void {
  const existing = getDtoFieldBindingMetadata(target, propertyKey);
  const pendingMap = getPendingMethodValueMap(pendingDtoFieldBindings, target);
  const pending = pendingMap.get(propertyKey);
  const merged = {
    ...pending,
    ...existing,
    ...partial,
  };

  if (!merged.source) {
    pendingMap.set(propertyKey, merged);
    return;
  }

  defineDtoFieldBindingMetadata(target, propertyKey, {
    key: merged.key,
    optional: merged.optional,
    source: merged.source,
  });
  pendingMap.delete(propertyKey);
}

const pendingControllerGuards = new WeakMap<Function, GuardLike[]>();
const pendingControllerInterceptors = new WeakMap<Function, InterceptorLike[]>();
const pendingMethodGuards = new WeakMap<object, Map<MetadataPropertyKey, GuardLike[]>>();
const pendingMethodInterceptors = new WeakMap<object, Map<MetadataPropertyKey, InterceptorLike[]>>();
const pendingMethodRequests = new WeakMap<object, Map<MetadataPropertyKey, Constructor>>();
const pendingMethodSuccessStatus = new WeakMap<object, Map<MetadataPropertyKey, number>>();
const pendingDtoFieldBindings = new WeakMap<object, Map<MetadataPropertyKey, Partial<DtoFieldBindingMetadata>>>();

function isStandardClassContext(context: unknown): context is ClassDecoratorContext {
  return typeof context === 'object' && context !== null && 'kind' in context && context.kind === 'class';
}

function isStandardMethodContext(context: unknown): context is ClassMethodDecoratorContext {
  return typeof context === 'object' && context !== null && 'kind' in context && context.kind === 'method';
}

function isStandardFieldContext(context: unknown): context is StandardFieldContext {
  return typeof context === 'object' && context !== null && 'kind' in context && context.kind === 'field';
}

function getStandardMetadataBag(metadata: unknown): StandardMetadataBag {
  return metadata as StandardMetadataBag;
}

function getStandardControllerRecord(metadata: unknown): Partial<ControllerMetadata> {
  const bag = getStandardMetadataBag(metadata);
  const current = bag[standardControllerMetadataKey] as Partial<ControllerMetadata> | undefined;

  if (current) {
    return current;
  }

  const created: Partial<ControllerMetadata> = {};
  bag[standardControllerMetadataKey] = created;
  return created;
}

function getStandardRouteMap(metadata: unknown): Map<MetadataPropertyKey, StandardRouteMetadataRecord> {
  const bag = getStandardMetadataBag(metadata);
  const current = bag[standardRouteMetadataKey] as Map<MetadataPropertyKey, StandardRouteMetadataRecord> | undefined;

  if (current) {
    return current;
  }

  const created = new Map<MetadataPropertyKey, StandardRouteMetadataRecord>();
  bag[standardRouteMetadataKey] = created;
  return created;
}

function getStandardRouteRecord(metadata: unknown, propertyKey: MetadataPropertyKey): StandardRouteMetadataRecord {
  const routeMap = getStandardRouteMap(metadata);
  const current = routeMap.get(propertyKey);

  if (current) {
    return current;
  }

  const created: StandardRouteMetadataRecord = {};
  routeMap.set(propertyKey, created);
  return created;
}

function getStandardDtoBindingMap(metadata: unknown): Map<MetadataPropertyKey, Partial<DtoFieldBindingMetadata>> {
  const bag = getStandardMetadataBag(metadata);
  const current = bag[standardDtoBindingMetadataKey] as Map<MetadataPropertyKey, Partial<DtoFieldBindingMetadata>> | undefined;

  if (current) {
    return current;
  }

  const created = new Map<MetadataPropertyKey, Partial<DtoFieldBindingMetadata>>();
  bag[standardDtoBindingMetadataKey] = created;
  return created;
}

function mergeStandardDtoBinding(
  metadata: unknown,
  propertyKey: MetadataPropertyKey,
  partial: Partial<DtoFieldBindingMetadata>,
): void {
  const map = getStandardDtoBindingMap(metadata);
  map.set(propertyKey, {
    ...map.get(propertyKey),
    ...partial,
  });
}

function applyClassOrMethodCollectionDecorator<T>(
  targetOrValue: object,
  contextOrPropertyKey: unknown,
  values: T[],
  applyStandardMethod: (context: ClassMethodDecoratorContext, values: T[]) => void,
  applyStandardClass: (context: ClassDecoratorContext, values: T[]) => void,
  applyLegacyMethod: (target: object, propertyKey: MetadataPropertyKey, values: T[]) => void,
  applyLegacyClass: (target: Function, values: T[]) => void,
): void {
  if (isStandardMethodContext(contextOrPropertyKey)) {
    applyStandardMethod(contextOrPropertyKey, values);
    return;
  }

  if (isStandardClassContext(contextOrPropertyKey)) {
    applyStandardClass(contextOrPropertyKey, values);
    return;
  }

  if (contextOrPropertyKey !== undefined) {
    applyLegacyMethod(targetOrValue, contextOrPropertyKey as MetadataPropertyKey, values);
    return;
  }

  applyLegacyClass(targetOrValue as Function, values);
}

function createRouteValueDecorator<T>(
  applyStandard: (record: StandardRouteMetadataRecord, value: T) => void,
  applyLegacy: (target: object, propertyKey: MetadataPropertyKey, value: T) => void,
) {
  return (value: T): MethodDecoratorLike => {
    const decorator = (targetOrValue: object, contextOrPropertyKey: unknown) => {
      if (isStandardMethodContext(contextOrPropertyKey)) {
        applyStandard(getStandardRouteRecord(contextOrPropertyKey.metadata, contextOrPropertyKey.name), value);
        return;
      }

      applyLegacy(targetOrValue, contextOrPropertyKey as MetadataPropertyKey, value);
    };

    return decorator as MethodDecoratorLike;
  };
}

function createRouteDecorator(method: HttpMethod) {
  return (path: string): MethodDecoratorLike => {
    const decorator = (targetOrValue: object, contextOrPropertyKey: unknown) => {
      if (isStandardMethodContext(contextOrPropertyKey)) {
        const route = getStandardRouteRecord(contextOrPropertyKey.metadata, contextOrPropertyKey.name);
        route.method = method;
        route.path = path;
        return;
      }

      const propertyKey = contextOrPropertyKey as MetadataPropertyKey;
      const target = targetOrValue as object;
      const guards = drainPendingMethodMetadata(pendingMethodGuards, target, propertyKey);
      const interceptors = drainPendingMethodMetadata(pendingMethodInterceptors, target, propertyKey);
      const request = drainPendingMethodValue(pendingMethodRequests, target, propertyKey);
      const successStatus = drainPendingMethodValue(pendingMethodSuccessStatus, target, propertyKey);

      updateRouteMetadata(target, propertyKey, (existing) => ({
        guards: [...(existing?.guards ?? []), ...guards],
        interceptors: [...(existing?.interceptors ?? []), ...interceptors],
        method,
        path,
        request: request ?? existing?.request,
        successStatus: successStatus ?? existing?.successStatus,
      }));
    };

    return decorator as MethodDecoratorLike;
  };
}

export function Controller(basePath = ''): ClassDecoratorLike {
  const decorator = (target: Function, context?: ClassDecoratorContext) => {
    if (isStandardClassContext(context)) {
      getStandardControllerRecord(context.metadata).basePath = basePath;
      return;
    }

    defineControllerMetadata(target, {
      basePath,
      guards: mergeUnique(getControllerMetadata(target)?.guards as GuardLike[] | undefined, pendingControllerGuards.get(target) ?? []),
      interceptors: mergeUnique(
        getControllerMetadata(target)?.interceptors as InterceptorLike[] | undefined,
        pendingControllerInterceptors.get(target) ?? [],
      ),
    });

    pendingControllerGuards.delete(target);
    pendingControllerInterceptors.delete(target);
  };

  return decorator as ClassDecoratorLike;
}

export const Get = createRouteDecorator('GET');
export const Post = createRouteDecorator('POST');
export const Put = createRouteDecorator('PUT');
export const Patch = createRouteDecorator('PATCH');
export const Delete = createRouteDecorator('DELETE');
export const Options = createRouteDecorator('OPTIONS');
export const Head = createRouteDecorator('HEAD');

const createRequestDtoDecorator = createRouteValueDecorator<Constructor>(
  (record, dto) => {
    record.request = dto;
  },
  (target, propertyKey, dto) => {
    const existing = getRouteMetadata(target, propertyKey);

    if (existing) {
      updateRouteMetadata(target, propertyKey, (metadata) => ({
        ...metadata!,
        request: dto,
      }));
      return;
    }

    appendPendingMethodValue(pendingMethodRequests, target, propertyKey, dto);
  },
);

const createSuccessStatusDecorator = createRouteValueDecorator<number>(
  (record, status) => {
    record.successStatus = status;
  },
  (target, propertyKey, status) => {
    const existing = getRouteMetadata(target, propertyKey);

    if (existing) {
      updateRouteMetadata(target, propertyKey, (metadata) => ({
        ...metadata!,
        successStatus: status,
      }));
      return;
    }

    appendPendingMethodValue(pendingMethodSuccessStatus, target, propertyKey, status);
  },
);

export const RequestDto = createRequestDtoDecorator;

export const SuccessStatus = createSuccessStatusDecorator;

function createDtoFieldDecorator(source: MetadataSource) {
  return (key?: string): FieldDecoratorLike => {
    const decorator = (targetOrValue: object | undefined, contextOrPropertyKey: unknown) => {
      if (isStandardFieldContext(contextOrPropertyKey)) {
        mergeStandardDtoBinding(contextOrPropertyKey.metadata, contextOrPropertyKey.name, {
          key,
          source,
        });
        return;
      }

      mergeDtoBindingMetadata(targetOrValue as object, contextOrPropertyKey as MetadataPropertyKey, {
        key,
        source,
      });
    };

    return decorator as FieldDecoratorLike;
  };
}

export const FromPath = createDtoFieldDecorator('path');
export const FromQuery = createDtoFieldDecorator('query');
export const FromHeader = createDtoFieldDecorator('header');
export const FromCookie = createDtoFieldDecorator('cookie');
export const FromBody = createDtoFieldDecorator('body');

export function Optional(): FieldDecoratorLike {
  const decorator = (targetOrValue: object | undefined, contextOrPropertyKey: unknown) => {
    if (isStandardFieldContext(contextOrPropertyKey)) {
      mergeStandardDtoBinding(contextOrPropertyKey.metadata, contextOrPropertyKey.name, { optional: true });
      return;
    }

    mergeDtoBindingMetadata(targetOrValue as object, contextOrPropertyKey as MetadataPropertyKey, { optional: true });
  };

  return decorator as FieldDecoratorLike;
}

export function UseGuard(...guards: GuardLike[]): ClassOrMethodDecoratorLike {
  const decorator = (targetOrValue: object, contextOrPropertyKey?: unknown) => {
    applyClassOrMethodCollectionDecorator(
      targetOrValue,
      contextOrPropertyKey,
      guards,
      (context, nextGuards) => {
        const route = getStandardRouteRecord(context.metadata, context.name);
        route.guards = mergeUnique(route.guards, nextGuards);
      },
      (context, nextGuards) => {
        const controller = getStandardControllerRecord(context.metadata);
        controller.guards = mergeUnique(controller.guards as GuardLike[] | undefined, nextGuards);
      },
      (target, propertyKey, nextGuards) => {
        const existing = getRouteMetadata(target, propertyKey);

        if (existing) {
          updateRouteMetadata(target, propertyKey, (metadata) => ({
            ...metadata!,
            guards: mergeUnique(metadata?.guards as GuardLike[] | undefined, nextGuards),
          }));
          return;
        }

        appendPendingMethodMetadata(pendingMethodGuards, target, propertyKey, nextGuards);
      },
      (target, nextGuards) => {
        const existing = getControllerMetadata(target);

        if (existing) {
          updateControllerMetadata(target, (metadata) => ({
            ...metadata!,
            guards: mergeUnique(metadata?.guards as GuardLike[] | undefined, nextGuards),
          }));
          return;
        }

        pendingControllerGuards.set(target, mergeUnique(pendingControllerGuards.get(target), nextGuards));
      },
    );
  };

  return decorator as ClassOrMethodDecoratorLike;
}

export function UseInterceptor(...interceptors: InterceptorLike[]): ClassOrMethodDecoratorLike {
  const decorator = (targetOrValue: object, contextOrPropertyKey?: unknown) => {
    applyClassOrMethodCollectionDecorator(
      targetOrValue,
      contextOrPropertyKey,
      interceptors,
      (context, nextInterceptors) => {
        const route = getStandardRouteRecord(context.metadata, context.name);
        route.interceptors = mergeUnique(route.interceptors, nextInterceptors);
      },
      (context, nextInterceptors) => {
        const controller = getStandardControllerRecord(context.metadata);
        controller.interceptors = mergeUnique(controller.interceptors as InterceptorLike[] | undefined, nextInterceptors);
      },
      (target, propertyKey, nextInterceptors) => {
        const existing = getRouteMetadata(target, propertyKey);

        if (existing) {
          updateRouteMetadata(target, propertyKey, (metadata) => ({
            ...metadata!,
            interceptors: mergeUnique(metadata?.interceptors as InterceptorLike[] | undefined, nextInterceptors),
          }));
          return;
        }

        appendPendingMethodMetadata(pendingMethodInterceptors, target, propertyKey, nextInterceptors);
      },
      (target, nextInterceptors) => {
        const existing = getControllerMetadata(target);

        if (existing) {
          updateControllerMetadata(target, (metadata) => ({
            ...metadata!,
            interceptors: mergeUnique(metadata?.interceptors as InterceptorLike[] | undefined, nextInterceptors),
          }));
          return;
        }

        pendingControllerInterceptors.set(target, mergeUnique(pendingControllerInterceptors.get(target), nextInterceptors));
      },
    );
  };

  return decorator as ClassOrMethodDecoratorLike;
}
