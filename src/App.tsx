import { useEffect, useState } from "react";
import { JobDescriptionInput } from "./components/JobDescriptionInput";
import { ResumeInput } from "./components/ResumeInput";
import { PromptDisplay } from "./components/PromptDisplay";
import { OptionalInstructions } from "./components/OptionalInstructions";
import { TemplateSelector } from "./components/TemplateSelector";
import { PromptTypeSelector } from "./components/PromptTypeSelector";
import { SettingsDialog } from "./components/SettingsDialog"; 
import { useTemplates } from "./hooks/useTemplates";
import { usePromptGenerator } from "./hooks/usePromptGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Settings } from "lucide-react";
import type { CustomPrompt, Template, PromptType } from "./types";

function App() {
  const { 
    resumeTemplates, 
    coverLetterTemplates,
    customPrompts,
    addTemplate, 
    addCustomPrompt,
    updateCustomPrompt,
    deleteCustomPrompt,
    setActivePrompt
  } = useTemplates();
  
  const { generateResumePrompt, generateCoverLetterPrompt } = usePromptGenerator();

  const [promptType, setPromptType] = useState<PromptType>('resume');
  const [jobDescription, setJobDescription] = useState("");
  const [resumeContent, setResumeContent] = useState("");
  const [coverLetterTemplate, setCoverLetterTemplate] = useState("");
  const [hasOptionalInstructions, setHasOptionalInstructions] = useState(false);
  const [optionalInstructions, setOptionalInstructions] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const saved = localStorage.getItem("selectedTemplateId");
    return saved && saved !== "" ? saved : "no-selection";
  });
  const [selectedCoverLetterTemplateId, setSelectedCoverLetterTemplateId] = useState<string>(() => {
    const saved = localStorage.getItem("selectedCoverLetterTemplateId");
    return saved && saved !== "" ? saved : "no-selection";
  });
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activePrompts, setActivePrompts] = useState<Record<PromptType, string>>({
    resume: localStorage.getItem('activePrompt_resume') || '',
    coverLetter: localStorage.getItem('activePrompt_coverLetter') || ''
  });

  // Persist user preferences
  useEffect(() => {
    // Only save valid template IDs
    if (selectedTemplateId && selectedTemplateId !== "no-selection") {
      localStorage.setItem("selectedTemplateId", selectedTemplateId);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    // Only save valid template IDs
    if (selectedCoverLetterTemplateId && selectedCoverLetterTemplateId !== "no-selection") {
      localStorage.setItem("selectedCoverLetterTemplateId", selectedCoverLetterTemplateId);
    }
  }, [selectedCoverLetterTemplateId]);

  const handleGeneratePrompt = () => {
    if (!jobDescription) return;

    if (promptType === 'resume') {
      if (selectedTemplateId && selectedTemplateId !== "no-selection") {
        const prompt = generateResumePrompt({
          jobDescription,
          resumeContent,
          templateId: selectedTemplateId,
          showResumeInput: true,
          optionalInstructions: hasOptionalInstructions ? optionalInstructions : undefined
        });
        setGeneratedPrompt(prompt);
      }
    } else if (promptType === 'coverLetter') {
      if (selectedCoverLetterTemplateId && selectedCoverLetterTemplateId !== "no-selection") {
        const prompt = generateCoverLetterPrompt({
          jobDescription,
          resumeContent,
          templateId: selectedCoverLetterTemplateId,
          showResumeInput: true,
          optionalInstructions: hasOptionalInstructions ? optionalInstructions : undefined,
          coverLetterTemplate
        });
        setGeneratedPrompt(prompt);
      }
    }
  };

  const copyPrompt = () => {
    navigator.clipboard
      .writeText(generatedPrompt)
      .then(() => alert("Prompt copied to clipboard!"))
      .catch((err) => console.error("Failed to copy: ", err));
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId || "no-selection");
  };

  const handleCoverLetterTemplateChange = (templateId: string) => {
    setSelectedCoverLetterTemplateId(templateId || "no-selection");
    
    // Load cover letter template if available
    const template = coverLetterTemplates.find(t => t.id === templateId);
    if (template?.coverLetterTemplate) {
      setCoverLetterTemplate(template.coverLetterTemplate);
    }
  };

  const handleAddTemplate = (template: Template) => {
    addTemplate(promptType, template);
  };

  const handlePromptTypeChange = (value: string) => {
    setPromptType(value as PromptType);
  };

  const handleAddCustomPrompt = (prompt: CustomPrompt) => {
    addCustomPrompt(prompt);
  };

  const handleUpdateCustomPrompt = (promptId: string, prompt: CustomPrompt) => {
    updateCustomPrompt(promptId, prompt);
  };

  const handleDeleteCustomPrompt = (promptId: string) => {
    deleteCustomPrompt(promptId);
  };

  const handleSetActivePrompt = (type: PromptType, promptId: string) => {
    setActivePrompt(type, promptId);
    setActivePrompts(prev => ({
      ...prev,
      [type]: promptId
    }));
  };

  return (
    <div className="w-[400px] h-[600px] overflow-auto p-2">
      <Card className="w-full shadow-none border-0">
        <CardHeader className="px-4 py-3">
          <CardAction>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 w-8 p-0"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </CardAction>          <CardTitle className="text-lg">Resume & Cover Letter Generator</CardTitle>
          <CardDescription className="text-xs">
            Create custom prompts for resumes and cover letters with reusable templates
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 px-4 py-3">
          <PromptTypeSelector
            promptType={promptType}
            onChange={handlePromptTypeChange}
          />
          
          <JobDescriptionInput
            jobDescription={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />

          <ResumeInput
            resumeContent={resumeContent}
            onChange={(e) => setResumeContent(e.target.value)}
          />
          
          {promptType === 'resume' ? (
            <TemplateSelector
              templates={resumeTemplates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={handleTemplateChange}
              onAddTemplate={handleAddTemplate}
              onLoadResume={(resumeLatex) => setResumeContent(resumeLatex)}
            />
          ) : (
            <>
              <TemplateSelector
                templates={coverLetterTemplates}
                selectedTemplateId={selectedCoverLetterTemplateId}
                onSelectTemplate={handleCoverLetterTemplateChange}
                onAddTemplate={handleAddTemplate}
              />
              
              <div className="space-y-1">
                <Label htmlFor="coverLetterTemplate" className="text-xs font-medium">Cover Letter Template (Optional)</Label>
                <div className="h-28 overflow-y-auto border rounded-md">
                  <Textarea
                    id="coverLetterTemplate"
                    value={coverLetterTemplate}
                    onChange={(e) => setCoverLetterTemplate(e.target.value)}
                    placeholder="Enter a cover letter template structure (optional)"
                    className="text-sm w-full h-full resize-none border-0"
                  />
                </div>
              </div>
            </>
          )}

          <OptionalInstructions
            hasInstructions={hasOptionalInstructions}
            instructions={optionalInstructions}
            onToggleInstructions={setHasOptionalInstructions}
            onInstructionsChange={(e) => setOptionalInstructions(e.target.value)}
          />
          
          <Button 
            onClick={handleGeneratePrompt} 
            className="w-full h-8 text-sm"
            disabled={!jobDescription || 
              (promptType === 'resume' && (!selectedTemplateId || selectedTemplateId === "no-selection")) ||
              (promptType === 'coverLetter' && (!selectedCoverLetterTemplateId || selectedCoverLetterTemplateId === "no-selection"))
            }
          >
            Generate {promptType === 'resume' ? 'Resume' : 'Cover Letter'} Prompt
          </Button>

          {generatedPrompt && (
            <PromptDisplay prompt={generatedPrompt} onCopy={copyPrompt} />
          )}
        </CardContent>
      </Card>
      
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        customPrompts={customPrompts}
        activePrompts={activePrompts}
        onAddCustomPrompt={handleAddCustomPrompt}
        onUpdateCustomPrompt={handleUpdateCustomPrompt}
        onDeleteCustomPrompt={handleDeleteCustomPrompt}
        onSetActivePrompt={handleSetActivePrompt}
      />
    </div>
  );
}

export default App;

