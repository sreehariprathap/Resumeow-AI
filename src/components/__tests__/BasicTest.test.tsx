import { describe, it, expect } from '@jest/globals';

describe('Basic test setup', () => {
  it('should be able to run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should be able to import testing utilities', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });
});
