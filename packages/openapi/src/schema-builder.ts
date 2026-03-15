import type { HandlerDescriptor, HttpMethod } from '@konekti/http';
import { getControllerTags, getMethodApiMetadata } from './decorators.js';

type OpenApiOperationMethod = Lowercase<HttpMethod>;

export interface OpenApiInfoObject {
  title: string;
  version: string;
}

export interface OpenApiResponseObject {
  description: string;
}

export interface OpenApiSecurityRequirementObject {
  [scheme: string]: string[];
}

export interface OpenApiOperationObject {
  operationId: string;
  tags: string[];
  summary?: string;
  description?: string;
  responses: Record<string, OpenApiResponseObject>;
  security?: OpenApiSecurityRequirementObject[];
}

export interface OpenApiPathItemObject {
  [method: string]: OpenApiOperationObject | undefined;
}

export interface OpenApiDocument {
  openapi: '3.1.0';
  info: OpenApiInfoObject;
  paths: Record<string, OpenApiPathItemObject>;
}

export interface BuildOpenApiDocumentOptions {
  descriptors: readonly HandlerDescriptor[];
  title: string;
  version: string;
}

function resolveControllerTags(descriptor: HandlerDescriptor): string[] {
  const decorated = getControllerTags(descriptor.controllerToken);
  if (decorated && decorated.length > 0) {
    return decorated;
  }
  return [descriptor.controllerToken.name || 'Controller'];
}

function normalizeOperationId(descriptor: HandlerDescriptor): string {
  const tag = resolveControllerTags(descriptor)[0] ?? 'Controller';
  const path = descriptor.route.path.replaceAll('/', '_').replaceAll(':', '').replaceAll('-', '_');

  return `${tag}_${descriptor.methodName}_${descriptor.route.method.toLowerCase()}${path}`;
}

export function buildOpenApiDocument(options: BuildOpenApiDocumentOptions): OpenApiDocument {
  const paths: Record<string, OpenApiPathItemObject> = {};

  for (const descriptor of options.descriptors) {
    const path = descriptor.route.path;
    const method = descriptor.route.method.toLowerCase() as OpenApiOperationMethod;
    const pathItem = paths[path] ?? {};

    const tags = resolveControllerTags(descriptor);
    const methodMeta = getMethodApiMetadata(descriptor.controllerToken, descriptor.methodName);

    const responses: Record<string, OpenApiResponseObject> = {};

    if (methodMeta?.responses && methodMeta.responses.length > 0) {
      for (const resp of methodMeta.responses) {
        responses[String(resp.status)] = {
          description: resp.description ?? 'OK',
        };
      }
    } else {
      responses['200'] = { description: 'OK' };
    }

    const security: OpenApiSecurityRequirementObject[] | undefined =
      methodMeta?.security && methodMeta.security.length > 0
        ? methodMeta.security.map((scheme) => ({ [scheme]: [] }))
        : undefined;

    const operation: OpenApiOperationObject = {
      operationId: normalizeOperationId(descriptor),
      responses,
      tags,
      ...(methodMeta?.operation?.summary !== undefined && { summary: methodMeta.operation.summary }),
      ...(methodMeta?.operation?.description !== undefined && { description: methodMeta.operation.description }),
      ...(security !== undefined && { security }),
    };

    pathItem[method] = operation;
    paths[path] = pathItem;
  }

  return {
    info: {
      title: options.title,
      version: options.version,
    },
    openapi: '3.1.0',
    paths,
  };
}
