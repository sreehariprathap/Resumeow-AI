import { getTaskConfig } from '../llmConfigResolver';
import { llmConfig } from '../../config/llm.config';

describe('getTaskConfig', () => {
  it('returns defaults for a task not in tasks map', () => {
    const original = { ...llmConfig.tasks };
    (llmConfig.tasks as Record<string, unknown>) = {};
    const config = getTaskConfig('resumeLatex');
    expect(config.model).toBe(llmConfig.defaults.model);
    expect(config.provider).toBe(llmConfig.defaults.provider);
    (llmConfig.tasks as Record<string, unknown>) = original;
  });

  it('merges task override onto defaults', () => {
    const config = getTaskConfig('resumeLatex');
    // resumeLatex is configured with deepseek-v4-pro and thinking: true
    expect(config.model).toBe('deepseek-v4-pro');
    expect(config.thinking).toBe(true);
    // concurrency not overridden — should equal defaults
    expect(config.concurrency).toBe(llmConfig.defaults.concurrency);
  });

  it('returns full Required<LLMTaskConfig> with no undefined fields', () => {
    const config = getTaskConfig('bioSummary');
    const requiredKeys: (keyof typeof config)[] = [
      'model', 'provider', 'temperature', 'thinking',
      'maxTokens', 'concurrency', 'systemPrompt', 'fallbackModel'
    ];
    for (const key of requiredKeys) {
      expect(config[key]).toBeDefined();
    }
  });
});
