import { describe, it, expect, jest } from '@jest/globals';
import { cn, debounce } from '../../lib/utils';

describe('Utils Library', () => {
  describe('cn function', () => {
    it('should combine class names', () => {
      const result = cn('class1', 'class2');
      expect(typeof result).toBe('string');
      expect(result).toBeTruthy();
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isHidden = false;
      const result = cn('base', isActive && 'conditional', isHidden && 'hidden');
      expect(typeof result).toBe('string');
      expect(result).toBeTruthy();
    });

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'end');
      expect(typeof result).toBe('string');
      expect(result).toBeTruthy();
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(typeof result).toBe('string');
    });
  });

  describe('debounce function', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      // Call multiple times quickly
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      // Function should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Fast forward time
      jest.advanceTimersByTime(100);

      // Function should have been called once with the last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('arg1');
      
      // Advance time partially
      jest.advanceTimersByTime(50);
      
      // Call again (should reset the timer)
      debouncedFn('arg2');
      
      // Advance time to the original timeout
      jest.advanceTimersByTime(50);
      
      // Function should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();
      
      // Advance time to complete the new timeout
      jest.advanceTimersByTime(50);
      
      // Function should now be called
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg2');
    });

    it('should handle multiple debounced functions independently', () => {
      const mockFn1 = jest.fn();
      const mockFn2 = jest.fn();
      const debouncedFn1 = debounce(mockFn1, 100);
      const debouncedFn2 = debounce(mockFn2, 200);

      debouncedFn1('fn1');
      debouncedFn2('fn2');

      jest.advanceTimersByTime(100);
      expect(mockFn1).toHaveBeenCalledWith('fn1');
      expect(mockFn2).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn2).toHaveBeenCalledWith('fn2');
    });
  });
});
