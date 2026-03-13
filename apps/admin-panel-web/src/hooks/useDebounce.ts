import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

/**
 * useDebounce - Debounces a value by the specified delay
 *
 * Useful for search inputs and input-based API calls to limit
 * the frequency of expensive operations while the user is typing.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchSearchResults(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Create a debounced function that updates the state
    const debouncedUpdate = debounce((newValue: T) => {
      setDebouncedValue(newValue);
    }, delay);

    // Call the debounced function with the current value
    debouncedUpdate(value);

    // Cleanup: cancel any pending debounced calls on unmount or value change
    return () => {
      debouncedUpdate.cancel();
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
