import { describe, it, expect } from '@jest/globals';

// Test utility functions that don't require complex dependencies
describe('Utility Functions Tests', () => {
  describe('String helpers', () => {
    it('should handle basic string operations', () => {
      const testString = 'Hello World';
      expect(testString.toLowerCase()).toBe('hello world');
      expect(testString.includes('World')).toBe(true);
    });

    it('should handle template strings', () => {
      const name = 'John';
      const greeting = `Hello, ${name}!`;
      expect(greeting).toBe('Hello, John!');
    });
  });

  describe('Array helpers', () => {
    it('should filter arrays correctly', () => {
      const numbers = [1, 2, 3, 4, 5];
      const evenNumbers = numbers.filter(n => n % 2 === 0);
      expect(evenNumbers).toEqual([2, 4]);
    });

    it('should map arrays correctly', () => {
      const numbers = [1, 2, 3];
      const doubled = numbers.map(n => n * 2);
      expect(doubled).toEqual([2, 4, 6]);
    });
  });

  describe('Object helpers', () => {
    it('should handle object properties', () => {
      const user = { name: 'John', age: 30, email: 'john@example.com' };
      expect(Object.keys(user)).toHaveLength(3);
      expect(user.name).toBe('John');
    });

    it('should spread objects correctly', () => {
      const base = { a: 1, b: 2 };
      const extended = { ...base, c: 3 };
      expect(extended).toEqual({ a: 1, b: 2, c: 3 });
    });
  });
});
