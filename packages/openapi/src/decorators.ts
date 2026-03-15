import { metadataSymbol, type Constructor, type MetadataPropertyKey } from '@konekti/core';

export interface ApiOperationOptions {
  summary?: string;
  description?: string;
}

export interface ApiResponseOptions {
  status: number;
  description?: string;
  type?: Constructor;
}

export interface ApiOperationMetadata {
  summary?: string;
  description?: string;
}

export interface ApiResponseMetadata {
  status: number;
  description?: string;
  type?: Constructor;
}

export interface MethodApiMetadata {
  operation?: ApiOperationMetadata;
  responses: ApiResponseMetadata[];
  security?: string[];
}

const openApiControllerTagsKey = Symbol.for('konekti.openapi.controller-tags');
const openApiMethodOperationKey = Symbol.for('konekti.openapi.method-operation');
const openApiMethodResponsesKey = Symbol.for('konekti.openapi.method-responses');
const openApiMethodSecurityKey = Symbol.for('konekti.openapi.method-security');

type MetadataBag = Record<PropertyKey, unknown>;

function getMetadataBag(target: object): MetadataBag | undefined {
  void metadataSymbol;
  return (target as Record<symbol, MetadataBag | undefined>)[metadataSymbol];
}

/** Read tags registered via `@ApiTag` on a controller class. */
export function getControllerTags(target: Function): string[] | undefined {
  const bag = getMetadataBag(target);
  return bag?.[openApiControllerTagsKey] as string[] | undefined;
}

/** Read combined operation, response, and security metadata for a controller method. */
export function getMethodApiMetadata(target: Function, propertyKey: MetadataPropertyKey): MethodApiMetadata | undefined {
  const bag = getMetadataBag(target);

  const operationMap = bag?.[openApiMethodOperationKey] as Map<MetadataPropertyKey, ApiOperationMetadata> | undefined;
  const responsesMap = bag?.[openApiMethodResponsesKey] as Map<MetadataPropertyKey, ApiResponseMetadata[]> | undefined;
  const securityMap = bag?.[openApiMethodSecurityKey] as Map<MetadataPropertyKey, string[]> | undefined;

  const operation = operationMap?.get(propertyKey);
  const responses = responsesMap?.get(propertyKey);
  const security = securityMap?.get(propertyKey);

  if (!operation && !responses && !security) {
    return undefined;
  }

  return {
    operation,
    responses: responses ?? [],
    security,
  };
}

type ClassDecoratorFn = (value: Function, context: ClassDecoratorContext) => void;
type MethodDecoratorFn = (value: Function, context: ClassMethodDecoratorContext) => void;

/** Attach one or more OpenAPI tags to a controller class. */
export function ApiTag(tag: string): ClassDecoratorFn {
  return (_value, context) => {
    const bag = context.metadata as MetadataBag;
    const existing = (bag[openApiControllerTagsKey] as string[] | undefined) ?? [];
    bag[openApiControllerTagsKey] = [...existing, tag];
  };
}

/** Describe a controller method's OpenAPI operation (summary / description). */
export function ApiOperation(options: ApiOperationOptions): MethodDecoratorFn {
  return (_value, context) => {
    const bag = context.metadata as MetadataBag;
    let map = bag[openApiMethodOperationKey] as Map<MetadataPropertyKey, ApiOperationMetadata> | undefined;

    if (!map) {
      map = new Map();
      bag[openApiMethodOperationKey] = map;
    }

    map.set(context.name, {
      description: options.description,
      summary: options.summary,
    });
  };
}

/** Declare an expected HTTP response for a controller method. */
export function ApiResponse(options: ApiResponseOptions): MethodDecoratorFn {
  return (_value, context) => {
    const bag = context.metadata as MetadataBag;
    let map = bag[openApiMethodResponsesKey] as Map<MetadataPropertyKey, ApiResponseMetadata[]> | undefined;

    if (!map) {
      map = new Map();
      bag[openApiMethodResponsesKey] = map;
    }

    const existing = map.get(context.name) ?? [];

    map.set(context.name, [
      ...existing,
      { description: options.description, status: options.status, type: options.type },
    ]);
  };
}

/** Mark a controller method as requiring Bearer token authentication in the OpenAPI spec. */
export function ApiBearerAuth(): MethodDecoratorFn {
  return (_value, context) => {
    const bag = context.metadata as MetadataBag;
    let map = bag[openApiMethodSecurityKey] as Map<MetadataPropertyKey, string[]> | undefined;

    if (!map) {
      map = new Map();
      bag[openApiMethodSecurityKey] = map;
    }

    map.set(context.name, ['bearerAuth']);
  };
}
