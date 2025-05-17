import { useState } from "react";
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import { Select } from "./ui/select";
import { TemplateDialog } from "./TemplateDialog";
import type { PromptType, Template } from "@/types";

interface TemplateSelectorProps {
  promptType: PromptType;
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onAddTemplate: (type: PromptType, template: Template) => void;
}

export const TemplateSelector = ({
  promptType,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onAddTemplate,
}: TemplateSelectorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor="template-select" className="text-xs font-medium">
          Select Template:
        </label>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsDialogOpen(true)}
          className="h-6 w-6 p-0"
          aria-label="Add new template"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
      
      <Select
        value={selectedTemplateId}
        onValueChange={(value) => onSelectTemplate(value)}
      >
        <option value="">Select a template</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </Select>
      
      <TemplateDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={(template) => {
          onAddTemplate(promptType, {
            ...template,
            id: crypto.randomUUID()
          });
          setIsDialogOpen(false);
        }}
        promptType={promptType}
      />
    </div>
  );
};
