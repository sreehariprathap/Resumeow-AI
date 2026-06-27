import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useAI } from '../../hooks/useAI';
import { TokenBadge } from '../../components/ui/TokenBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ResumeUploader } from '../../components/ResumeUploader';
import { AIResultCard } from '../../components/AIResultCard';

type AIMode = 'analyze' | 'coverLetter' | 'ats' | null;

export default function HomeScreen() {
  const { user } = useAuth();
  const { analyze, coverLetter, atsCheck, isLoading, error, clearError } = useAI();

  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [mode, setMode] = useState<AIMode>(null);
  const [showJDModal, setShowJDModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<'coverLetter' | 'ats' | null>(null);

  const handleFileExtracted = (text: string, fileName: string) => {
    setResumeText(text);
    setResumeFileName(fileName);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) { Alert.alert('No Resume', 'Upload or paste your resume first.'); return; }
    setMode('analyze');
    const r = await analyze(resumeText);
    if (r) setResult(r);
  };

  const triggerJDAction = (m: 'coverLetter' | 'ats') => {
    if (!resumeText.trim()) { Alert.alert('No Resume', 'Upload or paste your resume first.'); return; }
    setPendingMode(m);
    setShowJDModal(true);
  };

  const handleJDSubmit = async () => {
    if (!jobDescription.trim()) { Alert.alert('Missing', 'Paste a job description first.'); return; }
    setShowJDModal(false);
    if (pendingMode === 'coverLetter') {
      setMode('coverLetter');
      const r = await coverLetter(resumeText, jobDescription);
      if (r) setResult(r);
    } else {
      setMode('ats');
      const r = await atsCheck(resumeText, jobDescription);
      if (r) setResult(JSON.stringify(r, null, 2));
    }
  };

  if (error) {
    Alert.alert('AI Error', error, [{ text: 'OK', onPress: clearError }]);
  }

  const modeLabels: Record<NonNullable<AIMode>, { title: string; icon: string }> = {
    analyze: { title: 'Resume Analysis', icon: '🔍' },
    coverLetter: { title: 'Cover Letter', icon: '✉️' },
    ats: { title: 'ATS Check Result', icon: '🎯' },
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-2xl font-bold text-slate-800">🐱 Resumeow</Text>
            <Text className="text-sm text-slate-500">
              Hi, {user?.displayName?.split(' ')[0] ?? 'there'}
            </Text>
          </View>
          <TokenBadge />
        </View>

        {/* Upload Section */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-800 mb-3">Your Resume</Text>
          <ResumeUploader onTextExtracted={handleFileExtracted} isLoading={isLoading} />

          {resumeFileName ? (
            <View className="mt-3 flex-row items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
              <Text className="text-indigo-600 text-sm">📎</Text>
              <Text className="text-sm text-indigo-700 font-medium flex-1" numberOfLines={1}>
                {resumeFileName}
              </Text>
            </View>
          ) : null}

          <View className="mt-3">
            <Text className="text-sm font-medium text-slate-600 mb-1.5">
              Or paste resume text:
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 min-h-24"
              placeholder="Paste your resume text here..."
              placeholderTextColor="#94a3b8"
              value={resumeText}
              onChangeText={setResumeText}
              multiline
              textAlignVertical="top"
            />
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="gap-3 mb-4">
          <Button
            label="🔍  Analyze Resume  (5 tokens)"
            onPress={handleAnalyze}
            loading={isLoading && mode === 'analyze'}
            disabled={isLoading}
            size="lg"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="✉️  Cover Letter"
                onPress={() => triggerJDAction('coverLetter')}
                variant="outline"
                loading={isLoading && mode === 'coverLetter'}
                disabled={isLoading}
              />
            </View>
            <View className="flex-1">
              <Button
                label="🎯  ATS Check"
                onPress={() => triggerJDAction('ats')}
                variant="outline"
                loading={isLoading && mode === 'ats'}
                disabled={isLoading}
              />
            </View>
          </View>
        </View>

        {/* Result */}
        {result && mode ? (
          <AIResultCard
            title={modeLabels[mode].title}
            content={result}
            icon={modeLabels[mode].icon}
          />
        ) : null}
      </ScrollView>

      {/* Job Description Modal */}
      <Modal visible={showJDModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
            <TouchableOpacity onPress={() => setShowJDModal(false)}>
              <Text className="text-slate-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-slate-800">Job Description</Text>
            <TouchableOpacity onPress={handleJDSubmit}>
              <Text className="text-primary font-semibold text-base">Run</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-1 p-4">
            <Text className="text-sm text-slate-500 mb-3">
              Paste the job description to compare against your resume.
            </Text>
            <TextInput
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700"
              placeholder="Paste job description here..."
              placeholderTextColor="#94a3b8"
              value={jobDescription}
              onChangeText={setJobDescription}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
