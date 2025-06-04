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
  userPreferredModel: AIModel; // Alias for selectedModel to make it clear this is the user's preference
  setSelectedModel: (model: AIModel) => void;
  setUserPreferredModel: (model: AIModel) => void; // Alias for setSelectedModel
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
  
  // Initialize with localStorage fallback or default model
  const getInitialModel = (): AIModel => {
    try {
      const savedModelId = localStorage.getItem('userPreferredModel');
      if (savedModelId) {
        const model = AVAILABLE_MODELS.find(m => m.id === savedModelId);
        if (model) return model;
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
    return AVAILABLE_MODELS[0];
  };

  const [selectedModel, setSelectedModelState] = useState<AIModel>(getInitialModel());
  const [openRouterApiKey, setOpenRouterApiKeyState] = useState<string>('');
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  // Load settings from Firebase or environment variables
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load user preferences from Firebase if logged in
        if (currentUser) {
          console.log("Loading settings for user:", currentUser.uid);
          const userData = await getUserData(currentUser.uid, "settings");
          console.log("User data from Firebase:", userData);
          
          if (userData) {
            // Check for both userPreferredModel and selectedAIModel for backward compatibility
            const preferredModelId = userData.userPreferredModel || userData.selectedAIModel;
            console.log("Preferred model ID from Firebase:", preferredModelId);
              if (preferredModelId) {
              const model = AVAILABLE_MODELS.find(m => m.id === preferredModelId);
              if (model) {
                console.log("Setting model from Firebase:", model);
                setSelectedModelState(model);
                // Also update localStorage to keep it in sync
                try {
                  localStorage.setItem('userPreferredModel', model.id);
                } catch (error) {
                  console.error("Error updating localStorage:", error);
                }
              } else {
                console.warn("Model not found in AVAILABLE_MODELS:", preferredModelId);
              }
            }
            
            if (userData.openRouterApiKey) {
              setOpenRouterApiKeyState(userData.openRouterApiKey as string);
            }
            if (userData.googleApiKey) {
              setGeminiApiKeyState(userData.googleApiKey as string);
            }
          } else {
            console.log("No user data found in Firebase");
          }
        } else {
          console.log("No current user, using default model");
          // Only reset to default if we haven't loaded any user preferences yet
          // This preserves the model selection during authentication state changes
        }
      } catch (error) {
        console.error("Error loading AI provider settings:", error);
      } finally {
        // Only set loading to false when we have a stable auth state
        if (currentUser !== undefined) {
          setIsLoading(false);
        }
      }
    };

    // Only load settings when we have a stable authentication state
    if (currentUser !== undefined) {
      loadSettings();
    }
  }, [currentUser]);
  // Save settings to Firebase
  const saveSettings = async (updates: Partial<{
    selectedAIModel: string;
    userPreferredModel: string; // Add explicit userPreferredModel field
    openRouterApiKey: string;
    googleApiKey: string;
  }>) => {
    if (!currentUser) return;

    try {
      const userData = await getUserData(currentUser.uid, "settings") || {};
      const updatedSettings = {
        ...userData,
        ...updates,
        // Ensure both fields are set for backward compatibility
        selectedAIModel: updates.selectedAIModel || updates.userPreferredModel,
        userPreferredModel: updates.userPreferredModel || updates.selectedAIModel,
        updatedAt: new Date().toISOString()
      };
      
      await saveUserData(currentUser.uid, "settings", updatedSettings);
    } catch (error) {
      console.error("Error saving AI provider settings:", error);
    }
  };  const setSelectedModel = async (model: AIModel) => {
    console.log("Setting selected model:", model);
    setSelectedModelState(model);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('userPreferredModel', model.id);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
    
    // Save to Firebase if user is logged in
    if (currentUser) {
      await saveSettings({ 
        selectedAIModel: model.id,
        userPreferredModel: model.id // Save with both field names for clarity
      });
    }
    
    toast.success(`Preferred model set to ${model.name}`);
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
    userPreferredModel: selectedModel, // Alias to make it clear this is the user's preferred model
    setSelectedModel,
    setUserPreferredModel: setSelectedModel, // Alias for better semantic naming
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
