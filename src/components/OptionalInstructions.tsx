import React from "react";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

interface OptionalInstructionsProps {
  hasInstructions: boolean;
  instructions: string;
  onToggleInstructions: (checked: boolean) => void;
  onInstructionsChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const OptionalInstructions: React.FC<OptionalInstructionsProps> = ({
  hasInstructions,
  instructions,
  onToggleInstructions,
  onInstructionsChange,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="instructions"
          checked={hasInstructions}
          onCheckedChange={(checked) => onToggleInstructions(checked === true)}
        />
        <Label htmlFor="instructions" className="text-xs font-medium cursor-pointer">
          Include optional instructions
        </Label>
      </div>
      
      {hasInstructions && (
        <div className="border rounded-md">
          <Textarea
            placeholder="Add any additional instructions here"
            value={instructions}
            onChange={onInstructionsChange}
            className="min-h-[80px] resize-none text-sm border-0"
            aria-label="Optional instructions"
          />
        </div>
      )}
    </div>
  );
};
