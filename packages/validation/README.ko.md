# @konekti/validation

<p><a href="./README.md"><kbd>English</kbd></a> <strong><kbd>한국어</kbd></strong></p>

Konekti를 위한 입력값 검증(Validation) 및 실체화(Materialization) 엔진입니다.

`@konekti/validation`은 애플리케이션의 **입력** 경계를 담당합니다. 가공되지 않은(untyped) raw 데이터를 검증이 완료된 타입 기반 DTO 인스턴스로 변환하는 역할을 수행합니다. `@konekti/serialization`이 나가는 응답의 형태를 가공한다면, 이 패키지는 들어오는 데이터의 안전성과 올바른 실체화를 보장합니다.

## 핵심 개념 (The Mental Model)

Konekti는 데이터 핸들링을 두 가지 뚜렷한 단계로 나눕니다:

1. **검증 (Validation/Input)**: raw 데이터를 클래스 인스턴스로 실체화하고 규칙을 강제합니다.
2. **직렬화 (Serialization/Output)**: 클래스 인스턴스를 다시 응답용 plain 데이터로 가공합니다.

`@konekti/validation`은 검증 규칙, 실체화 엔진, Standard Schema 호환성(Zod/Valibot 등), 그리고 메타데이터를 보존하는 Mapped DTO 헬퍼를 소유합니다.

## @konekti/http와의 관계

이 패키지는 전송 계층(Transport)에 독립적입니다. HTTP Body나 Query String에 대해 직접 알지 못합니다.

Konekti 애플리케이션에서 `@konekti/http`는 이 패키지를 다음과 같이 사용합니다:
1. 요청에서 raw 데이터를 추출합니다 (Body, Query, Params 등).
2. `DefaultValidator.materialize()`를 사용하여 DTO 인스턴스를 생성하고 검증합니다.
3. 결과물인 타입이 지정된 인스턴스를 컨트롤러 핸들러에 전달합니다.

## 설치

```bash
pnpm add @konekti/validation
```

## 주요 기능

- **필드 레벨 데코레이터**: `@IsString()`, `@MinLength()`, `@ValidateNested()` 등
- **클래스 레벨 검증**: 복잡한 규칙이나 Standard Schema 연결을 위한 `@ValidateClass(...)`
- **실체화 (Materialization)**: `materialize()`는 plain 객체를 재귀적으로 타입 기반 클래스 인스턴스로 변환합니다.
- **검증 (Validation)**: `validate()`는 기존 인스턴스가 데코레이터 규칙을 준수하는지 확인합니다.
- **Standard Schema**: `@ValidateClass`를 통한 Zod, Valibot, ArkType의 직접 지원
- **Mapped Types**: 메타데이터를 보존하는 `PickType`, `OmitType`, `PartialType`, `IntersectionType`

## 빠른 시작

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

// 1. Materialize: Plain 객체 -> 타입 인스턴스 + 검증
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

### 주의: 암묵적 타입 변환 없음 (No Implicit Coercion)

`materialize()`는 스키마를 엄격하게 강제합니다. 문자열 `"42"`를 숫자 `42`로 바꾸는 것과 같은 암묵적 스칼라 변환(Implicit Coercion)을 수행하지 **않습니다**.

```typescript
import { DefaultValidator, IsNumber } from '@konekti/validation';

class GetUserDto {
  @IsNumber()
  id = 0;
}

const validator = new DefaultValidator();

// '42'가 문자열이므로 DtoValidationError가 발생합니다.
await validator.materialize({ id: '42' }, GetUserDto);
```

HTTP 쿼리 파라미터처럼 모든 값이 문자열로 들어오는 경우, 검증기를 호출하기 전에 명시적으로 변환해야 합니다. Konekti HTTP 앱에서는 이런 변환 책임이 `@konekti/validation`이 아니라 바인딩/전송 계층에 있습니다.

## API 레퍼런스

### DefaultValidator

실체화와 검증을 위한 핵심 엔진입니다.

```typescript
class DefaultValidator implements Validator {
  // 기존 인스턴스를 검증합니다. 중첩 객체를 실체화하지는 않습니다.
  async validate(value: unknown, target: Constructor): Promise<void>;

  // plain 객체를 클래스 인스턴스로 실체화한 뒤 검증합니다.
  async materialize<T>(value: unknown, target: Constructor<T>): Promise<T>;
}
```

### validate vs materialize

| 기능 | `validate` | `materialize` |
|---|---|---|
| **주요 목적** | 기존 객체 상태 확인 | 새 객체 생성 + 확인 |
| **입력** | DTO 성격의 인스턴스 | Raw plain 객체 |
| **출력** | `Promise<void>` | `Promise<T>` (생성된 인스턴스) |
| **재귀** | 아니오 | 예 (중첩 DTO 실체화 포함) |

### DtoValidationError & ValidationIssue

검증 실패 시 `ValidationIssue` 배열을 담은 `DtoValidationError`가 발생합니다.

```typescript
interface ValidationIssue {
  code: string;       // 예: 'EMAIL', 'MIN_LENGTH'
  field?: string;     // 경로: 'address.city', 'tags[0]'
  message: string;    // 읽기 쉬운 에러 메시지
}
```

## 데코레이터

### 타입 검사
`@IsString()`, `@IsNumber()`, `@IsBoolean()`, `@IsDate()`, `@IsArray()`, `@IsObject()`, `@IsInt()`, `@IsEnum(entity)`

### 존재 여부
`@IsDefined()`, `@IsOptional()`, `@IsEmpty()`, `@IsNotEmpty()`

### 문자열
`@Length(min, max?)`, `@MinLength(n)`, `@MaxLength(n)`, `@Contains(seed)`, `@Matches(regex)`, `@IsEmail()`, `@IsUrl()`, `@IsUUID()` 등 `validator.js`를 통한 수많은 형식 지원.

### 숫자
`@IsPositive()`, `@IsNegative()`, `@Min(n)`, `@Max(n)`, `@IsDivisibleBy(n)`

### 컬렉션 및 중첩
- `@ValidateNested(() => Class)`: 중첩된 객체를 재귀적으로 검증합니다.
- `@ArrayUnique()`: 배열 요소의 고유성을 강제합니다.
- `{ each: true }`: 배열, Set, Map의 모든 요소에 검증기를 적용합니다.

## Mapped DTO Helpers

기존 DTO로부터 모든 검증 및 바인딩 메타데이터를 보존하면서 새로운 DTO를 파생합니다.

```typescript
import { PickType, PartialType } from '@konekti/validation';

class User {
  @IsString() name = '';
  @IsEmail() email = '';
}

// 'name' 필드와 @IsString() 규칙만 유지합니다.
class NameOnlyDto extends PickType(User, ['name']) {}

// 모든 필드가 검증 및 HTTP 바인딩 관점에서 선택적(optional)이 됩니다.
class UpdateUserDto extends PartialType(User) {}
```

## 의존성

- `@konekti/core`: 내부 메타데이터 관리.
- `validator`: 문자열 형식 데코레이터의 기반이 됩니다.
