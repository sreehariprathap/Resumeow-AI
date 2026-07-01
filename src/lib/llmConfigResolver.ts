import { llmConfig, type LLMTaskKey, type LLMTaskConfig } from '../config/llm.config';
import type { AIProvider } from '@/lib/aiProviderContext';

type Plan = 'free' | 'pro' | 'admin';

/**
 * Resolve the full task config for the given plan.
 *
 * Resolution order (shallow merge, later entries win):
 *  1. llmConfig.defaults
 *  2. llmConfig.tasks[task]   (task-level overrides)
 *  3. task.tierOverrides[plan] (tier-specific overrides, if present)
 *
 * Admin is treated as pro unless a separate tierOverrides.admin block exists.
 * Plan defaults to 'free' when omitted.
 */
export function getTaskConfig(task: LLMTaskKey, plan: Plan = 'free'): Required<LLMTaskConfig> {
  const taskOverride = llmConfig.tasks[task] ?? {};
  const base = { ...llmConfig.defaults, ...taskOverride };

  // Admin falls back to pro tier override if no admin-specific override exists
  const effectivePlan: Plan =
    plan === 'admin'
      ? taskOverride.tierOverrides?.admin
        ? 'admin'
        : 'pro'
      : plan;

  const tierOverride = taskOverride.tierOverrides?.[effectivePlan] ?? {};
  return { ...base, ...tierOverride } as Required<LLMTaskConfig>;
}

/**
 * Resolve the task config for the given plan and dispatch to the correct AI call.
 *
 * The `makeAICallWithModel` and `makeAICallWithThinking` callbacks both accept
 * an explicit `provider` argument so the task config is the authoritative source —
 * no global env override, no model-name translation heuristics.
 */
export async function callForTask(
  task: LLMTaskKey,
  prompt: string,
  plan: Plan,
  makeAICallWithModel: (prompt: string, modelId: string, provider: AIProvider) => Promise<string>,
  makeAICallWithThinking: (prompt: string, provider: AIProvider) => Promise<string>
): Promise<string> {
  const config = getTaskConfig(task, plan);

  if (config.thinking) {
    // thinking is supported on deepseek (native) and gemini (2.5+).
    // For other providers fall back to a standard call.
    if (config.provider !== 'deepseek' && config.provider !== 'gemini') {
      console.warn(
        `[llmConfig] thinking:true set for task "${task}" but provider is "${config.provider}". ` +
        `Falling back to standard call — thinking is not supported on this provider.`
      );
      return makeAICallWithModel(prompt, config.model, config.provider);
    }
    return makeAICallWithThinking(prompt, config.provider);
  }

  return makeAICallWithModel(prompt, config.model, config.provider);
}
