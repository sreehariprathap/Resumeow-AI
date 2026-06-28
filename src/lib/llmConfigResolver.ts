import { llmConfig, type LLMTaskKey, type LLMTaskConfig } from '../config/llm.config';

export function getTaskConfig(task: LLMTaskKey): Required<LLMTaskConfig> {
  const override = llmConfig.tasks[task] ?? {};
  return { ...llmConfig.defaults, ...override };
}

export async function callForTask(
  task: LLMTaskKey,
  prompt: string,
  makeAICallWithModel: (prompt: string, modelId: string) => Promise<string>,
  makeAICallWithThinking: (prompt: string) => Promise<string>
): Promise<string> {
  const config = getTaskConfig(task);

  if (config.thinking) {
    if (config.provider !== 'deepseek') {
      console.warn(
        `[llmConfig] thinking:true set for task "${task}" but provider is "${config.provider}". ` +
        `Falling back to standard call — thinking is only supported on deepseek.`
      );
      return makeAICallWithModel(prompt, config.model);
    }
    return makeAICallWithThinking(prompt);
  }

  return makeAICallWithModel(prompt, config.model);
}
