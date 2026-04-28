import type { AuthRequirement } from './types.js';

function normalizeScopeItems(items: Iterable<string>): string[] | undefined {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of items) {
    const scope = item.trim();

    if (scope.length === 0 || seen.has(scope)) {
      continue;
    }

    seen.add(scope);
    normalized.push(scope);
  }

  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Normalizes declared scope metadata into a unique ordered list.
 *
 * @param scopes Declared scope values from decorators or merged auth metadata.
 * @returns A deduplicated scope list when valid strings are present.
 */
export function normalizeDeclaredScopes(scopes: unknown): string[] | undefined {
  if (!Array.isArray(scopes)) {
    return undefined;
  }

  const scopeItems = scopes.filter((scope): scope is string => typeof scope === 'string');
  return normalizeScopeItems(scopeItems);
}

/**
 * Extracts normalized scope values from principal claims.
 *
 * @param claims Principal claims returned by an authentication strategy.
 * @returns A deduplicated scope list derived from `claims.scopes` or `claims.scope`.
 */
export function normalizePrincipalScopes(claims: Record<string, unknown>): string[] | undefined {
  if (Array.isArray(claims.scopes)) {
    const scopes = claims.scopes.filter((scope): scope is string => typeof scope === 'string');
    return normalizeScopeItems(scopes);
  }

  if (typeof claims.scope === 'string') {
    return normalizeScopeItems(claims.scope.split(/\s+/));
  }

  return undefined;
}

/**
 * Merges auth requirement metadata while preserving strategy, optional-auth, and scope semantics.
 *
 * @param base Existing auth requirement metadata.
 * @param extra New auth requirement metadata to apply on top of the base requirement.
 * @returns The merged auth requirement, or `undefined` when no requirement remains.
 */
export function mergeAuthRequirements(
  base: AuthRequirement | undefined,
  extra: AuthRequirement | undefined,
): AuthRequirement | undefined {
  if (!base && !extra) {
    return undefined;
  }

  const scopes = normalizeDeclaredScopes([...(base?.scopes ?? []), ...(extra?.scopes ?? [])]);
  const optional = extra?.optional ?? base?.optional;
  const strategy = extra?.strategy ?? base?.strategy;

  if (!strategy && !scopes && optional !== true) {
    return undefined;
  }

  return {
    optional,
    scopes,
    strategy,
  };
}
