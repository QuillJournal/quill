import { useCallback, useEffect, useRef, useState } from "react";

export default function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value]);

  const flush = useCallback(() => {
    clearTimeout(timerRef.current);
    setDebouncedValue(value);
  }, [value]);

  return { debouncedValue, flush };
}
