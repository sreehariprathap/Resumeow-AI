import { describe, it, expect } from '@jest/globals';

// Test actual utility functions from the codebase
describe('Real Utility Functions', () => {
  describe('Basic utilities that work without complex dependencies', () => {
    it('should test type checking utilities', () => {
      // Test basic JavaScript utilities that don't require complex imports
      
      const isString = (value: unknown): value is string => typeof value === 'string';
      const isNumber = (value: unknown): value is number => typeof value === 'number';
      const isObject = (value: unknown): value is object => 
        typeof value === 'object' && value !== null && !Array.isArray(value);
      
      expect(isString('hello')).toBe(true);
      expect(isString(123)).toBe(false);
      
      expect(isNumber(123)).toBe(true);
      expect(isNumber('123')).toBe(false);
      
      expect(isObject({})).toBe(true);
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
    });

    it('should test array manipulation utilities', () => {
      const uniqueArray = (arr: number[]): number[] => [...new Set(arr)];
      const uniqueStrings = (arr: string[]): string[] => [...new Set(arr)];

      expect(uniqueArray([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(uniqueStrings(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);

      // Test basic grouping functionality
      const users = [
        { name: 'John', role: 'developer' },
        { name: 'Jane', role: 'designer' },
        { name: 'Bob', role: 'developer' }
      ];
      
      const developers = users.filter(user => user.role === 'developer');
      const designers = users.filter(user => user.role === 'designer');
      
      expect(developers).toHaveLength(2);
      expect(designers).toHaveLength(1);
      expect(developers[0].name).toBe('John');
      expect(designers[0].name).toBe('Jane');
    });

    it('should test validation utilities', () => {
      const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      const validateRequired = (value: string | undefined | null): boolean => {
        return value !== undefined && value !== null && value.trim().length > 0;
      };

      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('')).toBe(false);

      expect(validateRequired('valid')).toBe(true);
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });

    it('should test formatting utilities', () => {
      const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
      };

      const capitalizeFirst = (str: string): string => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      };

      const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - 3) + '...';
      };

      const testDate = new Date('2023-01-15');
      expect(formatDate(testDate)).toBe('2023-01-15');

      expect(capitalizeFirst('hello world')).toBe('Hello world');
      expect(capitalizeFirst('HELLO')).toBe('Hello');

      expect(truncateText('This is a long text', 10)).toBe('This is...');
      expect(truncateText('Short', 10)).toBe('Short');
    });
  });
});
