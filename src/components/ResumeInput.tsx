
// File: src/components/ResumeInput.tsx
import React from "react";
import { Textarea } from "@/components/ui/textarea";

interface ResumeInputProps {
  resumeContent: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  visible?: boolean;
}

export const ResumeInput: React.FC<ResumeInputProps> = ({ 
  resumeContent, 
  onChange, 
  visible = true 
}) => {
  if (!visible) return null;
  
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">Temporary Resume Content:</label>
      <div className="h-36 overflow-y-auto border rounded-md">
        <Textarea
          placeholder="Paste your temporary resume content here"
          value={resumeContent}
          onChange={onChange}
          className="text-sm w-full h-full resize-none border-0"
        />
      </div>
    </div>
  );
};