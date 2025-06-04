import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "./ui/select";
import type { PromptType, CustomPrompt } from "@/types";

interface PromptTemplateSelectorProps {
  type: PromptType;
  prompts: CustomPrompt[];
  selectedPromptId: string;
  onSelectPrompt: (promptId: string) => void;
  label?: string;
}

export const PromptTemplateSelector: React.FC<PromptTemplateSelectorProps> = ({
  type,
  prompts,
  selectedPromptId,
  onSelectPrompt,
  label = "Prompt Template:"
}) => {  const filteredPrompts = prompts.filter(prompt => prompt.type === type);
  
  // Set value to placeholder if empty string to avoid the empty string Select.Item issue
  const selectValue = selectedPromptId || "placeholder";
  
  return (
    <div className="space-y-2 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium">
          {label}
        </label>
      </div>
      
      <Select value={selectValue} onValueChange={onSelectPrompt}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select a ${type === "resume" ? "resume" : "cover letter"} prompt template`} />
        </SelectTrigger>
        <SelectContent>          
          {filteredPrompts.length === 0 ? (
            <SelectItem value="no-templates" disabled>
              No {type === "resume" ? "resume" : "cover letter"} prompt templates available
            </SelectItem>
          ) : (
            <>
              <SelectItem value="placeholder" disabled>
                Select a {type === "resume" ? "resume" : "cover letter"} prompt template
              </SelectItem>
              {filteredPrompts.map((prompt) => (
                <SelectItem key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500 mt-1">
        Choose a prompt template to customize how your {type === "resume" ? "resume" : "cover letter"} prompt is generated
      </p>
    </div>
  );
};
