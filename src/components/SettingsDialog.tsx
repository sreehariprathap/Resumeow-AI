import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Plus, Edit, Trash, Check, Download, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { CustomPromptDialog } from "./CustomPromptDialog";
import type { CustomPrompt, PromptType } from "@/types";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customPrompts: CustomPrompt[];
  activePrompts: Record<PromptType, string>;
  onAddCustomPrompt: (prompt: CustomPrompt) => void;
  onUpdateCustomPrompt: (promptId: string, prompt: CustomPrompt) => void;
  onDeleteCustomPrompt: (promptId: string) => void;
  onSetActivePrompt: (type: PromptType, promptId: string) => void;
}

export const SettingsDialog = ({
  isOpen,
  onClose,
  customPrompts,
  activePrompts,
  onAddCustomPrompt,
  onUpdateCustomPrompt,
  onDeleteCustomPrompt,
  onSetActivePrompt
}: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState<string>("resume");
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | undefined>(undefined);
  const [localActivePrompts, setLocalActivePrompts] = useState<Record<PromptType, string>>(activePrompts);

  // Reset local state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalActivePrompts(activePrompts);
    }
  }, [isOpen, activePrompts]);

  const handlePromptSave = (prompt: CustomPrompt) => {
    if (editingPrompt) {
      onUpdateCustomPrompt(editingPrompt.id, prompt);
    } else {
      onAddCustomPrompt(prompt);
    }
    setIsPromptDialogOpen(false);
    setEditingPrompt(undefined);
  };

  const handleCreatePrompt = () => {
    setEditingPrompt(undefined);
    setIsPromptDialogOpen(true);
  };

  const handleEditPrompt = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
    setIsPromptDialogOpen(true);
  };

  const handleDeletePrompt = (promptId: string) => {
    if (confirm("Are you sure you want to delete this prompt?")) {
      onDeleteCustomPrompt(promptId);
    }
  };
  const handleSaveSettings = () => {
    // Save the active prompts
    Object.entries(localActivePrompts).forEach(([type, promptId]) => {
      onSetActivePrompt(type as PromptType, promptId);
    });
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
    
    const exportFileDefaultName = `resume-cover-letter-prompts-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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
        const importedData = JSON.parse(e.target?.result as string);
        if (importedData.customPrompts && Array.isArray(importedData.customPrompts)) {
          // Clear existing prompts if confirmed
          if (confirm("Do you want to replace all existing prompts with the imported ones? Click Cancel to merge instead.")) {
            // Replace all prompts
            importedData.customPrompts.forEach((prompt: CustomPrompt) => {
              onAddCustomPrompt(prompt);
            });
          } else {
            // Merge prompts
            importedData.customPrompts.forEach((prompt: CustomPrompt) => {
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
          
          alert("Prompts imported successfully!");
        } else {
          alert("Invalid import file format.");
        }
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to import prompts. Please check the file format.");
      }
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prompt Settings</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="resume">Resume Prompts</TabsTrigger>
              <TabsTrigger value="coverLetter">Cover Letter Prompts</TabsTrigger>
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
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
            <div className="text-xs text-muted-foreground mt-4">
            <p>
              <strong>Instructions:</strong> Custom prompts should include placeholders to indicate where your 
              resume, job description and optional instructions will be inserted.
            </p>
          </div>
          
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
          
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportPrompts}
              className="flex items-center gap-1 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Prompts</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={triggerImportFile}
              className="flex items-center gap-1 text-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Prompts</span>
            </Button>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSaveSettings} className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              <span>Save Settings</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <CustomPromptDialog
        isOpen={isPromptDialogOpen}
        onClose={() => setIsPromptDialogOpen(false)}
        onSave={handlePromptSave}
        initialPrompt={editingPrompt}
        isEditing={!!editingPrompt}
      />
    </>
  );
};
