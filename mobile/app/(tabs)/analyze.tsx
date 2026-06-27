import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';

type Tab = 'analysis' | 'coverLetter' | 'ats';

interface ATSData {
  score: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
}

export default function AnalyzeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('analysis');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'analysis', label: 'Analysis' },
    { key: 'coverLetter', label: 'Cover Letter' },
    { key: 'ats', label: 'ATS Score' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-slate-800 mb-4">AI Results</Text>

        {/* Tab Bar */}
        <View className="flex-row bg-slate-100 rounded-xl p-1 gap-1">
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-lg items-center ${activeTab === t.key ? 'bg-white shadow-sm' : ''}`}
            >
              <Text className={`text-sm font-semibold ${activeTab === t.key ? 'text-primary' : 'text-slate-500'}`}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {activeTab === 'analysis' && <AnalysisPlaceholder />}
        {activeTab === 'coverLetter' && <CoverLetterPlaceholder />}
        {activeTab === 'ats' && <ATSPlaceholder />}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnalysisPlaceholder() {
  return (
    <Card>
      <Text className="text-base font-semibold text-slate-800 mb-2">🔍 Resume Analysis</Text>
      <Text className="text-sm text-slate-500 leading-relaxed">
        Run "Analyze Resume" from the Resume tab to see your AI-powered feedback here.
        {'\n\n'}Your analysis will cover content quality, ATS compatibility, strengths, and improvement areas.
      </Text>
    </Card>
  );
}

function CoverLetterPlaceholder() {
  return (
    <Card>
      <Text className="text-base font-semibold text-slate-800 mb-2">✉️ Cover Letter</Text>
      <Text className="text-sm text-slate-500 leading-relaxed">
        Run "Cover Letter" from the Resume tab with a job description to generate a personalized cover letter here.
      </Text>
    </Card>
  );
}

function ATSPlaceholder() {
  return (
    <Card>
      <Text className="text-base font-semibold text-slate-800 mb-3">🎯 ATS Score</Text>
      <View className="items-center mb-6">
        <View className="w-28 h-28 rounded-full border-8 border-slate-100 items-center justify-center">
          <Text className="text-3xl font-bold text-slate-300">—</Text>
          <Text className="text-xs text-slate-400">score</Text>
        </View>
      </View>
      <Text className="text-sm text-slate-500 text-center leading-relaxed">
        Run "ATS Check" from the Resume tab to see how well your resume matches a job description.
      </Text>
    </Card>
  );
}
