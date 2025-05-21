import { useState } from "react";
import { Button } from "./ui/button";
import { PlusCircle, FileText } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "./ui/select";
import { TemplateDialog } from "./TemplateDialog";
import { toast } from "sonner";
import type { Template } from "@/types";

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onAddTemplate: (template: Template) => void;
  onLoadResume?: (resumeLatex: string) => void;
}

export const TemplateSelector = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onAddTemplate,
  onLoadResume,
}: TemplateSelectorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false); const handleLoadResume = () => {
    if (!selectedTemplateId || selectedTemplateId === "no-selection" || !onLoadResume) return;
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (selectedTemplate?.resumeLatex) {
      onLoadResume(selectedTemplate.resumeLatex);
      toast.success("LaTeX resume loaded to editor successfully!");
    }
  };
  return (
    <div className="space-y-2">      <div className="flex justify-between items-center">
      <label className="text-xs font-medium">
        Saved Resume:
      </label>
      <div className="flex gap-1">{selectedTemplateId && selectedTemplateId !== "no-selection" && onLoadResume && templates.find(t => t.id === selectedTemplateId)?.resumeLatex && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLoadResume}
          className="h-6 p-0 px-1 text-xs flex items-center gap-1"
          title="Load saved LaTeX resume"
          aria-label="Load saved LaTeX resume"
        >              <FileText className="h-4 w-4" />
          <span className="text-xs ml-1">Load LaTeX</span>
        </Button>
      )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="h-7 text-xs flex items-center gap-1"
          aria-label="Add new resume"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Resume</span>
        </Button>
      </div>
    </div>
      <Select value={selectedTemplateId} onValueChange={onSelectTemplate}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a resume" />
        </SelectTrigger>        <SelectContent>
          {templates.length === 0 ? (
            <SelectItem value="no-templates" disabled>No resumes available</SelectItem>
          ) : (
            <>
              {selectedTemplateId === "no-selection" && (
                <SelectItem value="no-selection" disabled>Select a resume</SelectItem>
              )}              
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} {template.resumeLatex ? "📄" : ""}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      <TemplateDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={(template) => {
          const newTemplate = {
            ...template,
            id: crypto.randomUUID(),
            content: "Create a tailored resume based on this job description:\n\n{JOB_DESCRIPTION}\n\nMy current resume:\n\n{RESUME}"
          }; onAddTemplate(newTemplate);
          setIsDialogOpen(false);
          toast.success("Resume saved successfully!");
        }}
        promptType="resume"
      />
    </div>
  );
};
