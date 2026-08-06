import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value`, updated only after `delayMs`
 * has elapsed without changes. Useful for delaying network requests
 * triggered by fast-changing input (e.g. search fields).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
		return () => clearTimeout(timeoutId);
	}, [value, delayMs]);

	return debouncedValue;
}
