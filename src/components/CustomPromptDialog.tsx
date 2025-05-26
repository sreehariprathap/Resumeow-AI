import { useState, useEffect } from "react";
// import type { ChangeEvent } from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import type { CustomPrompt, PromptType } from "@/types";

interface CustomPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: CustomPrompt) => void;
  initialPrompt?: CustomPrompt;
  isEditing?: boolean;
  initialType?: PromptType;
}

export const CustomPromptDialog = ({
  isOpen,
  onClose,
  onSave,
  initialPrompt,
  isEditing = false,
  initialType = 'resume'
}: CustomPromptDialogProps) => {
  const [promptType, setPromptType] = useState<PromptType>(initialType);
  const [promptName, setPromptName] = useState("");  const [promptContent, setPromptContent] = useState("");
  const [resumePosition, setResumePosition] = useState("{RESUME}");
  const [jobDescriptionPosition, setJobDescriptionPosition] = useState("{JOB_DESCRIPTION}");
  const [optionalInstructionsPosition, setOptionalInstructionsPosition] = useState("{OPTIONAL_INSTRUCTIONS}");
  const [coverLetterTemplatePosition, setCoverLetterTemplatePosition] = useState("{COVER_LETTER_TEMPLATE}");  const [showPreview, setShowPreview] = useState(false);

  // Reset form when dialog opens or load initial data if editing
  useEffect(() => {
    if (isOpen) {
      if (initialPrompt && isEditing) {
        setPromptType(initialPrompt.type);
        setPromptName(initialPrompt.name);
        setPromptContent(initialPrompt.content);
        setResumePosition(initialPrompt.placeholders.resumePosition);
        setJobDescriptionPosition(initialPrompt.placeholders.jobDescriptionPosition);
        setOptionalInstructionsPosition(initialPrompt.placeholders.optionalInstructionsPosition || "{OPTIONAL_INSTRUCTIONS}");
        setCoverLetterTemplatePosition(initialPrompt.placeholders.coverLetterTemplatePosition || "{COVER_LETTER_TEMPLATE}");
      } else {
        // Default values for new prompt
        setPromptType(initialType); // Use the initialType provided
        setPromptName("");
        setPromptContent("Based on this job description:\n\n{JOB_DESCRIPTION}\n\nPlease tailor my resume:\n\n{RESUME}\n\n{OPTIONAL_INSTRUCTIONS}");
        setResumePosition("{RESUME}");
        setJobDescriptionPosition("{JOB_DESCRIPTION}");
        setOptionalInstructionsPosition("{OPTIONAL_INSTRUCTIONS}");
        setCoverLetterTemplatePosition("{COVER_LETTER_TEMPLATE}");      }
    }
  }, [isOpen, initialPrompt, isEditing, initialType]);

  const handlePromptTypeChange = (value: string) => {
    const newType = value as PromptType;
    setPromptType(newType);
    
    // Set default content based on type
    if (newType === 'resume' && !isEditing) {
      setPromptContent("Based on this job description:\n\n{JOB_DESCRIPTION}\n\nPlease tailor my resume:\n\n{RESUME}\n\n{OPTIONAL_INSTRUCTIONS}");
    } else if (newType === 'coverLetter' && !isEditing) {
      setPromptContent("Based on this job description:\n\n{JOB_DESCRIPTION}\n\nAnd my resume:\n\n{RESUME}\n\nWrite a cover letter using this template:\n\n{COVER_LETTER_TEMPLATE}\n\n{OPTIONAL_INSTRUCTIONS}");
    }
  };

  const handleSave = () => {
    if (!promptName.trim() || !promptContent.trim()) return;
    
    const newPrompt: CustomPrompt = {
      id: initialPrompt?.id || crypto.randomUUID(),
      type: promptType,
      name: promptName,
      content: promptContent,
      placeholders: {
        resumePosition,
        jobDescriptionPosition,
        optionalInstructionsPosition,
        ...(promptType === 'coverLetter' ? { coverLetterTemplatePosition } : {})
      }
    };
    
    onSave(newPrompt);
    onClose();
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Custom Prompt" : "Create Custom Prompt"}</DialogTitle>
          <DialogDescription>
            Define a prompt template for generating AI prompts
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Prompt Type</Label>
            <RadioGroup 
              value={promptType} 
              onValueChange={handlePromptTypeChange} 
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="resume" id="promptType-resume" />
                <Label htmlFor="promptType-resume" className="text-sm cursor-pointer">Resume</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="coverLetter" id="promptType-coverLetter" />
                <Label htmlFor="promptType-coverLetter" className="text-sm cursor-pointer">Cover Letter</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="promptName">Prompt Name</Label>
            <Input
              id="promptName"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder="e.g., ATS-Optimized Resume Prompt"
            />
          </div>          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="promptContent">Prompt Template</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs px-2 py-0 h-6"
              >
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
            </div>
            <div className="h-48 overflow-y-auto border rounded-md">
              <Textarea
                id="promptContent"
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                placeholder="Enter your prompt template here"
                className="h-full resize-none font-mono text-xs leading-relaxed"
              />
            </div>
            <p className="text-xs text-gray-500">
              Use placeholders like {`{RESUME}`}, {`{JOB_DESCRIPTION}`}, {`{OPTIONAL_INSTRUCTIONS}`}{promptType === 'coverLetter' ? `, and {COVER_LETTER_TEMPLATE}` : ''} in your template
            </p>
          </div>

          {showPreview && (
            <div className="grid gap-2 mt-2">
              <Label className="text-xs">Preview with Sample Data</Label>              <div className="h-32 overflow-y-auto border rounded-md p-2 text-xs bg-gray-50">
                {promptContent
                  .replace(new RegExp(resumePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "[Your Resume Content]")
                  .replace(new RegExp(jobDescriptionPosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "[Job Description]")
                  .replace(new RegExp(optionalInstructionsPosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "[Additional Instructions]")
                  .replace(
                    promptType === 'coverLetter' ? new RegExp(coverLetterTemplatePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : /(?!)/,
                    "[Cover Letter Template]"
                  )}
              </div>
            </div>
          )}<div className="grid gap-3">
            <div className="flex justify-between items-center">
              <Label>Placeholder Settings</Label>
              <div className="text-xs text-muted-foreground">
                Hover for help
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Label htmlFor="resumePosition" className="text-xs group relative">
                Resume Placeholder
                <span className="hidden group-hover:block absolute z-50 top-6 left-0 bg-slate-900 text-white p-2 rounded text-xs w-60">
                  This placeholder will be replaced with the user's resume content.
                </span>
              </Label>
              <Input
                id="resumePosition"
                value={resumePosition}
                onChange={(e) => setResumePosition(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
              <div className="grid grid-cols-2 gap-2">
              <Label htmlFor="jobDescriptionPosition" className="text-xs group relative">
                Job Description Placeholder
                <span className="hidden group-hover:block absolute z-50 top-6 left-0 bg-slate-900 text-white p-2 rounded text-xs w-60">
                  This placeholder will be replaced with the job description text.
                </span>
              </Label>
              <Input
                id="jobDescriptionPosition"
                value={jobDescriptionPosition}
                onChange={(e) => setJobDescriptionPosition(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Label htmlFor="optionalInstructionsPosition" className="text-xs group relative">
                Optional Instructions Placeholder
                <span className="hidden group-hover:block absolute z-50 top-6 left-0 bg-slate-900 text-white p-2 rounded text-xs w-60">
                  This placeholder will be replaced with any optional instructions the user provides.
                </span>
              </Label>
              <Input
                id="optionalInstructionsPosition"
                value={optionalInstructionsPosition}
                onChange={(e) => setOptionalInstructionsPosition(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
              {promptType === 'coverLetter' && (
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor="coverLetterTemplatePosition" className="text-xs group relative">
                  Cover Letter Template Placeholder
                  <span className="hidden group-hover:block absolute z-50 top-6 left-0 bg-slate-900 text-white p-2 rounded text-xs w-60">
                    This placeholder will be replaced with the cover letter template structure.
                  </span>
                </Label>
                <Input
                  id="coverLetterTemplatePosition"
                  value={coverLetterTemplatePosition}
                  onChange={(e) => setCoverLetterTemplatePosition(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            )}          </div>
        </div>
        
        <DialogFooter className="sticky bottom-0 pt-4 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEditing ? "Update" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
