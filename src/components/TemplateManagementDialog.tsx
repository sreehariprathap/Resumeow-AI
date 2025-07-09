import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { Edit, Trash2, FileText, Save, X, Cloud, CloudOff, Download, Upload } from "lucide-react";
import type { Template, PromptType } from "@/types";
import { useAuth } from "@/lib/authContext";
import { ConfirmDialog } from "./ConfirmDialog";

interface TemplateManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resumeTemplates: Template[];
  coverLetterTemplates: Template[];
  onUpdateTemplate: (type: PromptType, templateId: string, updatedTemplate: Partial<Template>) => void;
  onDeleteTemplate: (type: PromptType, templateId: string) => void;
  onAddTemplate: (type: PromptType, template: Template) => void;
}

interface EditingTemplate {
  id: string;
  type: PromptType;
  name: string;
  content: string;
}

export const TemplateManagementDialog = ({
  isOpen,
  onClose,
  resumeTemplates,
  coverLetterTemplates,
  onUpdateTemplate,
  onDeleteTemplate,
  onAddTemplate
}: TemplateManagementDialogProps) => {
  const { currentUser } = useAuth();
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<PromptType>("resume");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDialogState, setConfirmDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    isImportReplace: false,
    importData: null as unknown
  });

  // Export templates function
  const exportTemplates = () => {
    const exportData = {
      version: "1.0",
      exportType: "PrompterTemplatesExport",
      resumeTemplates,
      coverLetterTemplates,
      exported: new Date().toISOString(),
      description: "Resume and cover letter templates backup export"
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileDefaultName = `prompter-templates-backup-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success("Templates exported successfully!");
  };

  // Import templates function
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
        
        // Check if it's a templates export
        if (importedData.exportType === "PrompterTemplatesExport" && importedData.version) {
          setConfirmDialogState({
            isOpen: true,
            title: "Import Templates",
            message: "This will import resume and cover letter templates. Do you want to replace all existing templates with the imported ones? Click Cancel to merge instead.",
            isImportReplace: true,
            importData: importedData
          });
        }
        // Check if it's a comprehensive export containing templates
        else if (importedData.exportType === "PrompterExport" && importedData.version) {
          setConfirmDialogState({
            isOpen: true,
            title: "Import Templates from Complete Export",
            message: "This appears to be a complete export file. Do you want to import just the templates from it? Click Cancel to merge instead.",
            isImportReplace: true,
            importData: importedData
          });
        } else {
          toast.error("Invalid import file format. Please ensure you're importing a valid templates export file.");
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Failed to import templates. Please check the file format.");
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

    let importedCount = 0;

    // Import resume templates
    if (importedData.resumeTemplates && Array.isArray(importedData.resumeTemplates)) {
      (importedData.resumeTemplates as Template[]).forEach((template: Template) => {
        if (confirmDialogState.isImportReplace) {
          // Replace mode - always add
          onAddTemplate('resume', template);
          importedCount++;
        } else {
          // Merge mode - only add if doesn't exist
          const exists = resumeTemplates.some(t => t.id === template.id);
          if (!exists) {
            onAddTemplate('resume', template);
            importedCount++;
          }
        }
      });
    }

    // Import cover letter templates
    if (importedData.coverLetterTemplates && Array.isArray(importedData.coverLetterTemplates)) {
      (importedData.coverLetterTemplates as Template[]).forEach((template: Template) => {
        if (confirmDialogState.isImportReplace) {
          // Replace mode - always add
          onAddTemplate('coverLetter', template);
          importedCount++;
        } else {
          // Merge mode - only add if doesn't exist
          const exists = coverLetterTemplates.some(t => t.id === template.id);
          if (!exists) {
            onAddTemplate('coverLetter', template);
            importedCount++;
          }
        }
      });
    }

    if (importedCount > 0) {
      toast.success(`Successfully imported ${importedCount} template(s)!`);
    } else {
      toast.info("No new templates to import (all templates already exist).");
    }
  };

  const handleEditTemplate = (template: Template, type: PromptType) => {
    const content = type === "resume" ? (template.resumeLatex || "") : (template.coverLetterTemplate || "");
    setEditingTemplate({
      id: template.id,
      type,
      name: template.name,
      content
    });
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;

    if (!editingTemplate.name.trim()) {
      toast.error("Template name cannot be empty");
      return;
    }

    const updateData: Partial<Template> = {
      name: editingTemplate.name.trim(),
      ...(editingTemplate.type === "resume" 
        ? { resumeLatex: editingTemplate.content }
        : { coverLetterTemplate: editingTemplate.content }
      )
    };

    onUpdateTemplate(editingTemplate.type, editingTemplate.id, updateData);
    setEditingTemplate(null);
    toast.success("Template updated successfully!");
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (template: Template, type: PromptType) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      onDeleteTemplate(type, template.id);
      toast.success("Template deleted successfully!");
    }
  };

  const copyToClipboard = (content: string, templateName: string) => {
    navigator.clipboard.writeText(content)
      .then(() => toast.success(`${templateName} LaTeX copied to clipboard!`))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };

  const renderTemplateCard = (template: Template, type: PromptType) => {
    const content = type === "resume" ? template.resumeLatex : template.coverLetterTemplate;
    const hasContent = content && content.trim().length > 0;
    const isEditing = editingTemplate?.id === template.id;

    if (isEditing) {
      return (
        <Card key={template.id} className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Edit Template</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs">
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="edit-name" className="text-xs">Template Name</Label>
              <Input
                id="edit-name"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="edit-content" className="text-xs">LaTeX Content</Label>
              <div className="h-48 border rounded-md">
                <Textarea
                  id="edit-content"
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                  placeholder={`Paste your ${type === "resume" ? "resume" : "cover letter"} LaTeX content here`}
                  className="h-full resize-none font-mono text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={template.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{template.name}</CardTitle>
              <div className="flex gap-1">
                {hasContent && <Badge variant="secondary" className="text-xs"><FileText className="h-3 w-3 mr-1" />LaTeX</Badge>}
                {currentUser && <Badge variant="outline" className="text-xs"><Cloud className="h-3 w-3 mr-1" />Cloud</Badge>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEditTemplate(template, type)}
                className="h-7 px-2 text-xs"
                title="Edit template"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteTemplate(template, type)}
                className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete template"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {hasContent && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">LaTeX Content Preview</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(content, template.name)}
                  className="h-6 px-2 text-xs"
                >
                  Copy LaTeX
                </Button>
              </div>
              <div className="h-32 border rounded p-2 bg-gray-50 dark:bg-gray-900 overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">{content}</pre>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderTemplatesList = (templates: Template[], type: PromptType) => {
    if (templates.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No {type === "resume" ? "resume" : "cover letter"} templates saved yet.</p>
          <p className="text-xs mt-1">Add templates using the "Add {type === "resume" ? "Resume" : "Cover Letter"}" button in the main interface.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {templates.map(template => renderTemplateCard(template, type))}
      </div>
    );
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manage Saved Templates
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            View, edit, and manage your saved resume and cover letter templates.
            {currentUser ? " Templates are synced to the cloud." : " Sign in to sync templates across devices."}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PromptType)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="resume" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resume Templates ({resumeTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="coverLetter" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Cover Letter Templates ({coverLetterTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="flex-1 overflow-auto mt-4 min-h-0">
            {renderTemplatesList(resumeTemplates, "resume")}
          </TabsContent>

          <TabsContent value="coverLetter" className="flex-1 overflow-auto mt-4 min-h-0">
            {renderTemplatesList(coverLetterTemplates, "coverLetter")}
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4 flex-shrink-0">
          <div className="flex items-center gap-2 w-full">
            {!currentUser && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-auto">
                <CloudOff className="h-3 w-3" />
                Sign in to sync templates to the cloud
              </div>
            )}
            <div className="flex gap-2 ml-auto items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={exportTemplates}
                className="flex items-center gap-1 text-xs"
                disabled={resumeTemplates.length === 0 && coverLetterTemplates.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                Export Templates
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerImportFile}
                className="flex items-center gap-1 text-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                Import Templates
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogFooter>

        {/* Hidden file input for importing */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFile}
          accept=".json"
          className="hidden"
        />
      </DialogContent>
      
      {/* Confirm Dialog for Import */}
      <ConfirmDialog
        isOpen={confirmDialogState.isOpen}
        onClose={() => setConfirmDialogState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmImport}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText="Replace"
        cancelText="Merge"
      />
    </Dialog>
  );
};
