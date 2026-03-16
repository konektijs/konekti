import {
  defineClassDiMetadata,
  defineModuleMetadata,
  type ClassDiMetadata,
  type ModuleMetadata,
} from './metadata.js';
import type { Token } from './types.js';

type StandardClassDecoratorFn = (value: Function, context: ClassDecoratorContext) => void;

type TupleOnly<T extends readonly unknown[]> = number extends T['length'] ? never : T;

export function Module(definition: ModuleMetadata): StandardClassDecoratorFn {
  return (target) => {
    defineModuleMetadata(target, definition);
  };
}

export function Global(): StandardClassDecoratorFn {
  return (target) => {
    defineModuleMetadata(target, { global: true });
  };
}

export function Inject<const TTokens extends readonly Token[]>(
  tokens: TupleOnly<TTokens>,
): StandardClassDecoratorFn;
export function Inject(tokens: readonly Token[]): StandardClassDecoratorFn {
  return (target) => {
    defineClassDiMetadata(target, { inject: [...tokens] });
  };
}

export function Scope(scope: NonNullable<ClassDiMetadata['scope']>): StandardClassDecoratorFn {
  return (target) => {
    defineClassDiMetadata(target, { scope });
  };
}
