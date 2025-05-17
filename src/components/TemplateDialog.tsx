import { useState } from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import type { PromptType } from "@/types/index";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: { name: string; content: string }) => void;
  promptType: PromptType;
}

export const TemplateDialog = ({
  isOpen,
  onClose,
  onSave,
  promptType,
}: TemplateDialogProps) => {
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState(
    promptType === "resume"
      ? "Create a tailored resume based on this job description:\n\n{JOB_DESCRIPTION}\n\nMy current resume:\n\n{RESUME}"
      : "Write a cover letter based on this job description:\n\n{JOB_DESCRIPTION}\n\nMy current resume:\n\n{RESUME}"
  );

  const handleSave = () => {
    if (!templateName.trim() || !templateContent.trim()) return;
    
    onSave({
      name: templateName.trim(),
      content: templateContent.trim(),
    });
    
    // Reset form
    setTemplateName("");
    setTemplateContent("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add {promptType === "resume" ? "Resume" : "Cover Letter"} Template</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="My template"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template-content">Template Content</Label>
            <div className="relative">
              <Textarea
                id="template-content"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="h-40 resize-none font-mono text-sm"
                placeholder="Use {JOB_DESCRIPTION} and {RESUME} as placeholders"
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                Use {"{JOB_DESCRIPTION}"} and {"{RESUME}"} as placeholders
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!templateName.trim() || !templateContent.trim()}>
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
