import { getTokenStatusColor } from '../utils';

describe('getTokenStatusColor', () => {
  it('returns green above 40% remaining', () => {
    expect(getTokenStatusColor(50, 100)).toBe('text-green-500');
  });

  it('returns yellow between 15% and 40% remaining', () => {
    expect(getTokenStatusColor(20, 100)).toBe('text-yellow-500');
  });

  it('returns red at or below 15% remaining', () => {
    expect(getTokenStatusColor(10, 100)).toBe('text-red-500');
    expect(getTokenStatusColor(0, 100)).toBe('text-red-500');
  });

  it('returns red when allocated is 0 (avoids divide-by-zero)', () => {
    expect(getTokenStatusColor(0, 0)).toBe('text-red-500');
  });
});
