import type { MetadataPropertyKey, MetadataSource } from './types';

export interface ModuleMetadata {
  imports?: unknown[];
  providers?: unknown[];
  controllers?: unknown[];
  exports?: unknown[];
}

export interface ControllerMetadata {
  basePath: string;
  guards?: unknown[];
  interceptors?: unknown[];
}

export interface RouteMetadata {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  path: string;
  request?: new (...args: never[]) => unknown;
  guards?: unknown[];
  interceptors?: unknown[];
  successStatus?: number;
}

export interface DtoFieldBindingMetadata {
  source: MetadataSource;
  key?: string;
  optional?: boolean;
}

export interface InjectionMetadata {
  token: unknown;
  optional?: boolean;
}

export const metadataKeys = {
  module: Symbol.for('konekti.metadata.module'),
  controller: Symbol.for('konekti.metadata.controller'),
  route: Symbol.for('konekti.metadata.route'),
  dtoFieldBinding: Symbol.for('konekti.metadata.dto-field-binding'),
  injection: Symbol.for('konekti.metadata.injection'),
} as const;

const moduleMetadataStore = new WeakMap<Function, ModuleMetadata>();
const controllerMetadataStore = new WeakMap<Function, ControllerMetadata>();
const routeMetadataStore = new WeakMap<object, Map<MetadataPropertyKey, RouteMetadata>>();
const dtoFieldBindingStore = new WeakMap<object, Map<MetadataPropertyKey, DtoFieldBindingMetadata>>();
const injectionMetadataStore = new WeakMap<object, Map<MetadataPropertyKey, InjectionMetadata>>();

function cloneRouteMetadata(metadata: RouteMetadata): RouteMetadata {
  return {
    ...metadata,
    guards: metadata.guards ? [...metadata.guards] : undefined,
    interceptors: metadata.interceptors ? [...metadata.interceptors] : undefined,
  };
}

function getOrCreatePropertyMap<T>(
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
 * Stores module metadata on a module class.
 */
export function defineModuleMetadata(target: Function, metadata: ModuleMetadata): void {
  moduleMetadataStore.set(target, {
    imports: metadata.imports ? [...metadata.imports] : undefined,
    providers: metadata.providers ? [...metadata.providers] : undefined,
    controllers: metadata.controllers ? [...metadata.controllers] : undefined,
    exports: metadata.exports ? [...metadata.exports] : undefined,
  });
}

/**
 * Reads normalized module metadata from a module class.
 */
export function getModuleMetadata(target: Function): ModuleMetadata | undefined {
  const metadata = moduleMetadataStore.get(target);

  return metadata
    ? {
        imports: metadata.imports ? [...metadata.imports] : undefined,
        providers: metadata.providers ? [...metadata.providers] : undefined,
        controllers: metadata.controllers ? [...metadata.controllers] : undefined,
        exports: metadata.exports ? [...metadata.exports] : undefined,
      }
    : undefined;
}

/**
 * Stores controller-level metadata on a controller class.
 */
export function defineControllerMetadata(target: Function, metadata: ControllerMetadata): void {
  controllerMetadataStore.set(target, {
    ...metadata,
    guards: metadata.guards ? [...metadata.guards] : undefined,
    interceptors: metadata.interceptors ? [...metadata.interceptors] : undefined,
  });
}

/**
 * Reads normalized controller metadata from a controller class.
 */
export function getControllerMetadata(target: Function): ControllerMetadata | undefined {
  const metadata = controllerMetadataStore.get(target);

  return metadata
    ? {
        ...metadata,
        guards: metadata.guards ? [...metadata.guards] : undefined,
        interceptors: metadata.interceptors ? [...metadata.interceptors] : undefined,
      }
    : undefined;
}

/**
 * Stores route metadata on a controller prototype method.
 */
export function defineRouteMetadata(
  target: object,
  propertyKey: MetadataPropertyKey,
  metadata: RouteMetadata,
): void {
  getOrCreatePropertyMap(routeMetadataStore, target).set(propertyKey, cloneRouteMetadata(metadata));
}

/**
 * Reads normalized route metadata from a controller prototype method.
 */
export function getRouteMetadata(
  target: object,
  propertyKey: MetadataPropertyKey,
): RouteMetadata | undefined {
  const metadata = routeMetadataStore.get(target)?.get(propertyKey);

  return metadata ? cloneRouteMetadata(metadata) : undefined;
}

/**
 * Stores DTO field binding metadata on a DTO prototype field.
 */
export function defineDtoFieldBindingMetadata(
  target: object,
  propertyKey: MetadataPropertyKey,
  metadata: DtoFieldBindingMetadata,
): void {
  getOrCreatePropertyMap(dtoFieldBindingStore, target).set(propertyKey, { ...metadata });
}

/**
 * Stores injection metadata on a class field.
 */
export function defineInjectionMetadata(
  target: object,
  propertyKey: MetadataPropertyKey,
  metadata: InjectionMetadata,
): void {
  getOrCreatePropertyMap(injectionMetadataStore, target).set(propertyKey, { ...metadata });
}

/**
 * Builds a normalized DTO binding schema from stored field metadata.
 */
export function getDtoBindingSchema(dto: new (...args: never[]) => unknown) {
  const map = dtoFieldBindingStore.get(dto.prototype) ?? new Map<MetadataPropertyKey, DtoFieldBindingMetadata>();

  return Array.from(map.entries()).map(([propertyKey, metadata]) => ({
    propertyKey,
    metadata: { ...metadata },
  }));
}

/**
 * Builds a normalized injection schema from stored field metadata.
 */
export function getInjectionSchema(target: object) {
  const map = injectionMetadataStore.get(target) ?? new Map<MetadataPropertyKey, InjectionMetadata>();

  return Array.from(map.entries()).map(([propertyKey, metadata]) => ({
    propertyKey,
    metadata: { ...metadata },
  }));
}
