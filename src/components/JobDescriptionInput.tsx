// File: src/components/JobDescriptionInput.tsx
import React from "react";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  jobDescription: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

export const JobDescriptionInput: React.FC<Props> = ({ jobDescription, onChange }) => {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">Job Description:</label>
      <div className="h-28 overflow-y-auto border rounded-md">
        <Textarea
          placeholder="Paste the job description here"
          value={jobDescription}
          onChange={onChange}
          className="text-sm w-full h-full resize-none border-0"
        />
      </div>
    </div>
  );
};

