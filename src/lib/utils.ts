import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getTokenStatusColor(remaining: number, allocated: number): string {
  const pct = allocated > 0 ? remaining / allocated : 0;
  return pct > 0.4 ? 'text-green-500' : pct > 0.15 ? 'text-yellow-500' : 'text-red-500';
}
