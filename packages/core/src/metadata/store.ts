/**
 * Immutable-snapshot metadata store contract for function/object keyed metadata records.
 */
export interface ClonedWeakMapStore<TKey extends object, TValue> {
  read(target: TKey): TValue | undefined;
  update(target: TKey, updateValue: (current: TValue | undefined) => TValue): void;
  write(target: TKey, value: TValue): void;
}

/**
 * Creates a WeakMap-backed store that normalizes values once when they enter the cache.
 * The clone routine is responsible for returning an immutable snapshot so repeated reads
 * can reuse the stored reference without allocating defensive clones.
 *
 * @param cloneValue Clone routine used to isolate and freeze stored metadata from caller mutations.
 * @returns An immutable WeakMap store for metadata helpers.
 */
export function createClonedWeakMapStore<TKey extends object, TValue>(
  cloneValue: (value: TValue) => TValue,
): ClonedWeakMapStore<TKey, TValue> {
  const store = new WeakMap<TKey, TValue>();

  return {
    read(target: TKey): TValue | undefined {
      return store.get(target);
    },
    update(target: TKey, updateValue: (current: TValue | undefined) => TValue): void {
      store.set(target, cloneValue(updateValue(store.get(target))));
    },
    write(target: TKey, value: TValue): void {
      store.set(target, cloneValue(value));
    },
  };
}
