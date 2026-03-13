import { useCallback, useRef, useEffect } from 'react';
import throttle from 'lodash/throttle';

/**
 * useThrottle - Throttles a callback function by the specified delay
 *
 * Useful for button click protection to prevent multiple rapid clicks
 * (e.g., double submit, double payment).
 *
 * @param callback - The function to throttle
 * @param delay - Delay in milliseconds (default: 2000ms)
 * @returns The throttled function
 *
 * @example
 * const handleSubmit = useThrottle(() => {
 *   submitForm();
 * }, 2000);
 *
 * <Button onClick={handleSubmit}>Submit</Button>
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 2000,
): T {
  // Store the callback ref to always have access to the latest callback
  const callbackRef = useRef<T>(callback);

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create the throttled function with stable reference
  const throttledFn = useRef(
    throttle(
      (...args: Parameters<T>) => {
        callbackRef.current(...args);
      },
      delay,
      { leading: true, trailing: false }, // Execute on first click, ignore subsequent clicks during delay
    ),
  );

  // Update throttle delay if it changes
  useEffect(() => {
    throttledFn.current = throttle(
      (...args: Parameters<T>) => {
        callbackRef.current(...args);
      },
      delay,
      { leading: true, trailing: false },
    );

    // Cleanup: cancel any pending throttled calls on unmount
    return () => {
      throttledFn.current.cancel();
    };
  }, [delay]);

  // Return memoized throttled function
  return useCallback(
    ((...args: Parameters<T>) => {
      throttledFn.current(...args);
    }) as T,
    [],
  );
}

export default useThrottle;
