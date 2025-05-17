// File: src/App.tsx
import { useEffect, useState } from "react";
import { PromptTypeSelector } from "./components/PromptTypeSelector";
import { JobDescriptionInput } from "./components/JobDescriptionInput";
import { ResumeInput } from "./components/ResumeInput";
import { PromptDisplay } from "./components/PromptDisplay";
import { OptionalInstructions } from "./components/OptionalInstructions";
import { TemplateSelector } from "./components/TemplateSelector";
import { useTemplates } from "./hooks/useTemplates";
import { usePromptGenerator } from "./hooks/usePromptGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Checkbox } from "./components/ui/checkbox";
import { Button } from "./components/ui/button";
import type { PromptType } from "./types";

function App() {
  const { 
    resumeTemplates, 
    coverLetterTemplates, 
    addTemplate
  } = useTemplates();
  
  const { generateResumePrompt, generateCoverLetterPrompt } = usePromptGenerator();

  // Load saved preferences from localStorage
  const getSavedPromptType = (): PromptType => {
    const saved = localStorage.getItem("promptType");
    return (saved === "resume" || saved === "coverLetter") ? saved : "resume";
  };
  
  const [promptType, setPromptType] = useState<PromptType>(getSavedPromptType());
  const [jobDescription, setJobDescription] = useState("");
  const [resumeContent, setResumeContent] = useState("");
  const [showResumeInput, setShowResumeInput] = useState(false);
  const [hasOptionalInstructions, setHasOptionalInstructions] = useState(false);
  const [optionalInstructions, setOptionalInstructions] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(localStorage.getItem("selectedTemplateId") || "");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  // Persist user preferences
  useEffect(() => {
    localStorage.setItem("promptType", promptType);
  }, [promptType]);

  useEffect(() => {
    localStorage.setItem("selectedTemplateId", selectedTemplateId);
  }, [selectedTemplateId]);

  const currentTemplates =
    promptType === "resume" ? resumeTemplates : coverLetterTemplates;

  const selectedTemplate = currentTemplates.find(
    (t) => t.id === selectedTemplateId
  );

  const handleGeneratePrompt = () => {
    if (!jobDescription || !selectedTemplateId || !selectedTemplate) return;

    const baseProps = {
      jobDescription,
      resumeContent,
      templateId: selectedTemplateId,
      showResumeInput,
      optionalInstructions,
    };

    const prompt =
      promptType === "resume"
        ? generateResumePrompt(baseProps)
        : generateCoverLetterPrompt(baseProps);

    setGeneratedPrompt(prompt);
  };

  const copyPrompt = () => {
    navigator.clipboard
      .writeText(generatedPrompt)
      .then(() => alert("Prompt copied to clipboard!"))
      .catch((err) => console.error("Failed to copy: ", err));
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handlePromptTypeChange = (value: string) => {
    setPromptType(value as PromptType);
    setSelectedTemplateId("");
  };

  return (
    <div className="w-[400px] h-[600px] overflow-auto p-2">
      <Card className="w-full shadow-none border-0">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-lg">Prompt Generator</CardTitle>
          <CardDescription className="text-xs">
            Generate tailored prompts for resumes and cover letters
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showResume"
              checked={showResumeInput}
              onCheckedChange={(checked) =>
                setShowResumeInput(checked === true)
              }
            />
            <label htmlFor="showResume" className="text-xs font-medium cursor-pointer">
              Show resume input
            </label>
          </div>

          {showResumeInput && (
            <ResumeInput
              resumeContent={resumeContent}
              onChange={(e) => setResumeContent(e.target.value)}
            />
          )}

          <TemplateSelector
            promptType={promptType}
            templates={currentTemplates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={handleTemplateChange}
            onAddTemplate={addTemplate}
          />

          <OptionalInstructions
            hasInstructions={hasOptionalInstructions}
            instructions={optionalInstructions}
            onToggleInstructions={setHasOptionalInstructions}
            onInstructionsChange={(e) => setOptionalInstructions(e.target.value)}
          />

          <Button 
            onClick={handleGeneratePrompt} 
            className="w-full h-8 text-sm"
            disabled={!jobDescription || !selectedTemplateId}
          >
            Generate Prompt
          </Button>

          {generatedPrompt && (
            <PromptDisplay prompt={generatedPrompt} onCopy={copyPrompt} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
