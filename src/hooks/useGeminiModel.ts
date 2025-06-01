import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { getUserData, saveUserData } from '@/lib/firebase';

export type GeminiModel = 'gemini-2.0-flash' | 'gemini-2.5-pro-preview-tts';

export function useGeminiModel() {
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.0-flash');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  // Load model preference from Firebase on mount
  useEffect(() => {
    const loadModelPreference = async () => {
      if (currentUser) {
        try {
          const userData = await getUserData(currentUser.uid, "settings");
          if (userData && userData.selectedGeminiModel) {
            setSelectedModel(userData.selectedGeminiModel as GeminiModel);
          }
        } catch (error) {
          console.error("Error loading model preference:", error);
        }
      }
      setIsLoading(false);
    };

    loadModelPreference();
  }, [currentUser]);

  // Save model preference to Firebase
  const updateSelectedModel = async (model: GeminiModel) => {
    setSelectedModel(model);
    
    if (currentUser) {
      try {
        // Get current user settings
        const userData = await getUserData(currentUser.uid, "settings") || {};
        
        // Update with new model selection
        const updatedSettings = {
          ...userData,
          selectedGeminiModel: model,
          updatedAt: new Date().toISOString()
        };
        
        await saveUserData(currentUser.uid, "settings", updatedSettings);
      } catch (error) {
        console.error("Error saving model preference:", error);
      }
    }
  };

  return {
    selectedModel,
    setSelectedModel: updateSelectedModel,
    isLoading
  };
}
