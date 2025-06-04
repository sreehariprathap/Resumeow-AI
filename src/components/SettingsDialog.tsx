import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Plus, Edit, Trash, Check, Download, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { CustomPromptDialog } from "./CustomPromptDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { AIProviderSelector } from "./AIProviderSelector";
import { useAuth } from "@/lib/authContext";
import { useAIProvider } from "@/lib/aiProviderContext";
import { saveUserData, getUserData } from "@/lib/firebaseWeb";
import { toast } from "sonner";
import type { CustomPrompt, PromptType } from "@/types";
import { ModeToggle } from "./mode-toggle";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customPrompts: CustomPrompt[];
  activePrompts: Record<PromptType, string>;
  onAddCustomPrompt: (prompt: CustomPrompt) => void;
  onUpdateCustomPrompt: (promptId: string, prompt: CustomPrompt) => void;
  onDeleteCustomPrompt: (promptId: string) => void;
  onSetActivePrompt: (type: PromptType, promptId: string) => void;
  resetTemplates: () => void;
}

export const SettingsDialog = ({
  isOpen,
  onClose,
  customPrompts,
  activePrompts,
  onAddCustomPrompt,
  onUpdateCustomPrompt,
  onDeleteCustomPrompt,
  onSetActivePrompt,
  resetTemplates
}: SettingsDialogProps) => {  const { currentUser } = useAuth();
  const { openRouterApiKey, setOpenRouterApiKey } = useAIProvider();
  const [activeTab, setActiveTab] = useState<string>("resume");
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | undefined>(undefined);
  const [localActivePrompts, setLocalActivePrompts] = useState<Record<PromptType, string>>(activePrompts);
  const [googleApiKey, setGoogleApiKey] = useState<string>("");
  const [localOpenRouterApiKey, setLocalOpenRouterApiKey] = useState<string>("");const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    promptIdToDelete: "",
    isImportReplace: false,
    isResetTemplates: false,
    importData: null as unknown  });
  // Load user settings including API key from Firebase
  const loadUserSettings = useCallback(async () => {
    if (currentUser) {
      try {
        const userData = await getUserData(currentUser.uid, "settings");        if (userData) {
          if (userData.googleApiKey) setGoogleApiKey(userData.googleApiKey as string);
          if (userData.openRouterApiKey) setLocalOpenRouterApiKey(userData.openRouterApiKey as string);
        }
      } catch (error) {
        console.error("Error loading user settings:", error);
      }
    }
  }, [currentUser]);
  // Reset local state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalActivePrompts(activePrompts);
      setLocalOpenRouterApiKey(openRouterApiKey);
      loadUserSettings();
    }
  }, [isOpen, activePrompts, openRouterApiKey, loadUserSettings]);


  const handlePromptSave = (prompt: CustomPrompt) => {
    if (editingPrompt) {
      onUpdateCustomPrompt(editingPrompt.id, prompt);
      toast.success("Prompt updated successfully");
    } else {
      onAddCustomPrompt(prompt);
      toast.success("Prompt created successfully");
    }
    setIsPromptDialogOpen(false);
    setEditingPrompt(undefined);
  }; const handleCreatePrompt = () => {
    setEditingPrompt(undefined);
    setIsPromptDialogOpen(true);
  };

  const handleEditPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setIsPromptDialogOpen(true);
  };
  const handleDeletePrompt = (promptId: string) => {
    setConfirmDialogState({
      isOpen: true,
      title: "Delete Prompt",
      message: "Are you sure you want to delete this prompt?",
      promptIdToDelete: promptId,
      isImportReplace: false,
      isResetTemplates: false,
      importData: null
    });
  };

  const confirmDeletePrompt = () => {
    if (confirmDialogState.promptIdToDelete) {
      onDeleteCustomPrompt(confirmDialogState.promptIdToDelete);
      toast.success("Prompt deleted successfully");
    }
  };  const handleSaveSettings = async () => {
    // Save the active prompts selection locally
    Object.entries(localActivePrompts).forEach(([type, promptId]) => {
      onSetActivePrompt(type as PromptType, promptId);
    });    // Update OpenRouter API key in context
    if (localOpenRouterApiKey !== openRouterApiKey) {
      setOpenRouterApiKey(localOpenRouterApiKey);
    }

    // Get currently active prompt objects
    const activeResumePrompt = customPrompts.find(p => p.id === localActivePrompts.resume);
    const activeCoverPrompt = customPrompts.find(p => p.id === localActivePrompts.coverLetter);    // Prepare user settings
    const userSettings = {
      googleApiKey,
      openRouterApiKey: localOpenRouterApiKey,
      activeResumePrompt: activeResumePrompt ? {
        id: activeResumePrompt.id,
        name: activeResumePrompt.name,
        content: activeResumePrompt.content,
      } : null,
      activeCoverPrompt: activeCoverPrompt ? {
        id: activeCoverPrompt.id,
        name: activeCoverPrompt.name,
        content: activeCoverPrompt.content,
      } : null,
      updatedAt: new Date().toISOString()
    };

    // Save user settings including API key and prompts
    if (currentUser) {
      try {
        await saveUserData(currentUser.uid, "settings", userSettings);
        toast.success("Settings saved successfully");
      } catch (error) {
        console.error("Error saving user settings:", error);
        toast.error("Failed to save settings");
      }
    } else {
      toast.success("Prompt settings saved successfully");
    }

    onClose();
  };


  const exportPrompts = () => {
    const exportData = {
      customPrompts,
      activePrompts: localActivePrompts,
      exported: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileDefaultName = `resume-cover-letter-prompts-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success("Prompts exported successfully");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerImportFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);        if (importedData.customPrompts && Array.isArray(importedData.customPrompts)) {
          setConfirmDialogState({
            isOpen: true,
            title: "Import Prompts",
            message: "Do you want to replace all existing prompts with the imported ones? Click Cancel to merge instead.",
            promptIdToDelete: "",
            isImportReplace: true,
            isResetTemplates: false,
            importData: importedData
          });
        } else {
          toast.error("Invalid import file format.");
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Failed to import prompts. Please check the file format.");
      }

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    const importedData = confirmDialogState.importData as Record<string, unknown>;
    if (!importedData) return;

    if (confirmDialogState.isImportReplace) {
      // Replace all prompts
      (importedData.customPrompts as CustomPrompt[]).forEach((prompt: CustomPrompt) => {
        onAddCustomPrompt(prompt);
      });
    } else {
      // Merge prompts
      (importedData.customPrompts as CustomPrompt[]).forEach((prompt: CustomPrompt) => {
        // Check if prompt with same id exists
        const exists = customPrompts.some(p => p.id === prompt.id);
        if (!exists) {
          onAddCustomPrompt(prompt);
        }
      });
    }

    // Import active prompts
    if (importedData.activePrompts) {
      Object.entries(importedData.activePrompts).forEach(([type, promptId]) => {
        setLocalActivePrompts(prev => ({
          ...prev,
          [type]: promptId as string
        }));
      });
    }

    toast.success("Prompts imported successfully!");
  };

  const filteredPrompts = (type: PromptType) => {
    return customPrompts.filter(prompt => prompt.type === type);
  };

  const handleActivePromptChange = (type: PromptType, promptId: string) => {
    setLocalActivePrompts(prev => ({
      ...prev,
      [type]: promptId
    }));
  };
  const handleResetTemplates = () => {
    setConfirmDialogState({
      isOpen: true,
      title: "Reset All Templates",
      message: "Are you sure you want to reset all templates? This will permanently delete all your saved resume templates, cover letter templates, and custom prompts. This action cannot be undone.",
      promptIdToDelete: "",
      isImportReplace: false,
      isResetTemplates: true,
      importData: null
    });
  };

  const confirmResetTemplates = () => {
    resetTemplates();
    toast.success("All templates have been reset to defaults");
    onClose(); // Close the settings dialog
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="coverLetter">Coverletter</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Resume Prompt Templates</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreatePrompt}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create</span>
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-medium mb-2">Active Prompt Template</div>
                <RadioGroup
                  value={localActivePrompts.resume || ""}
                  onValueChange={(value) => handleActivePromptChange('resume', value)}
                  className="space-y-2"
                >
                  {filteredPrompts('resume').map(prompt => (
                    <div key={prompt.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={prompt.id} id={`resume-${prompt.id}`} />
                        <Label htmlFor={`resume-${prompt.id}`} className="text-sm cursor-pointer">{prompt.name}</Label>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPrompt(prompt)}
                          className="h-6 w-6 p-0"
                          title="Edit prompt"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="h-6 w-6 p-0 text-red-500"
                          title="Delete prompt"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                {filteredPrompts('resume').length === 0 && (
                  <div className="text-sm text-center py-4 text-muted-foreground">
                    No resume prompts created yet. Click 'Create' to add one.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="coverLetter" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Cover Letter Prompt Templates</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreatePrompt}
                  className="h-7 text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create</span>
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-medium mb-2">Active Prompt Template</div>
                <RadioGroup
                  value={localActivePrompts.coverLetter || ""}
                  onValueChange={(value) => handleActivePromptChange('coverLetter', value)}
                  className="space-y-2"
                >
                  {filteredPrompts('coverLetter').map(prompt => (
                    <div key={prompt.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={prompt.id} id={`coverLetter-${prompt.id}`} />
                        <Label htmlFor={`coverLetter-${prompt.id}`} className="text-sm cursor-pointer">{prompt.name}</Label>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPrompt(prompt)}
                          className="h-6 w-6 p-0"
                          title="Edit prompt"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="h-6 w-6 p-0 text-red-500"
                          title="Delete prompt"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                {filteredPrompts('coverLetter').length === 0 && (
                  <div className="text-sm text-center py-4 text-muted-foreground">
                    No cover letter prompts created yet. Click 'Create' to add one.
                  </div>)}
              </div>
            </TabsContent>            <TabsContent value="general" className="mt-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">API Settings</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="openrouterApiKey" className="text-xs">
                      OpenRouter API Key
                    </Label>                    <Input
                      id="openrouterApiKey"
                      type="password"
                      value={localOpenRouterApiKey}
                      onChange={(e) => setLocalOpenRouterApiKey(e.target.value)}
                      placeholder="Enter your OpenRouter API Key"
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your OpenRouter API key for DeepSeek and other models.
                      Your key will be securely stored against your user account.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="googleApiKey" className="text-xs">
                      Custom Google API Key
                    </Label>
                    <Input
                      id="googleApiKey"
                      type="password"
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      placeholder="Enter your Google API Key"
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your personal Google API key for enhanced functionality.
                      Your key will be securely stored against your user account.
                    </p>
                  </div>
                </div>
              </div>              <div>
                <h3 className="text-sm font-medium mb-3">Preferred AI Model</h3>
                <div className="space-y-3">
                  <div className="p-3 border rounded-md bg-muted/5">
                    <div className="space-y-3">
                      <AIProviderSelector className="space-y-2" />
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          <strong>Your Preferred Model:</strong> This setting will be saved to your account and automatically applied when you use the app. The system will use this as your primary model for all AI operations.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          If your preferred model fails, the system will automatically use the alternative provider as a fallback.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div><div>
                <h3 className="text-sm font-medium mb-3">Other</h3>
                <div className="space-y-3">
                  <ModeToggle />
                  
                  {/* Reset Templates Section */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-2">Data Management</h4>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-md bg-muted/10">
                        <h5 className="text-xs font-medium mb-1">Reset All Templates</h5>
                        <p className="text-xs text-muted-foreground mb-3">
                          This will permanently delete all your saved resume templates, cover letter templates, and custom prompts. 
                          You will lose all your saved data and it cannot be recovered.
                        </p>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleResetTemplates}
                          className="h-7 text-xs"
                        >
                          Reset All Templates
                        </Button>
                      </div>
                    </div>
                  </div>
                    <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-2">Legal</h4>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => window.open('https://github.com/sreehariprathap/Resumeow-AI/blob/awesome-resumeow/privacy-policy.md', '_blank')}
                        className="text-xs text-primary hover:underline text-left"
                      >
                        Privacy Policy
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Learn how we handle your data and protect your privacy
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {activeTab !== "general" && (
            <div className="text-xs text-muted-foreground mt-4">
              <p>
                <strong>Instructions:</strong> Custom prompts should include placeholders to indicate where your
                resume, job description and optional instructions will be inserted.
              </p>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline"
              size="sm"
              onClick={exportPrompts}
              className="flex items-center gap-1 text-xs"
              disabled={activeTab === "general"}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Prompts</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerImportFile}
              className="flex items-center gap-1 text-xs"
              disabled={activeTab === "general"}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Prompts</span>
            </Button>          </div>

          <DialogFooter className="sticky bottom-0 pt-4 bg-background">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSaveSettings} className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              <span>Save Settings</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      <CustomPromptDialog
        isOpen={isPromptDialogOpen}
        onClose={() => setIsPromptDialogOpen(false)}
        onSave={handlePromptSave}
        initialPrompt={editingPrompt}
        isEditing={!!editingPrompt}
        initialType={activeTab as PromptType}
      />      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        onClose={() => setConfirmDialogState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={
          confirmDialogState.promptIdToDelete 
            ? confirmDeletePrompt 
            : confirmDialogState.isResetTemplates 
              ? confirmResetTemplates 
              : confirmImport
        }
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText={
          confirmDialogState.promptIdToDelete 
            ? "Delete" 
            : confirmDialogState.isResetTemplates 
              ? "Reset All Templates" 
              : "Replace"
        }
        cancelText={
          confirmDialogState.promptIdToDelete 
            ? "Cancel" 
            : confirmDialogState.isResetTemplates 
              ? "Cancel" 
              : "Merge"
        }
      />
    </>
  );
};
