import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  emoji: string;
  title: string;
  body: string;
  bullets?: string[];
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '🐱',
    title: 'Welcome to Resumeow',
    body: 'AI-powered resume toolkit, now in your pocket. Land more interviews with smarter job applications.',
  },
  {
    id: '2',
    emoji: '⚡',
    title: 'How It Works',
    body: 'Three steps to job-search success:',
    bullets: [
      '📄  Upload or paste your resume',
      '🤖  Get AI-powered analysis & cover letters',
      '✅  Apply with confidence',
    ],
  },
  {
    id: '3',
    emoji: '🪙',
    title: 'Your Free Tokens',
    body: "You start with 100 free tokens. Here's what each action costs:",
    bullets: [
      '🔍  Resume analysis — ~5 tokens',
      '✉️  Cover letter — ~4 tokens',
      '🎯  ATS check — ~4 tokens',
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const flatRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const completeOnboarding = async () => {
    setFinishing(true);
    try {
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'onboarding', 'data'), {
          completed: true,
          completedAt: new Date().toISOString(),
          version: '1.0',
        });
      }
    } finally {
      setFinishing(false);
      router.replace('/(tabs)');
    }
  };

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      completeOnboarding();
    }
  };

  const renderSlide: ListRenderItem<Slide> = ({ item }) => (
    <View style={{ width }} className="flex-1 items-center justify-center px-8">
      <Text className="text-7xl mb-8">{item.emoji}</Text>
      <Text className="text-3xl font-bold text-slate-800 text-center mb-4">{item.title}</Text>
      <Text className="text-base text-slate-500 text-center leading-relaxed mb-4">{item.body}</Text>
      {item.bullets?.map((b, i) => (
        <View key={i} className="self-stretch bg-slate-50 rounded-xl px-4 py-3 mb-2">
          <Text className="text-sm text-slate-700">{b}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <TouchableOpacity
        onPress={completeOnboarding}
        className="self-end px-5 pt-2"
      >
        <Text className="text-slate-400 text-sm">Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        className="flex-1"
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      />

      {/* Dots */}
      <View className="flex-row justify-center gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${i === index ? 'w-6 bg-primary' : 'w-2 bg-slate-200'}`}
          />
        ))}
      </View>

      <View className="px-6 pb-8">
        <Button
          label={index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={goNext}
          loading={finishing}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
