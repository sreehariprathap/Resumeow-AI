// File: src/components/PromptDisplay.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface PromptDisplayProps {
  prompt: string;
  onCopy: () => void;
}

export const PromptDisplay: React.FC<PromptDisplayProps> = ({ prompt, onCopy }) => (
  <div className="space-y-1 pt-2">
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-medium">Generated Prompt:</h3>
      <Button
        variant="outline"
        size="sm"
        onClick={onCopy}
        className="flex items-center gap-1 h-6 px-2"
      >
        <Copy className="h-3 w-3" />
        <span className="text-xs">Copy</span>
      </Button>
    </div>
    <div className="border rounded-md bg-muted/20 h-32">
      <div className="h-full overflow-y-auto px-2 py-1">
        <pre className="text-xs whitespace-pre-wrap">{prompt}</pre>
      </div>
    </div>
  </div>
);