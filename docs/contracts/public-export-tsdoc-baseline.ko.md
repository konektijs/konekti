# Public Export TSDoc Baseline

<p><strong><kbd>한국어</kbd></strong> <a href="./public-export-tsdoc-baseline.md"><kbd>English</kbd></a></p>

이 체크리스트는 `packages/*/src` 아래 governed public export에 적용되는 강제 TSDoc 기준선을 정의합니다.

## Scope

- [ ] MUST: 이 기준선을 `packages/*/src` 아래 exported declaration에 적용합니다.
- [ ] MUST: `.d.ts` 파일, 테스트 파일, 비패키지 경로는 자동 검사 범위 밖으로 취급합니다.
- [ ] MUST: 심볼이 barrel을 통해 re-export 되더라도 실제 선언 위치에 문서를 작성합니다.
- [ ] MUST: 기본값은 변경 파일 기준 enforcement이고, baseline 모드를 요청하면 전체 표면 enforcement가 실행된다고 가정합니다.

## Required Rules

- [ ] MUST: 모든 governed public export에 비어 있지 않은 TSDoc summary를 추가합니다.
- [ ] MUST: exported function의 모든 named parameter에 `@param`을 추가합니다.
- [ ] MUST: exported arrow-function constant와 exported function-expression constant의 모든 named parameter에 `@param`을 추가합니다.
- [ ] MUST: 선언된 반환 타입이 `void` 또는 `never`가 아닌 exported function에 `@returns`를 추가합니다.
- [ ] MUST: 선언된 반환 타입이 `void` 또는 `never`가 아닌 exported callable constant에 `@returns`를 추가합니다.
- [ ] MUST: 문서화한 parameter 이름을 소스 선언 이름과 일치시킵니다.
- [ ] MUST: governed surface에 포함되는 exported `function`, `class`, `interface`, `type`, `enum`, exported `const` 선언을 모두 커버합니다.

## Recommended Rules

- [ ] SHOULD: 호출자에게 보이는 실패 동작이 계약의 일부라면 `@throws`를 추가합니다.
- [ ] SHOULD: hover 문서가 유용한 entry point, decorator, factory helper에는 `@example`을 추가합니다.
- [ ] SHOULD: summary 한 줄에 담기 어려운 주의사항, 생명주기 메모, 계약 맥락에는 `@remarks`를 추가합니다.
- [ ] SHOULD: 소스 `@example` 블록은 짧게 유지하고, 시나리오 수준 워크플로우는 패키지 `README.md`에 유지합니다.

## Violation Examples

exported function에 summary, `@param`, `@returns`가 모두 없는 경우:

```ts
export function greet(name: string): string {
  return name;
}
```

exported arrow-function constant에 `@param`과 `@returns`가 없는 경우:

```ts
/**
 * Format a greeting.
 */
export const greet = (name: string): string => name;
```

exported function-expression constant에 `@param`과 `@returns`가 없는 경우:

```ts
/**
 * Format a greeting.
 */
export const greet = function (name: string): string {
  return name;
};
```

barrel에만 문서를 두는 잘못된 예시입니다. `greet`는 re-export 위치가 아니라 실제 정의 위치에서 문서화해야 합니다.

```ts
/**
 * Re-exported greeting helper.
 */
export { greet } from './greet';
```

## Compliant Example

```ts
/**
 * Format a greeting for the current caller.
 *
 * @param name Name to interpolate into the greeting.
 * @returns A stable greeting string for HTTP or CLI responses.
 *
 * @example
 * ```ts
 * greet('Fluo');
 * ```
 */
export function greet(name: string): string {
  return `Hello, ${name}`;
}
```

## Automation

- [ ] MUST: 기본 변경 파일 게이트에는 `pnpm verify:public-export-tsdoc`를 실행합니다.
- [ ] MUST: 전체 governed surface에는 `pnpm verify:public-export-tsdoc:baseline` 또는 `node tooling/governance/verify-public-export-tsdoc.mjs --mode=full`을 실행합니다.
- [ ] MUST: `pnpm lint`가 `pnpm verify:public-export-tsdoc`를 포함한다고 가정합니다.
- [ ] MUST: 위반 출력이 파일 경로, 줄 번호, declaration kind, declaration name, 누락된 태그를 보고한다고 가정합니다.

## Related Docs

- [Release Governance](./release-governance.ko.md)
- [Behavioral Contract Policy](./behavioral-contract-policy.ko.md)
- [Platform Conformance Authoring Checklist](./platform-conformance-authoring-checklist.ko.md)
