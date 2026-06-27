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
import { signUp } from '../../lib/auth';
import { Button } from '../../components/ui/Button';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      const msg =
        code === 'auth/email-already-in-use' ? 'An account with this email already exists.' :
        code === 'auth/invalid-email' ? 'Invalid email address.' :
        'Registration failed. Please try again.';
      Alert.alert('Sign Up Failed', msg);
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
            <Text className="text-4xl mb-2">✨</Text>
            <Text className="text-3xl font-bold text-slate-800">Create account</Text>
            <Text className="text-base text-slate-500 mt-2">
              Get 100 free tokens to start
            </Text>
          </View>

          <View className="gap-4 mb-6">
            <View>
              <Text className="text-sm font-medium text-slate-700 mb-1.5">Full Name</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-800"
                placeholder="Alex Smith"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
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
                placeholder="At least 6 characters"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <Button label="Create Account" onPress={handleRegister} loading={loading} size="lg" />

          <View className="flex-row items-center justify-center mt-6 gap-1">
            <Text className="text-slate-500">Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary font-semibold"> Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
