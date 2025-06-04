// File: src/components/PromptTypeSelector.tsx
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { memo } from "react";
import type { PromptType } from "@/types/index";

type Props = {
  promptType: PromptType;
  onChange: (value: string) => void;
};

// Using memo to prevent unnecessary re-renders
export const PromptTypeSelector = memo(({ promptType, onChange }: Props) => {
  return (
    <div className="space-y-1 flex flex-col gap-2">
      <label className="text-xs font-medium">Choose Prompt Type:</label>
      <RadioGroup value={promptType} onValueChange={onChange} className="flex space-x-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="resume" id="resume" />
          <label htmlFor="resume" className="text-sm cursor-pointer">Resume</label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="coverLetter" id="coverLetter" />
          <label htmlFor="coverLetter" className="text-sm cursor-pointer">Cover Letter</label>
        </div>
      </RadioGroup>
    </div>
  );
});

