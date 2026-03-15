# @konekti/openapi

Decorator-based OpenAPI 3.1.0 document generation for konekti applications. Annotate controllers and handlers, then mount `OpenApiModule` to automatically serve a spec at `/openapi.json` and an optional Swagger UI at `/docs`.

## Installation

```bash
pnpm add @konekti/openapi
```

## Quick Start

```typescript
import { Controller, Get, Post, createHandlerMapping } from '@konekti/http';
import { bootstrapApplication, defineModule } from '@konekti/runtime';
import {
  ApiTag,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  OpenApiModule,
} from '@konekti/openapi';

@ApiTag('Users')
@Controller('/users')
class UsersController {
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Array of users' })
  @Get('/')
  listUsers() {
    return [];
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a user' })
  @ApiResponse({ status: 201, description: 'Created user' })
  @Post('/')
  createUser() {
    return {};
  }
}

const descriptors = createHandlerMapping([{ controllerToken: UsersController }]).descriptors;

class AppModule {}

defineModule(AppModule, {
  controllers: [UsersController],
  imports: [
    OpenApiModule.forRoot({
      descriptors,
      title: 'My API',
      version: '1.0.0',
      ui: true,               // enable Swagger UI at /docs
    }),
  ],
});

await bootstrapApplication({ rootModule: AppModule });
// GET /openapi.json  → OpenAPI 3.1.0 JSON document
// GET /docs          → Swagger UI
```

## Core API

### `OpenApiModule.forRoot(options)`

Registers two HTTP endpoints and returns a `ModuleType` to import into any module.

```typescript
interface OpenApiModuleOptions {
  title: string;
  version: string;
  descriptors?: readonly HandlerDescriptor[];  // handler descriptors from createHandlerMapping()
  ui?: boolean;                                 // serve Swagger UI at /docs (default: false)
}

class OpenApiModule {
  static forRoot(options: OpenApiModuleOptions): ModuleType;
}
```

**Endpoints served:**

| Route | Description |
|-------|-------------|
| `GET /openapi.json` | Always served. Returns the generated OpenAPI 3.1.0 JSON. |
| `GET /docs` | Served only when `ui: true`. Returns Swagger UI HTML. |

---

## Decorators

### `@ApiTag(tag)`

Attaches an OpenAPI tag to all operations on a controller class.

```typescript
@ApiTag('Products')
@Controller('/products')
class ProductsController { ... }
```

### `@ApiOperation(options)`

Documents a handler's operation object.

```typescript
interface ApiOperationOptions {
  summary?: string;
  description?: string;
}

@ApiOperation({ summary: 'Get product by ID', description: 'Returns a single product.' })
@Get('/:id')
getProduct() { ... }
```

### `@ApiResponse(options)`

Documents a response for a handler.

```typescript
interface ApiResponseOptions {
  status: number;
  description?: string;
  type?: Constructor;   // response body schema (future use)
}

@ApiResponse({ status: 200, description: 'The product' })
@ApiResponse({ status: 404, description: 'Not found' })
@Get('/:id')
getProduct() { ... }
```

Multiple `@ApiResponse` decorators can be stacked on the same handler.

### `@ApiBearerAuth()`

Marks a handler as requiring Bearer token authentication. Adds `bearerAuth` to the operation's `security` requirements and registers the `bearerAuth` security scheme in the generated document.

```typescript
@ApiBearerAuth()
@Post('/')
createProduct() { ... }
```

---

## Document Structure

The generated document follows OpenAPI 3.1.0:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "My API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "operationId": "UsersController_listUsers",
        "tags": ["Users"],
        "summary": "List all users",
        "responses": {
          "200": { "description": "Array of users" }
        }
      }
    }
  }
}
```

- **`operationId`** is auto-generated as `ControllerName_methodName`.
- **`tags`** default to the controller class name when `@ApiTag` is not used.
- **`security`** schemes are only included in the document when at least one handler uses `@ApiBearerAuth()`.

---

## Low-Level API

These are exported for advanced use cases (e.g. custom document generation pipelines).

### `buildOpenApiDocument(options)`

Builds the OpenAPI document directly from handler descriptors without mounting a server.

```typescript
interface BuildOpenApiDocumentOptions {
  descriptors: readonly HandlerDescriptor[];
  title: string;
  version: string;
}

function buildOpenApiDocument(options: BuildOpenApiDocumentOptions): OpenApiDocument;
```

### `OpenApiHandlerRegistry`

Singleton registry for sharing handler descriptors across module boundaries.

```typescript
function setOpenApiHandlerDescriptors(descriptors: readonly HandlerDescriptor[]): void;
function getOpenApiHandlerDescriptors(): HandlerDescriptor[];
```

### Metadata readers

Read decorator metadata programmatically:

```typescript
function getControllerTags(target: Function): string[] | undefined;
function getMethodApiMetadata(target: Function, propertyKey: MetadataPropertyKey): MethodApiMetadata | undefined;
```

```typescript
interface MethodApiMetadata {
  operation?: ApiOperationOptions;
  responses: ApiResponseMetadata[];
  security?: string[];
}
```

---

## Dependencies

| Package | Role |
|---------|------|
| `@konekti/core` | Shared metadata utilities |
| `@konekti/http` | Controller/routing decorators, `HandlerDescriptor` |
| `@konekti/runtime` | `defineModule`, `ModuleType` |
