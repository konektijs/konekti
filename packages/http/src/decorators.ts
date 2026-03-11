import {
  defineControllerMetadata,
  defineRouteMetadata,
  getControllerMetadata,
  getRouteMetadata,
  type ControllerMetadata,
  type MetadataPropertyKey,
  type RouteMetadata,
} from '@konekti/core';

import type { GuardLike, InterceptorLike, HttpMethod } from './types';

const pendingControllerGuards = new WeakMap<Function, GuardLike[]>();
const pendingControllerInterceptors = new WeakMap<Function, InterceptorLike[]>();
const pendingMethodGuards = new WeakMap<object, Map<MetadataPropertyKey, GuardLike[]>>();
const pendingMethodInterceptors = new WeakMap<object, Map<MetadataPropertyKey, InterceptorLike[]>>();

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

function createRouteDecorator(method: HttpMethod) {
  return (path: string) => (target: object, propertyKey: MetadataPropertyKey) => {
    const guards = drainPendingMethodMetadata(pendingMethodGuards, target, propertyKey);
    const interceptors = drainPendingMethodMetadata(pendingMethodInterceptors, target, propertyKey);

    updateRouteMetadata(target, propertyKey, (existing) => ({
      guards: [...(existing?.guards ?? []), ...guards],
      interceptors: [...(existing?.interceptors ?? []), ...interceptors],
      method,
      path,
      request: existing?.request,
      successStatus: existing?.successStatus,
    }));
  };
}

export function Controller(basePath = ''): ClassDecorator {
  return (target) => {
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
}

export const Get = createRouteDecorator('GET');
export const Post = createRouteDecorator('POST');
export const Put = createRouteDecorator('PUT');
export const Patch = createRouteDecorator('PATCH');
export const Delete = createRouteDecorator('DELETE');
export const Options = createRouteDecorator('OPTIONS');
export const Head = createRouteDecorator('HEAD');

export function UseGuard(...guards: GuardLike[]): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: string | symbol) => {
    if (propertyKey !== undefined) {
      const existing = getRouteMetadata(target, propertyKey);

      if (existing) {
        updateRouteMetadata(target, propertyKey, (metadata) => ({
          ...metadata!,
          guards: mergeUnique(metadata?.guards as GuardLike[] | undefined, guards),
        }));
        return;
      }

      appendPendingMethodMetadata(pendingMethodGuards, target, propertyKey, guards);
      return;
    }

    const controllerTarget = target as Function;
    const existing = getControllerMetadata(controllerTarget);

    if (existing) {
      updateControllerMetadata(controllerTarget, (metadata) => ({
        ...metadata!,
        guards: mergeUnique(metadata?.guards as GuardLike[] | undefined, guards),
      }));
      return;
    }

    pendingControllerGuards.set(controllerTarget, mergeUnique(pendingControllerGuards.get(controllerTarget), guards));
  };
}

export function UseInterceptor(...interceptors: InterceptorLike[]): ClassDecorator & MethodDecorator {
  return (target: object, propertyKey?: string | symbol) => {
    if (propertyKey !== undefined) {
      const existing = getRouteMetadata(target, propertyKey);

      if (existing) {
        updateRouteMetadata(target, propertyKey, (metadata) => ({
          ...metadata!,
          interceptors: mergeUnique(metadata?.interceptors as InterceptorLike[] | undefined, interceptors),
        }));
        return;
      }

      appendPendingMethodMetadata(pendingMethodInterceptors, target, propertyKey, interceptors);
      return;
    }

    const controllerTarget = target as Function;
    const existing = getControllerMetadata(controllerTarget);

    if (existing) {
      updateControllerMetadata(controllerTarget, (metadata) => ({
        ...metadata!,
        interceptors: mergeUnique(metadata?.interceptors as InterceptorLike[] | undefined, interceptors),
      }));
      return;
    }

    pendingControllerInterceptors.set(
      controllerTarget,
      mergeUnique(pendingControllerInterceptors.get(controllerTarget), interceptors),
    );
  };
}
