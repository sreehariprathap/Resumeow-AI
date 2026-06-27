import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeItem = async (key: string, value: unknown): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const getItem = async <T>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
};

export const removeItem = async (key: string): Promise<void> => {
  await AsyncStorage.removeItem(key);
};
