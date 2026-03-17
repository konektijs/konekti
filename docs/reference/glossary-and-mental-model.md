# glossary and mental model

<p><strong><kbd>English</kbd></strong> <a href="./glossary-and-mental-model.ko.md"><kbd>한국어</kbd></a></p>

This file keeps shared terminology short and stable.

## core mental model

- `Dispatcher` ~= Spring `DispatcherServlet`
- `Middleware` ~= broad pre-handler filter layer
- `Guard` = authorization gate
- `Interceptor` = invocation wrapper
- `RequestDto` = explicit route-level DTO binding contract
- `ExceptionResolver` = the canonical exception-to-response shaping path

## policy vocabulary

- `official` = supported and actively validated
- `preview` = intentionally offered, but not held to full parity/coverage
- `experimental` = available for exploration, not stable support
- `recommended preset` = the single default path the docs/examples optimize for
- `official matrix` = all officially supported combinations, which may be broader than the single recommended preset

## generator vocabulary

- `konekti new` = canonical public bootstrap entry
- `konekti g ...` = individual artifact generation
- `repo` = recommended default pattern, not mandatory architecture law
- `request-dto` / `response-dto` = separate generator schematics by design

## related docs

- `../concepts/http-runtime.md`
- `../concepts/decorators-and-metadata.md`
- `./support-matrix.md`
