import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface Props {
  onTextExtracted: (text: string, fileName: string) => void;
  isLoading?: boolean;
}

export function ResumeUploader({ onTextExtracted, isLoading }: Props) {
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileName = asset.name ?? 'resume';

      if (asset.mimeType === 'text/plain') {
        const text = await FileSystem.readAsStringAsync(asset.uri);
        onTextExtracted(text, fileName);
      } else {
        Alert.alert(
          'Resume Received',
          `"${fileName}" uploaded. For best results, paste your resume text directly.`,
          [{ text: 'OK' }]
        );
        onTextExtracted(`[Resume file: ${fileName}]\n\nPlease paste your resume text here for AI analysis.`, fileName);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not read the file. Please try a .txt version of your resume.');
    }
  };

  return (
    <TouchableOpacity
      onPress={pickDocument}
      disabled={isLoading}
      className="border-2 border-dashed border-indigo-300 rounded-2xl p-8 items-center justify-center bg-indigo-50 active:bg-indigo-100"
    >
      <Text className="text-4xl mb-3">📄</Text>
      <Text className="text-base font-semibold text-indigo-700 text-center">
        Upload Resume
      </Text>
      <Text className="text-sm text-indigo-500 text-center mt-1">
        PDF, DOCX, or TXT
      </Text>
    </TouchableOpacity>
  );
}
