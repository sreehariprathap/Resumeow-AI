// File: src/App.tsx
import { useState } from "react";
import { PromptTypeSelector } from "./components/PromptTypeSelector";
import { JobDescriptionInput } from "./components/JobDescriptionInput";
import { ResumeInput } from "./components/ResumeInput";
import { PromptDisplay } from "./components/PromptDisplay";
import { useTemplates } from "./hooks/useTemplates";
import { usePromptGenerator } from "./hooks/usePromptGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Checkbox } from "@radix-ui/react-checkbox";
import { Textarea } from "./components/ui/textarea";
import { Button } from "./components/ui/button";

function App() {
  const { resumeTemplates, coverLetterTemplates } = useTemplates();
  const { generateResumePrompt, generateCoverLetterPrompt } = usePromptGenerator();

  const [promptType, setPromptType] = useState<"resume" | "coverLetter">("resume");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeContent, setResumeContent] = useState("");
  const [showResumeInput, setShowResumeInput] = useState(false);
  const [hasOptionalInstructions, setHasOptionalInstructions] = useState(false);
  const [optionalInstructions, setOptionalInstructions] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const currentTemplates =
    promptType === "resume" ? resumeTemplates : coverLetterTemplates;

  const selectedTemplate = currentTemplates.find(
    (t) => t.id === selectedTemplateId
  );

  const generatePrompt = () => {
    if (!jobDescription || !selectedTemplateId) return;

    const baseProps = {
      jobDescription,
      resumeContent,
      showResumeInput,
      optionalInstructions,
    };

    const prompt =
      promptType === "resume"
        ? generateResumePrompt({ ...baseProps, resumeTemplate: selectedTemplate?.id || "" })
        : generateCoverLetterPrompt({ ...baseProps, coverTemplate: selectedTemplate?.id || "" });

    setGeneratedPrompt(prompt);
  };

  const copyPrompt = () => {
    navigator.clipboard
      .writeText(generatedPrompt)
      .then(() => alert("Prompt copied to clipboard!"))
      .catch((err) => console.error("Failed to copy: ", err));
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
            onChange={(value) => {
              setPromptType(value as "resume" | "coverLetter");
              setSelectedTemplateId("");
            }}
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
              className="h-3 w-3"
            />
            <label htmlFor="showResume" className="text-xs font-medium">
              Show resume input
            </label>
          </div>

          {showResumeInput && (
            <ResumeInput
              resumeContent={resumeContent}
              onChange={(e) => setResumeContent(e.target.value)}
            />
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium">
              Select Template:
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full h-8 text-sm border rounded"
            >
              <option value="">Select a template</option>
              {currentTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="instructions"
                checked={hasOptionalInstructions}
                onCheckedChange={(checked) =>
                  setHasOptionalInstructions(checked === true)
                }
                className="h-3 w-3"
              />
              <label htmlFor="instructions" className="text-xs font-medium">
                Include optional instructions
              </label>
            </div>
            {hasOptionalInstructions && (
              <div className="h-20 overflow-y-auto border rounded-md">
                <Textarea
                  placeholder="Add any optional instructions here"
                  value={optionalInstructions}
                  onChange={(e) => setOptionalInstructions(e.target.value)}
                  className="text-sm w-full h-full resize-none border-0"
                />
              </div>
            )}
          </div>

          <Button onClick={generatePrompt} className="w-full h-8 text-sm">
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
