import { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { useAuth } from "@/lib/authContext";
import { Cloud, CloudOff, Info } from "lucide-react";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import type { PromptType } from "@/types";

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: { name: string; resumeLatex?: string; coverLetterTemplate?: string }) => void;
  promptType: PromptType;
}

export const TemplateDialog = ({
  isOpen,
  onClose,
  onSave,
  promptType
}: TemplateDialogProps) => {
  const { currentUser } = useAuth();
  const [templateName, setTemplateName] = useState("");
  const [resumeLatex, setResumeLatex] = useState("");
  const [coverLetterTemplate, setCoverLetterTemplate] = useState("");
  const [saveToCloud, setSaveToCloud] = useState(true);
  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTemplateName("");
      setResumeLatex("");
      setCoverLetterTemplate("");
      setSaveToCloud(!!currentUser); // Default to true if user is logged in
    }
  }, [isOpen, currentUser]);
  const handleSave = () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    
    if (!currentUser && saveToCloud) {
      toast.error("Please log in to save templates to the cloud");
      return;
    }
    
    if (promptType === 'resume') {
      if (!resumeLatex.trim()) {
        toast.error("Please enter resume content");
        return;
      }
      onSave({
        name: templateName,
        resumeLatex: resumeLatex
      });
    } else if (promptType === 'coverLetter') {
      if (!coverLetterTemplate.trim()) {
        toast.error("Please enter cover letter template content");
        return;
      }
      onSave({
        name: templateName,
        coverLetterTemplate: coverLetterTemplate
      });
    }
    
    if (saveToCloud && currentUser) {
      toast.success(`${promptType === 'resume' ? 'Resume' : 'Cover letter'} template saved to cloud!`);
    } else {
      toast.success(`${promptType === 'resume' ? 'Resume' : 'Cover letter'} template saved locally!`);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">        <DialogHeader>
          <DialogTitle>
            {promptType === 'resume' 
              ? "Add Resume in LaTeX Format" 
              : "Add Cover Letter Template in LaTeX Format"}
          </DialogTitle>
          {currentUser ? (
            <div className="space-y-2">
              <DialogDescription className="flex items-center gap-1 text-xs">
                <Cloud className="h-3.5 w-3.5 text-emerald-500" />
                <span>Save to cloud for access across all devices</span>
              </DialogDescription>
              <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-md">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">Cloud Sync</span>
                </div>
                <Switch 
                  checked={saveToCloud}
                  onCheckedChange={setSaveToCloud}
                />
              </div>
              {!saveToCloud && (
                <DialogDescription className="flex items-center gap-1 text-xs text-amber-600">
                  <Info className="h-3.5 w-3.5" />
                  <span>Template will only be saved locally</span>
                </DialogDescription>
              )}
            </div>
          ) : (
            <DialogDescription className="flex items-center gap-1 text-xs">
              <CloudOff className="h-3.5 w-3.5 text-gray-500" />
              <span>Sign in to save templates to the cloud</span>
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              {promptType === 'resume' ? "Resume Name" : "Cover Letter Template Name"}
            </Label>
            <Input
              id="name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={promptType === 'resume' 
                ? "e.g., Software Engineer Resume" 
                : "e.g., Standard Cover Letter"
              }
            />
          </div>

          {promptType === 'resume' ? (
            <div className="grid gap-2">
              <Label htmlFor="resumeLatex">Resume LaTeX Format</Label>              
              <div className="h-72 overflow-y-auto border rounded-md">
                <Textarea
                  id="resumeLatex"
                  value={resumeLatex}
                  onChange={(e) => setResumeLatex(e.target.value)}
                  placeholder="Paste your resume in LaTeX format here"
                  className="h-full resize-none font-mono text-xs leading-relaxed"
                />
              </div>              <p className="text-xs text-gray-500">
                Save your LaTeX resume for quick access later{currentUser && saveToCloud ? " (synced across devices)" : currentUser ? " (local storage only)" : ""}.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="coverLetterTemplate">Cover Letter LaTeX Format</Label>
              <div className="h-72 overflow-y-auto border rounded-md">
                <Textarea
                  id="coverLetterTemplate"
                  value={coverLetterTemplate}
                  onChange={(e) => setCoverLetterTemplate(e.target.value)}
                  placeholder="Paste your cover letter template in LaTeX format here"
                  className="h-full resize-none font-mono text-xs leading-relaxed"
                />
              </div>              <p className="text-xs text-gray-500">
                Save your LaTeX cover letter template for quick access later{currentUser && saveToCloud ? " (synced across devices)" : currentUser ? " (local storage only)" : ""}.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="sticky bottom-0 pt-4 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {promptType === 'resume' ? "Save Resume" : "Save Cover Letter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
