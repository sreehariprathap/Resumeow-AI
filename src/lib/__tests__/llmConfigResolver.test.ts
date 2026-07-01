import { getTaskConfig } from '../llmConfigResolver';
import { llmConfig, MODELS } from '../../config/llm.config';

describe('getTaskConfig', () => {
  it('returns defaults for a task not in tasks map', () => {
    const original = { ...llmConfig.tasks };
    (llmConfig.tasks as Record<string, unknown>) = {};
    const config = getTaskConfig('resumeLatex', 'free');
    expect(config.model).toBe(llmConfig.defaults.model);
    expect(config.provider).toBe(llmConfig.defaults.provider);
    (llmConfig.tasks as Record<string, unknown>) = original;
  });

  it('returns task-level config for free tier', () => {
    const config = getTaskConfig('resumeLatex', 'free');
    expect(config.model).toBe(MODELS.gemini.flash);
    expect(config.provider).toBe('gemini');
  });

  it('applies tierOverrides.pro for pro users when override exists', () => {
    const task = llmConfig.tasks['resumeLatex']!;
    const original = task.tierOverrides;
    task.tierOverrides = {
      pro: { model: MODELS.deepseek.pro, provider: 'deepseek', thinking: true }
    };
    const config = getTaskConfig('resumeLatex', 'pro');
    expect(config.model).toBe(MODELS.deepseek.pro);
    expect(config.provider).toBe('deepseek');
    expect(config.thinking).toBe(true);
    task.tierOverrides = original;
  });

  it('treats admin tier same as pro when no tierOverrides.admin block', () => {
    const task = llmConfig.tasks['resumeLatex']!;
    const original = task.tierOverrides;
    task.tierOverrides = {
      pro: { model: MODELS.deepseek.pro, provider: 'deepseek' }
    };
    const config = getTaskConfig('resumeLatex', 'admin');
    expect(config.model).toBe(MODELS.deepseek.pro);
    task.tierOverrides = original;
  });

  it('uses tierOverrides.admin when explicitly set', () => {
    const task = llmConfig.tasks['resumeLatex']!;
    const original = task.tierOverrides;
    task.tierOverrides = {
      pro:   { model: MODELS.deepseek.flash, provider: 'deepseek' },
      admin: { model: MODELS.deepseek.pro,   provider: 'deepseek', thinking: true }
    };
    const config = getTaskConfig('resumeLatex', 'admin');
    expect(config.model).toBe(MODELS.deepseek.pro);
    expect(config.thinking).toBe(true);
    task.tierOverrides = original;
  });

  it('falls back to task-level config when pro override not set', () => {
    const task = llmConfig.tasks['bioSummary']!;
    const original = task.tierOverrides;
    delete task.tierOverrides;
    const config = getTaskConfig('bioSummary', 'pro');
    expect(config.model).toBe(MODELS.gemini.flash);
    task.tierOverrides = original;
  });

  it('merges task override onto defaults', () => {
    const config = getTaskConfig('resumeLatex', 'free');
    // concurrency not overridden in resumeLatex — should equal defaults
    expect(config.concurrency).toBe(llmConfig.defaults.concurrency);
  });

  it('returns full Required<LLMTaskConfig> with no undefined fields', () => {
    const config = getTaskConfig('bioSummary', 'free');
    const requiredKeys: (keyof typeof config)[] = [
      'model', 'provider', 'temperature', 'thinking',
      'maxTokens', 'concurrency', 'systemPrompt',
    ];
    for (const key of requiredKeys) {
      expect(config[key]).toBeDefined();
    }
  });
});
