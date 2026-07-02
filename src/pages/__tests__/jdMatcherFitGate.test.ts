import { shouldPauseForLowFit } from '../jdMatcherFitGate';

describe('shouldPauseForLowFit', () => {
  it('pauses below 50', () => {
    expect(shouldPauseForLowFit(49)).toBe(true);
    expect(shouldPauseForLowFit(0)).toBe(true);
  });

  it('does not pause at exactly 50', () => {
    expect(shouldPauseForLowFit(50)).toBe(false);
  });

  it('does not pause above 50', () => {
    expect(shouldPauseForLowFit(51)).toBe(false);
    expect(shouldPauseForLowFit(100)).toBe(false);
  });
});
