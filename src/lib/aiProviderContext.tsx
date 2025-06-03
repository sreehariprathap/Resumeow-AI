import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getUserData, saveUserData } from './firebase';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';

export type AIProvider = 'openrouter' | 'gemini';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 (Free)',
    provider: 'openrouter'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini'
  }
];

interface AIProviderContextType {
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  openRouterApiKey: string;
  setOpenRouterApiKey: (key: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  isLoading: boolean;
  makeAICall: (prompt: string) => Promise<string>;
}

const AIProviderContext = createContext<AIProviderContextType | null>(null);

interface AIProviderProviderProps {
  children: ReactNode;
}

export function AIProviderProvider({ children }: AIProviderProviderProps) {
  const { currentUser } = useAuth();
  const [selectedModel, setSelectedModelState] = useState<AIModel>(AVAILABLE_MODELS[0]);
  const [openRouterApiKey, setOpenRouterApiKeyState] = useState<string>('');
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from Firebase or environment variables
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load from environment variables first
        const envOpenRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
        const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
        
        setOpenRouterApiKeyState(envOpenRouterKey);
        setGeminiApiKeyState(envGeminiKey);

        // Load user preferences from Firebase if logged in
        if (currentUser) {
          const userData = await getUserData(currentUser.uid, "settings");
          if (userData) {
            if (userData.selectedAIModel) {
              const model = AVAILABLE_MODELS.find(m => m.id === userData.selectedAIModel);
              if (model) setSelectedModelState(model);
            }
            if (userData.openRouterApiKey) {
              setOpenRouterApiKeyState(userData.openRouterApiKey as string);
            }
            if (userData.googleApiKey) {
              setGeminiApiKeyState(userData.googleApiKey as string);
            }
          }
        }
      } catch (error) {
        console.error("Error loading AI provider settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [currentUser]);

  // Save settings to Firebase
  const saveSettings = async (updates: Partial<{
    selectedAIModel: string;
    openRouterApiKey: string;
    googleApiKey: string;
  }>) => {
    if (!currentUser) return;

    try {
      const userData = await getUserData(currentUser.uid, "settings") || {};
      const updatedSettings = {
        ...userData,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await saveUserData(currentUser.uid, "settings", updatedSettings);
    } catch (error) {
      console.error("Error saving AI provider settings:", error);
    }
  };

  const setSelectedModel = async (model: AIModel) => {
    setSelectedModelState(model);
    await saveSettings({ selectedAIModel: model.id });
    toast.success(`Switched to ${model.name}`);
  };

  const setOpenRouterApiKey = async (key: string) => {
    setOpenRouterApiKeyState(key);
    await saveSettings({ openRouterApiKey: key });
  };

  const setGeminiApiKey = async (key: string) => {
    setGeminiApiKeyState(key);
    await saveSettings({ googleApiKey: key });
  };

  // Make AI call with failsafe
  const makeAICall = async (prompt: string): Promise<string> => {
    const primaryModel = selectedModel;
    const fallbackModel = AVAILABLE_MODELS.find(m => m.provider !== primaryModel.provider);

    try {
      // Try primary model first
      const result = await callAI(prompt, primaryModel);
      return result;
    } catch (error) {
      console.error(`Primary AI call failed with ${primaryModel.name}:`, error);
      
      if (fallbackModel) {
        try {
          toast.info(`${primaryModel.name} failed, trying ${fallbackModel.name}...`);
          const result = await callAI(prompt, fallbackModel);
          toast.warning(`Response generated using fallback provider: ${fallbackModel.name}`);
          return result;
        } catch (fallbackError) {
          console.error(`Fallback AI call failed with ${fallbackModel.name}:`, fallbackError);
          throw new Error(`Both AI providers failed. Primary: ${error instanceof Error ? error.message : 'Unknown error'}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
        }
      } else {
        throw error;
      }
    }
  };

  // Individual AI call function
  const callAI = async (prompt: string, model: AIModel): Promise<string> => {
    if (model.provider === 'openrouter') {
      if (!openRouterApiKey) {
        throw new Error('OpenRouter API key not found');
      }

      const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: openRouterApiKey,
        defaultHeaders: {
          'HTTP-Referer': 'https://resumeow-prompter.netlify.app/',
          'X-Title': 'Resumeow Prompter',
        },
        dangerouslyAllowBrowser: true,
      });

      const completion = await openai.chat.completions.create({
        model: model.id,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return completion.choices[0]?.message?.content || 'No response received';
    } else if (model.provider === 'gemini') {
      if (!geminiApiKey) {
        throw new Error('Gemini API key not found');
      }      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      
      const response = await ai.models.generateContent({
        model: model.id,
        contents: prompt
      });
      
      return response.text || 'No response received';
    } else {
      throw new Error(`Unsupported AI provider: ${model.provider}`);
    }
  };

  const value: AIProviderContextType = {
    selectedModel,
    setSelectedModel,
    openRouterApiKey,
    setOpenRouterApiKey,
    geminiApiKey,
    setGeminiApiKey,
    isLoading,
    makeAICall
  };

  return (
    <AIProviderContext.Provider value={value}>
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAIProvider() {
  const context = useContext(AIProviderContext);
  if (!context) {
    throw new Error('useAIProvider must be used within an AIProviderProvider');
  }
  return context;
}
