import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getUserData, saveUserData } from './firebase';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';

export type AIProvider = 'deepseek' | 'openrouter' | 'gemini';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    provider: 'deepseek'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1 (Reasoner)',
    provider: 'deepseek'
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 via OpenRouter (Free)',
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
  userPreferredModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  setUserPreferredModel: (model: AIModel) => void;
  deepseekApiKey: string;
  setDeepseekApiKey: (key: string) => void;
  openRouterApiKey: string;
  setOpenRouterApiKey: (key: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  isLoading: boolean;
  makeAICall: (prompt: string) => Promise<string>;
  makeAICallWithModel: (prompt: string, modelId: string) => Promise<string>;
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
      if (currentUser) {
        const userKey = `user_${currentUser.uid}`;
        const savedModelId = localStorage.getItem(`${userKey}_userPreferredModel`);
        if (savedModelId) {
          const model = AVAILABLE_MODELS.find(m => m.id === savedModelId);
          if (model) return model;
        }
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
    return AVAILABLE_MODELS[0];
  };

  const [selectedModel, setSelectedModelState] = useState<AIModel>(getInitialModel());
  const [deepseekApiKey, setDeepseekApiKeyState] = useState<string>('');
  const [openRouterApiKey, setOpenRouterApiKeyState] = useState<string>('');
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  // Handle user changes - reset to default model when user changes or logs out
  useEffect(() => {
    if (!currentUser) {
      // User logged out - reset to default model
      setSelectedModelState(AVAILABLE_MODELS[0]);
      setDeepseekApiKeyState('');
      setOpenRouterApiKeyState('');
      setGeminiApiKeyState('');
    } else {
      // User logged in - load their preferred model from localStorage if available
      const userKey = `user_${currentUser.uid}`;
      try {
        const savedModelId = localStorage.getItem(`${userKey}_userPreferredModel`);
        if (savedModelId) {
          const model = AVAILABLE_MODELS.find(m => m.id === savedModelId);
          if (model) {
            setSelectedModelState(model);
          }
        }
      } catch (error) {
        console.error("Error loading user's preferred model:", error);
      }
    }
  }, [currentUser]); // Trigger when user changes  // Load settings from Firebase or environment variables with improved error handling
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load user preferences from Firebase if logged in
        if (currentUser) {
          console.log("Loading settings for user:", currentUser.uid);
          
          try {
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
                  setSelectedModelState(model);                // Also update localStorage to keep it in sync
                  try {
                    if (currentUser) {
                      const userKey = `user_${currentUser.uid}`;
                      localStorage.setItem(`${userKey}_userPreferredModel`, model.id);
                    }
                  } catch (error) {
                    console.error("Error updating localStorage:", error);
                  }
                } else {
                  console.warn("Model not found in AVAILABLE_MODELS:", preferredModelId);
                }
              }
              
              // Load API keys with validation
              if (userData.deepseekApiKey && typeof userData.deepseekApiKey === 'string') {
                setDeepseekApiKeyState(userData.deepseekApiKey);
              }
              if (userData.openRouterApiKey && typeof userData.openRouterApiKey === 'string') {
                setOpenRouterApiKeyState(userData.openRouterApiKey);
              }
              if (userData.googleApiKey && typeof userData.googleApiKey === 'string') {
                setGeminiApiKeyState(userData.googleApiKey);
              }
            } else {
              console.log("No user data found in Firebase");
            }
          } catch (firebaseError) {
            console.error("Error loading from Firebase:", firebaseError);
            // Firebase failed, try to load from localStorage
            if (currentUser) {
              const userKey = `user_${currentUser.uid}`;
              try {
                const savedModelId = localStorage.getItem(`${userKey}_userPreferredModel`);
                if (savedModelId) {
                  const model = AVAILABLE_MODELS.find(m => m.id === savedModelId);
                  if (model) {
                    setSelectedModelState(model);
                  }
                }
              } catch (error) {
                console.error("Error loading from localStorage:", error);
              }
            }
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
  }, [currentUser]);  // Save settings to Firebase with retry logic
  const saveSettings = async (updates: Partial<{
    selectedAIModel: string;
    userPreferredModel: string;
    deepseekApiKey: string;
    openRouterApiKey: string;
    googleApiKey: string;
  }>, retryCount = 0) => {
    if (!currentUser) return;

    try {
      const userData = await getUserData(currentUser.uid, "settings") || {};
      
      // Build updated settings, filtering out undefined values to prevent Firebase errors
      const updatedSettings: Record<string, unknown> = {
        ...userData,
        updatedAt: new Date().toISOString()
      };

      // Only add defined values to prevent Firebase "undefined field" errors
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          updatedSettings[key] = value;
        }
      });

      // Ensure backward compatibility for model fields if either is provided
      if (updates.selectedAIModel !== undefined || updates.userPreferredModel !== undefined) {
        const modelValue = updates.selectedAIModel || updates.userPreferredModel;
        if (modelValue) {
          updatedSettings.selectedAIModel = modelValue;
          updatedSettings.userPreferredModel = modelValue;
        }
      }

      console.log("Saving settings to Firebase:", { 
        updates, 
        finalSettings: Object.keys(updatedSettings),
        hasUndefinedValues: Object.values(updatedSettings).some(v => v === undefined)
      });
      
      await saveUserData(currentUser.uid, "settings", updatedSettings);
      console.log("Settings successfully saved to Firebase");
    } catch (error) {
      console.error("Error saving AI provider settings:", error);
      
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying saveSettings in ${delay}ms (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          saveSettings(updates, retryCount + 1);
        }, delay);
      } else {
        console.error("Failed to save settings after 3 retries");
        toast.error("Failed to sync settings to cloud. Your settings are saved locally.");
      }
    }
  };const setSelectedModel = async (model: AIModel) => {
    console.log("Setting selected model:", model);
    setSelectedModelState(model);
      // Save to localStorage for immediate persistence
    try {
      if (currentUser) {
        const userKey = `user_${currentUser.uid}`;
        localStorage.setItem(`${userKey}_userPreferredModel`, model.id);
      }
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
    
    // Save to Firebase if user is logged in with retry logic
    if (currentUser) {
      await saveSettings({ 
        selectedAIModel: model.id,
        userPreferredModel: model.id // Save with both field names for clarity
      });
    }
    
    toast.success(`Preferred model set to ${model.name}`);
  };
  const setDeepseekApiKey = async (key: string) => {
    setDeepseekApiKeyState(key);

    if (currentUser) {
      try {
        const userKey = `user_${currentUser.uid}`;
        localStorage.setItem(`${userKey}_deepseekApiKey`, key);
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }

    await saveSettings({ deepseekApiKey: key });
  };

  const setOpenRouterApiKey = async (key: string) => {
    setOpenRouterApiKeyState(key);

    if (currentUser) {
      try {
        const userKey = `user_${currentUser.uid}`;
        localStorage.setItem(`${userKey}_openRouterApiKey`, key);
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }

    await saveSettings({ openRouterApiKey: key });
  };

  const setGeminiApiKey = async (key: string) => {
    setGeminiApiKeyState(key);
    
    // Save to localStorage immediately for persistence
    if (currentUser) {
      try {
        const userKey = `user_${currentUser.uid}`;
        localStorage.setItem(`${userKey}_geminiApiKey`, key);
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }
    
    // Save to Firebase with retry logic
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
    if (model.provider === 'deepseek') {
      if (!deepseekApiKey) {
        throw new Error('DeepSeek API key not configured. Add it in Settings.');
      }

      const client = new OpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: deepseekApiKey,
        dangerouslyAllowBrowser: true,
      });

      const completion = await client.chat.completions.create({
        model: model.id,
        messages: [{ role: 'user', content: prompt }],
      });

      return completion.choices[0]?.message?.content || 'No response received';
    } else if (model.provider === 'openrouter') {
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
  // Call any model by ID — resolves provider from AVAILABLE_MODELS or defaults to deepseek
  const makeAICallWithModel = async (prompt: string, modelId: string): Promise<string> => {
    const knownModel = AVAILABLE_MODELS.find(m => m.id === modelId);
    const model: AIModel = knownModel ?? { id: modelId, name: modelId, provider: 'deepseek' };
    return callAI(prompt, model);
  };

  const value: AIProviderContextType = {
    selectedModel,
    userPreferredModel: selectedModel,
    setSelectedModel,
    setUserPreferredModel: setSelectedModel,
    deepseekApiKey,
    setDeepseekApiKey,
    openRouterApiKey,
    setOpenRouterApiKey,
    geminiApiKey,
    setGeminiApiKey,
    isLoading,
    makeAICall,
    makeAICallWithModel
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
