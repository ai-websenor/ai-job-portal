import { stash } from 'pactum';

/**
 * Pactum store utilities for managing test state
 */

type DataMap = Record<string, any>;

/**
 * Store a value in Pactum's data store
 */
export function storeValue(key: string, value: any): void {
  stash.addDataMap({ [key]: value });
}

/**
 * Get a value from Pactum's data store
 */
export function getValue(key: string): any {
  const dataMap = stash.getDataMap() as DataMap;
  return dataMap[key];
}

/**
 * Clear specific keys from store
 */
export function clearKeys(...keys: string[]): void {
  const dataMap = stash.getDataMap() as DataMap;
  keys.forEach((key) => {
    delete dataMap[key];
  });
}

/**
 * Create a namespaced store helper
 */
export function createNamespacedStore(namespace: string) {
  const prefix = `${namespace}_`;

  return {
    store: (key: string, value: any) => storeValue(`${prefix}${key}`, value),
    get: (key: string) => getValue(`${prefix}${key}`),
    clear: () => {
      const dataMap = stash.getDataMap() as DataMap;
      Object.keys(dataMap)
        .filter((k) => k.startsWith(prefix))
        .forEach((k) => delete dataMap[k]);
    },
    ref: (key: string) => `$S{${prefix}${key}}`,
  };
}

/**
 * Create sequential ID generator for tests
 */
export function createIdGenerator(prefix: string = 'test') {
  let counter = 0;
  return () => `${prefix}_${++counter}_${Date.now()}`;
}

/**
 * Batch store multiple values
 */
export function storeMultiple(data: Record<string, any>): void {
  stash.addDataMap(data);
}

/**
 * Get Pactum store reference string for use in specs
 */
export function storeRef(key: string): string {
  return `$S{${key}}`;
}
