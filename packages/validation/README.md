# @konekti/validation

<p><strong><kbd>English</kbd></strong> <a href="./README.ko.md"><kbd>한국어</kbd></a></p>

Input-side validation and materialization engine for Konekti.

`@konekti/validation` focuses on the **input** boundary. It handles turning raw, untyped payloads into validated, typed DTO instances. While `@konekti/serialization` shapes the outgoing response, this package ensures incoming data is safe and correctly materialized.

## The Mental Model

Konekti splits data handling into two distinct phases:

1. **Validation (Input)**: Materializing raw payloads into class instances and enforcing rules.
2. **Serialization (Output)**: Shaping class instances back into plain data for the response.

`@konekti/validation` owns the validation rules, the materialization engine, Standard Schema compatibility (Zod/Valibot), and mapped DTO helpers.

## Relationship with @konekti/http

This package is transport-agnostic. It does not know about HTTP bodies or query strings.

In a Konekti application, `@konekti/http` uses this package to:
1. Extract raw data from the request (body, query, params).
2. Use `DefaultValidator.materialize()` to create and validate a DTO instance.
3. Pass the resulting typed instance to your controller handler.

## Installation

```bash
pnpm add @konekti/validation
```

## Core Features

- **Field-level decorators**: `@IsString()`, `@MinLength()`, `@ValidateNested()`, etc.
- **Class-level invariants**: `@ValidateClass(...)` for complex rules or Standard Schema hooks.
- **Materialization**: `materialize()` hydrates plain objects into typed class instances recursively.
- **Validation**: `validate()` checks existing instances against their decorators.
- **Standard Schema**: Direct support for Zod, Valibot, and ArkType via `@ValidateClass`.
- **Mapped Types**: `PickType`, `OmitType`, `PartialType`, and `IntersectionType` that preserve metadata.

## Quick Start

```typescript
import { IsEmail, IsString, MinLength, DefaultValidator, DtoValidationError } from '@konekti/validation';

class CreateUserDto {
  @IsEmail()
  email = '';

  @IsString()
  @MinLength(2)
  name = '';
}

const validator = new DefaultValidator();

// 1. Materialize: Plain object -> Typed Instance + Validation
try {
  const dto = await validator.materialize(
    { email: 'hello@example.com', name: 'Konekti' },
    CreateUserDto,
  );
  console.log(dto instanceof CreateUserDto); // true
} catch (err) {
  if (err instanceof DtoValidationError) {
    console.log(err.issues);
  }
}
```

### Important: No Implicit Coercion

`materialize()` enforces the schema strictly. It does **not** perform implicit scalar coercion (e.g., turning the string `"42"` into the number `42`).

```typescript
import { DefaultValidator, IsNumber } from '@konekti/validation';

class GetUserDto {
  @IsNumber()
  id = 0;
}

const validator = new DefaultValidator();

// This throws DtoValidationError because '42' is a string.
await validator.materialize({ id: '42' }, GetUserDto);
```

If your transport layer (like HTTP query params) provides strings that should be numbers, convert them explicitly before calling the validator. In a Konekti HTTP app, that conversion belongs in the binding/transport layer, not in `@konekti/validation`.

## API Reference

### DefaultValidator

The primary engine for both materialization and validation.

```typescript
class DefaultValidator implements Validator {
  // Validates an existing instance. Does not hydrate nested objects.
  async validate(value: unknown, target: Constructor): Promise<void>;

  // Hydrates a plain object into a class instance and then validates it.
  async materialize<T>(value: unknown, target: Constructor<T>): Promise<T>;
}
```

### validate vs materialize

| Feature | `validate` | `materialize` |
|---|---|---|
| **Primary Goal** | Check existing objects | Create + Check new objects |
| **Input** | DTO-like instance | Raw plain object |
| **Output** | `Promise<void>` | `Promise<T>` (the instance) |
| **Recursion** | No | Yes (hydrates nested DTOs) |

### DtoValidationError & ValidationIssue

When validation fails, a `DtoValidationError` is thrown containing an array of `ValidationIssue`.

```typescript
interface ValidationIssue {
  code: string;       // e.g. 'EMAIL', 'MIN_LENGTH'
  field?: string;     // path: 'address.city', 'tags[0]'
  message: string;    // Human-readable error
}
```

## Decorators

### Type Checks
`@IsString()`, `@IsNumber()`, `@IsBoolean()`, `@IsDate()`, `@IsArray()`, `@IsObject()`, `@IsInt()`, `@IsEnum(entity)`

### Presence
`@IsDefined()`, `@IsOptional()`, `@IsEmpty()`, `@IsNotEmpty()`

### Strings
`@Length(min, max?)`, `@MinLength(n)`, `@MaxLength(n)`, `@Contains(seed)`, `@Matches(regex)`, `@IsEmail()`, `@IsUrl()`, `@IsUUID()`, and many more via `validator.js`.

### Numbers
`@IsPositive()`, `@IsNegative()`, `@Min(n)`, `@Max(n)`, `@IsDivisibleBy(n)`

### Collections & Nesting
- `@ValidateNested(() => Class)`: Recursively validates a nested object.
- `@ArrayUnique()`: Enforces uniqueness in an array.
- `{ each: true }`: Applies a validator to every element in an array, Set, or Map.

## Mapped DTO Helpers

Derive new DTOs from existing ones while preserving all validation and binding metadata.

```typescript
import { PickType, PartialType } from '@konekti/validation';

class User {
  @IsString() name = '';
  @IsEmail() email = '';
}

// Only 'name' is kept, with its @IsString() rule.
class NameOnlyDto extends PickType(User, ['name']) {}

// All fields become optional for both validation and HTTP binding.
class UpdateUserDto extends PartialType(User) {}
```

## Dependencies

- `@konekti/core`: Internal metadata management.
- `validator`: Powers the string format decorators.
