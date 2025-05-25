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
import type { Template, PromptType } from "@/types";

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onAddTemplate: (template: Template) => void;
  onLoadTemplate?: (templateData: string) => void;
  promptType: PromptType;
  label?: string;
}

export const TemplateSelector = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onAddTemplate,
  onLoadTemplate,
  promptType,
  label = "Saved Resume:"
}: TemplateSelectorProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false); 
  
  const handleLoadTemplate = () => {
    if (!selectedTemplateId || selectedTemplateId === "no-selection" || !onLoadTemplate) return;
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    const templateData = promptType === "resume" ? selectedTemplate?.resumeLatex : selectedTemplate?.coverLetterTemplate;
    
    if (templateData) {
      onLoadTemplate(templateData);
      toast.success(`LaTeX ${promptType === "resume" ? "resume" : "cover letter"} loaded to editor successfully!`);
    } else {
      // Add debug message if template data is not found
      toast.error(`No LaTeX content found in the selected ${promptType === "resume" ? "resume" : "cover letter"} template.`);
      console.log("Template missing LaTeX content:", selectedTemplate);
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium">
          {label}
        </label>
        <div className="flex gap-1">
          {selectedTemplateId && 
           selectedTemplateId !== "no-selection" && 
           onLoadTemplate && 
           ((promptType === "resume" && templates.find(t => t.id === selectedTemplateId)?.resumeLatex) || 
            (promptType === "coverLetter" && templates.find(t => t.id === selectedTemplateId)?.coverLetterTemplate)) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadTemplate}
              className="h-6 p-0 px-1 text-xs flex items-center gap-1"
              title={`Load saved LaTeX ${promptType === "resume" ? "resume" : "cover letter"}`}
              aria-label={`Load saved LaTeX ${promptType === "resume" ? "resume" : "cover letter"}`}
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs ml-1">Load LaTeX</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-7 text-xs flex items-center gap-1"
            aria-label={`Add new ${promptType === "resume" ? "resume" : "cover letter"}`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add {promptType === "resume" ? "Resume" : "Cover Letter"}</span>
          </Button>
        </div>
      </div>
      
      <Select value={selectedTemplateId} onValueChange={onSelectTemplate}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select a ${promptType === "resume" ? "resume" : "cover letter template"}`} />
        </SelectTrigger>
        <SelectContent>
          {templates.length === 0 ? (
            <SelectItem value="no-templates" disabled>
              No {promptType === "resume" ? "resumes" : "cover letter templates"} available
            </SelectItem>
          ) : (
            <>
              {selectedTemplateId === "no-selection" && (
                <SelectItem value="no-selection" disabled>
                  Select a {promptType === "resume" ? "resume" : "cover letter template"}
                </SelectItem>
              )}              
              {templates.map((template) => {
                const hasLatex = promptType === "resume" 
                  ? template.resumeLatex 
                  : template.coverLetterTemplate;
                return (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {hasLatex ? "📄" : ""}
                  </SelectItem>
                );
              })}
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
            content: promptType === "resume" 
              ? "Create a tailored resume based on this job description:\n\n{JOB_DESCRIPTION}\n\nMy current resume:\n\n{RESUME}"
              : "Create a tailored cover letter based on this job description:\n\n{JOB_DESCRIPTION}\n\nMy resume:\n\n{RESUME}"
          }; 
          
          // Debug log to check the template object
          console.log(`New ${promptType} template:`, newTemplate);
          
          // Check if LaTeX content exists
          const hasLatex = promptType === "resume" 
            ? newTemplate.resumeLatex && newTemplate.resumeLatex.trim().length > 0
            : newTemplate.coverLetterTemplate && newTemplate.coverLetterTemplate.trim().length > 0;
            
          if (hasLatex) {
            toast.success(`${promptType === "resume" ? "Resume" : "Cover letter"} with LaTeX saved successfully!`);
          } else {
            toast.info(`${promptType === "resume" ? "Resume" : "Cover letter"} saved without LaTeX content.`);
          }
          
          onAddTemplate(newTemplate);
          setIsDialogOpen(false);
        }}
        promptType={promptType}
      />
    </div>
  );
};
