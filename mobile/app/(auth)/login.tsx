import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signIn } from '../../lib/auth';
import { Button } from '../../components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      const msg =
        code === 'auth/user-not-found' ? 'No account found with that email.' :
        code === 'auth/wrong-password' ? 'Incorrect password.' :
        code === 'auth/invalid-email' ? 'Invalid email address.' :
        'Sign in failed. Please try again.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-8">
          <View className="mb-10">
            <Text className="text-4xl mb-2">🐱</Text>
            <Text className="text-3xl font-bold text-slate-800">Welcome back</Text>
            <Text className="text-base text-slate-500 mt-2">Sign in to Resumeow</Text>
          </View>

          <View className="gap-4 mb-6">
            <View>
              <Text className="text-sm font-medium text-slate-700 mb-1.5">Email</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-800"
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View>
              <Text className="text-sm font-medium text-slate-700 mb-1.5">Password</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-800"
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <Button label="Sign In" onPress={handleLogin} loading={loading} size="lg" />

          <View className="flex-row items-center justify-center mt-6 gap-1">
            <Text className="text-slate-500">Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-primary font-semibold"> Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
