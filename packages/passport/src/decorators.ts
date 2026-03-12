import type { MetadataPropertyKey } from '@konekti/core';
import { UseGuard } from '@konekti/http';

import { AuthGuard } from './guard';
import { defineAuthRequirement, getOwnAuthRequirement } from './metadata';

type StandardMetadataBag = Record<PropertyKey, unknown>;
type StandardClassDecoratorFn = (value: Function, context: ClassDecoratorContext) => void;
type StandardMethodDecoratorFn = (value: Function, context: ClassMethodDecoratorContext) => void;
type LegacyClassDecorator = (target: Function) => void;
type LegacyMethodDecorator = (target: object, propertyKey: MetadataPropertyKey) => void;
type ClassOrMethodDecoratorLike =
  & LegacyClassDecorator
  & LegacyMethodDecorator
  & StandardClassDecoratorFn
  & StandardMethodDecoratorFn;
type RequirementPatch = { scopes?: string[]; strategy?: string };

const standardClassRequirementKey = Symbol.for('konekti.passport.standard.class-auth');
const standardMethodRequirementKey = Symbol.for('konekti.passport.standard.method-auth');

function mergeRequirement(existing: ReturnType<typeof getOwnAuthRequirement>, partial: RequirementPatch) {
  const scopes = [...(existing?.scopes ?? []), ...(partial.scopes ?? [])];

  return {
    scopes: scopes.length > 0 ? scopes : undefined,
    strategy: partial.strategy ?? existing?.strategy,
  };
}

function isStandardClassContext(context: unknown): context is ClassDecoratorContext {
  return typeof context === 'object' && context !== null && 'kind' in context && context.kind === 'class';
}

function isStandardMethodContext(context: unknown): context is ClassMethodDecoratorContext {
  return typeof context === 'object' && context !== null && 'kind' in context && context.kind === 'method';
}

function getStandardMetadataBag(metadata: unknown): StandardMetadataBag {
  return metadata as StandardMetadataBag;
}

function defineStandardAuthRequirement(metadata: unknown, requirement: ReturnType<typeof mergeRequirement>, propertyKey?: MetadataPropertyKey) {
  const bag = getStandardMetadataBag(metadata);

  if (propertyKey === undefined) {
    bag[standardClassRequirementKey] = mergeRequirement(
      (bag[standardClassRequirementKey] as ReturnType<typeof mergeRequirement> | undefined) ?? undefined,
      requirement,
    );
    return;
  }

  const current = bag[standardMethodRequirementKey] as Map<MetadataPropertyKey, ReturnType<typeof mergeRequirement>> | undefined;
  const map = current ?? new Map<MetadataPropertyKey, ReturnType<typeof mergeRequirement>>();
  map.set(propertyKey, mergeRequirement(map.get(propertyKey), requirement));
  bag[standardMethodRequirementKey] = map;
}

function applyAuthRequirement(targetOrValue: Function | object, contextOrPropertyKey: unknown, patch: RequirementPatch): void {
  if (isStandardClassContext(contextOrPropertyKey)) {
    if (typeof targetOrValue !== 'function') {
      throw new TypeError('Class auth decorators can only be applied to classes.');
    }

    defineStandardAuthRequirement(contextOrPropertyKey.metadata, mergeRequirement(getOwnAuthRequirement(targetOrValue), patch));
    UseGuard(AuthGuard)(targetOrValue, contextOrPropertyKey);
    return;
  }

  if (isStandardMethodContext(contextOrPropertyKey)) {
    if (typeof targetOrValue !== 'function') {
      throw new TypeError('Method auth decorators can only be applied to methods.');
    }

    defineStandardAuthRequirement(contextOrPropertyKey.metadata, mergeRequirement(undefined, patch), contextOrPropertyKey.name);
    UseGuard(AuthGuard)(targetOrValue, contextOrPropertyKey);
    return;
  }

  if (contextOrPropertyKey === undefined) {
    defineAuthRequirement(targetOrValue as Function, mergeRequirement(getOwnAuthRequirement(targetOrValue as Function), patch));
    UseGuard(AuthGuard)(targetOrValue as Function);
    return;
  }

  defineAuthRequirement(
    targetOrValue,
    mergeRequirement(getOwnAuthRequirement(targetOrValue, contextOrPropertyKey as MetadataPropertyKey), patch),
    contextOrPropertyKey as MetadataPropertyKey,
  );
  UseGuard(AuthGuard)(targetOrValue, contextOrPropertyKey as MetadataPropertyKey);
}

function createAuthRequirementDecorator(patch: RequirementPatch): ClassOrMethodDecoratorLike {
  const decorator = (targetOrValue: Function | object, contextOrPropertyKey?: unknown) => {
    applyAuthRequirement(targetOrValue, contextOrPropertyKey, patch);
  };

  return decorator as ClassOrMethodDecoratorLike;
}

export function UseAuth(strategy: string): ClassOrMethodDecoratorLike {
  return createAuthRequirementDecorator({ strategy });
}

export function RequireScopes(...scopes: string[]): ClassOrMethodDecoratorLike {
  return createAuthRequirementDecorator({ scopes });
}
