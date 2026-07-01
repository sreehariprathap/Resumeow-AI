import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getUserData, saveUserData } from './firebaseWeb';
import { useTokens } from './tokenContext';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';
import { MODELS } from '@/config/llm.config';

// When false, app uses the server-side key (DeepSeek or Gemini) and hides API settings from users.
// Which provider/model each task uses is now controlled entirely by llm.config.ts.
const USE_USER_API_KEY = import.meta.env.VITE_USE_USER_API_KEY !== 'false';
const ENV_DEEPSEEK_KEY: string = import.meta.env.VITE_DEEPSEEK_API_KEY ?? '';

// ── Gemini key rotation ───────────────────────────────────────────────────────
// Supports up to two server-side Gemini keys (VITE_GEMINI_API_KEY + VITE_GEMINI_API_KEY_2).
// Calls rotate round-robin across all configured keys. On a quota / 429 error the
// rotator automatically retries once with the next key before propagating the error.
// Only active in managed mode (USE_USER_API_KEY=false); user-supplied keys are untouched.
const ENV_GEMINI_KEYS: string[] = [
  import.meta.env.VITE_GEMINI_API_KEY  ?? '',
  import.meta.env.VITE_GEMINI_API_KEY_2 ?? '',
].filter(Boolean);

let _geminiKeyIndex = 0;

/** Returns the next Gemini key in rotation (round-robin). */
function nextGeminiKey(): string {
  if (ENV_GEMINI_KEYS.length === 0) return '';
  const key = ENV_GEMINI_KEYS[_geminiKeyIndex % ENV_GEMINI_KEYS.length];
  _geminiKeyIndex = (_geminiKeyIndex + 1) % ENV_GEMINI_KEYS.length;
  return key;
}

/** Returns the other Gemini key (the one NOT just used). Used for quota-error retry. */
function alternateGeminiKey(): string {
  if (ENV_GEMINI_KEYS.length < 2) return '';
  // _geminiKeyIndex was already incremented by nextGeminiKey, so current index is the alternate
  return ENV_GEMINI_KEYS[_geminiKeyIndex % ENV_GEMINI_KEYS.length];
}

/** True if an error looks like a Gemini quota / rate-limit failure. */
function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('resource_exhausted');
}

// Legacy single-key constant kept for managed-mode guard checks
const ENV_GEMINI_KEY: string = ENV_GEMINI_KEYS[0] ?? '';

export type AIProvider = 'deepseek' | 'openrouter' | 'gemini';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: MODELS.deepseek.pro,
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek'
  },
  {
    id: MODELS.deepseek.flash,
    name: 'DeepSeek V4 Flash',
    provider: 'deepseek'
  },
  {
    id: MODELS.openrouter.deepseekR1Free,
    name: 'DeepSeek R1 via OpenRouter (Free)',
    provider: 'openrouter'
  },
  {
    id: MODELS.gemini.flash,
    name: 'Gemini Flash',
    provider: 'gemini'
  },
  {
    id: MODELS.gemini.pro,
    name: 'Gemini Pro',
    provider: 'gemini'
  },
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
  isUserApiKeyEnabled: boolean;
  makeAICall: (prompt: string) => Promise<string>;
  /** Call a specific model+provider directly. Provider must be explicit — no guessing. */
  makeAICallWithModel: (prompt: string, modelId: string, provider: AIProvider) => Promise<string>;
  /** Call in extended thinking/reasoning mode for the given provider. */
  makeAICallWithThinking: (prompt: string, provider: AIProvider) => Promise<string>;
}

const AIProviderContext = createContext<AIProviderContextType | null>(null);

interface AIProviderProviderProps {
  children: ReactNode;
}

export function AIProviderProvider({ children }: AIProviderProviderProps) {
  const { currentUser } = useAuth();
  const { assertSufficientBalance, deductTokens } = useTokens();
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
  }, [currentUser]);

  // Load settings from Firebase with improved error handling
  useEffect(() => {
    if (currentUser !== undefined) {
      setIsLoading(true);
    }

    const loadSettings = async () => {
      try {
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
              
              // Load API keys with validation — skipped in managed mode
              if (USE_USER_API_KEY) {
                if (userData.deepseekApiKey && typeof userData.deepseekApiKey === 'string') {
                  setDeepseekApiKeyState(userData.deepseekApiKey);
                }
                if (userData.openRouterApiKey && typeof userData.openRouterApiKey === 'string') {
                  setOpenRouterApiKeyState(userData.openRouterApiKey);
                }
                if (userData.googleApiKey && typeof userData.googleApiKey === 'string') {
                  setGeminiApiKeyState(userData.googleApiKey);
                }
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

  // Make AI call with failsafe — fallback only picks providers that have keys configured
  const makeAICall = async (prompt: string): Promise<string> => {
    try {
      await assertSufficientBalance();
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_TOKENS') {
        toast.error("You've used all your tokens. Contact the admin to get more.");
        throw error;
      }
      throw error;
    }

    const primaryModel = selectedModel;
    const fallbackModel = AVAILABLE_MODELS.find(
      m => m.provider !== primaryModel.provider && (
        (m.provider === 'deepseek' && deepseekApiKey) ||
        (m.provider === 'openrouter' && openRouterApiKey) ||
        (m.provider === 'gemini' && geminiApiKey)
      )
    );

    try {
      const result = await callAI(prompt, primaryModel);
      void deductTokens(prompt.length + result.length);
      return result;
    } catch (error) {
      console.error(`Primary AI call failed with ${primaryModel.name}:`, error);

      if (fallbackModel) {
        try {
          toast.info(`${primaryModel.name} failed, trying ${fallbackModel.name}...`);
          const result = await callAI(prompt, fallbackModel);
          toast.warning(`Response generated using fallback provider: ${fallbackModel.name}`);
          void deductTokens(prompt.length + result.length);
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

  // Individual AI call — provider comes directly from the AIModel, no overrides.
  const callAI = async (prompt: string, model: AIModel): Promise<string> => {
    if (model.provider === 'deepseek') {
      const effectiveKey = USE_USER_API_KEY ? deepseekApiKey : ENV_DEEPSEEK_KEY;
      if (!effectiveKey) {
        throw new Error('DeepSeek API key not configured. Add VITE_DEEPSEEK_API_KEY or set it in Settings.');
      }
      const client = new OpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: effectiveKey,
        dangerouslyAllowBrowser: true,
      });
      const completion = await client.chat.completions.create({
        model: model.id,
        messages: [{ role: 'user', content: prompt }],
      });
      return completion.choices[0]?.message?.content || 'No response received';

    } else if (model.provider === 'gemini') {
      if (USE_USER_API_KEY) {
        // User-supplied key — no rotation
        if (!geminiApiKey) throw new Error('Gemini API key not configured. Add it in Settings.');
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({ model: model.id, contents: prompt });
        return response.text || 'No response received';
      }
      // Managed mode — round-robin across server keys with quota-error retry
      const primaryKey = nextGeminiKey();
      if (!primaryKey) throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env.');
      try {
        const ai = new GoogleGenAI({ apiKey: primaryKey });
        const response = await ai.models.generateContent({ model: model.id, contents: prompt });
        return response.text || 'No response received';
      } catch (err) {
        const fallbackKey = alternateGeminiKey();
        if (isQuotaError(err) && fallbackKey && fallbackKey !== primaryKey) {
          console.warn('[gemini-rotation] quota hit on key slot, retrying with alternate key');
          const ai = new GoogleGenAI({ apiKey: fallbackKey });
          const response = await ai.models.generateContent({ model: model.id, contents: prompt });
          return response.text || 'No response received';
        }
        throw err;
      }

    } else if (model.provider === 'openrouter') {
      if (!openRouterApiKey) {
        throw new Error('OpenRouter API key not found. Add it in Settings.');
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
        messages: [{ role: 'user', content: prompt }],
      });
      return completion.choices[0]?.message?.content || 'No response received';

    } else {
      throw new Error(`Unsupported AI provider: ${model.provider}`);
    }
  };
  // Call a specific model + provider — both must be explicit, no inference.
  const makeAICallWithModel = async (prompt: string, modelId: string, provider: AIProvider): Promise<string> => {
    try {
      await assertSufficientBalance();
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_TOKENS') {
        toast.error("You've used all your tokens. Contact the admin to get more.");
        throw error;
      }
      throw error;
    }
    const model: AIModel = { id: modelId, name: modelId, provider };
    const result = await callAI(prompt, model);
    void deductTokens(prompt.length + result.length);
    return result;
  };

  // Extended thinking/reasoning mode.
  // DeepSeek: uses chain-of-thought (extra_body: thinking enabled) on deepseek-v4-pro.
  // Gemini:   uses the pro model — Gemini 2.5 Pro has built-in reasoning.
  // The task config provider is passed in explicitly — no guessing.
  const makeAICallWithThinking = async (prompt: string, provider: AIProvider): Promise<string> => {
    try {
      await assertSufficientBalance();
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_TOKENS') {
        toast.error("You've used all your tokens. Contact the admin to get more.");
        throw error;
      }
      throw error;
    }

    if (provider === 'gemini') {
      if (USE_USER_API_KEY) {
        if (!geminiApiKey) throw new Error('Gemini API key not configured. Add it in Settings.');
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({ model: MODELS.gemini.pro, contents: prompt });
        const result = response.text || 'No response received';
        void deductTokens(prompt.length + result.length);
        return result;
      }
      // Managed mode — round-robin with quota-error retry
      const primaryKey = nextGeminiKey();
      if (!primaryKey) throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env.');
      let result: string;
      try {
        const ai = new GoogleGenAI({ apiKey: primaryKey });
        const response = await ai.models.generateContent({ model: MODELS.gemini.pro, contents: prompt });
        result = response.text || 'No response received';
      } catch (err) {
        const fallbackKey = alternateGeminiKey();
        if (isQuotaError(err) && fallbackKey && fallbackKey !== primaryKey) {
          console.warn('[gemini-rotation] quota hit on key slot (thinking), retrying with alternate key');
          const ai = new GoogleGenAI({ apiKey: fallbackKey });
          const response = await ai.models.generateContent({ model: MODELS.gemini.pro, contents: prompt });
          result = response.text || 'No response received';
        } else {
          throw err;
        }
      }
      void deductTokens(prompt.length + result.length);
      return result;
    }

    // DeepSeek thinking mode — chain-of-thought via extra_body.
    // Note: temperature/top_p must be omitted in thinking mode.
    const effectiveKey = USE_USER_API_KEY ? deepseekApiKey : ENV_DEEPSEEK_KEY;
    if (!effectiveKey) {
      throw new Error('DeepSeek API key not configured. Add VITE_DEEPSEEK_API_KEY or set it in Settings.');
    }
    const client = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: effectiveKey,
      dangerouslyAllowBrowser: true,
    });
    // extra_body is a valid OpenAI SDK param but not in the TS types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completion = await (client.chat.completions.create as any)({
      model: MODELS.deepseek.pro,
      messages: [{ role: 'user', content: prompt }],
      extra_body: { thinking: { type: 'enabled' } },
    });
    const result = completion.choices[0]?.message?.content || 'No response received';
    void deductTokens(prompt.length + result.length);
    return result;
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
    isUserApiKeyEnabled: USE_USER_API_KEY,
    makeAICall,
    makeAICallWithModel,
    makeAICallWithThinking
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
