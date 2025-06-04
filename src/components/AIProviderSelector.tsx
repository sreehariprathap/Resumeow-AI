import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { useAIProvider, AVAILABLE_MODELS } from '@/lib/aiProviderContext';
import { Bot, Sparkles } from 'lucide-react';

interface AIProviderSelectorProps {
  className?: string;
}

export function AIProviderSelector({ className }: AIProviderSelectorProps) {
  const { selectedModel, setSelectedModel, isLoading } = useAIProvider();

  const handleModelChange = (modelId: string) => {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(model);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openrouter':
        return <Bot className="h-4 w-4" />;
      case 'gemini':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Label className="text-xs">Preferred AI Model</Label>
        <div className="h-8 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Label className="text-xs">Preferred AI Model</Label>
      <Select value={selectedModel.id} onValueChange={handleModelChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue>
            <div className="flex items-center gap-2">
              {getProviderIcon(selectedModel.provider)}
              <span>{selectedModel.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                {getProviderIcon(model.provider)}
                <span>{model.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
