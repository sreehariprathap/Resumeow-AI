import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useTokens } from '../../hooks/useTokens';
import { logOut } from '../../lib/auth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Constants from 'expo-constants';

const planColors = {
  free: 'bg-slate-100 text-slate-600',
  pro: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-amber-100 text-amber-700',
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, refresh } = useTokens();

  const initials = (user?.displayName ?? user?.email ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const tokenPct = profile && profile.tokensAllocated > 0
    ? Math.round((profile.tokensRemaining / profile.tokensAllocated) * 100)
    : 0;

  const barColor =
    tokenPct > 40 ? 'bg-emerald-500' :
    tokenPct > 15 ? 'bg-amber-500' :
    'bg-red-500';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logOut() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-slate-800 mb-6">Profile</Text>

        {/* Avatar + name */}
        <Card className="items-center py-8 mb-4">
          <View className="w-20 h-20 rounded-full bg-indigo-100 items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-primary">{initials}</Text>
          </View>
          <Text className="text-xl font-bold text-slate-800">
            {user?.displayName ?? 'User'}
          </Text>
          <Text className="text-sm text-slate-500 mt-1">{user?.email}</Text>
          {profile ? (
            <View className={`mt-3 px-3 py-1 rounded-full ${planColors[profile.plan]}`}>
              <Text className="text-xs font-bold uppercase tracking-wide">
                {profile.plan} plan
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Tokens */}
        {profile ? (
          <Card className="mb-4">
            <View className="flex-row items-baseline justify-between mb-1">
              <Text className="text-base font-semibold text-slate-800">Tokens</Text>
              <TouchableOpacity onPress={refresh}>
                <Text className="text-xs text-primary font-medium">Refresh</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-baseline gap-1 mb-3">
              <Text className="text-4xl font-bold text-slate-800">{profile.tokensRemaining}</Text>
              <Text className="text-lg text-slate-400">/ {profile.tokensAllocated}</Text>
            </View>
            <View className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <View
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${tokenPct}%` }}
              />
            </View>
            <Text className="text-xs text-slate-400 mt-2">{tokenPct}% remaining</Text>
            <View className="mt-4 border-t border-slate-100 pt-3 gap-1">
              <Text className="text-xs text-slate-400">Token cost per action:</Text>
              <Text className="text-xs text-slate-500">• Resume analysis: ~5 tokens</Text>
              <Text className="text-xs text-slate-500">• Cover letter: ~4 tokens</Text>
              <Text className="text-xs text-slate-500">• ATS check: ~4 tokens</Text>
              <Text className="text-xs text-slate-400 mt-1">
                (Cost = ⌈characters / 750⌉, min 1)
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Sign out */}
        <Button label="Sign Out" onPress={handleSignOut} variant="danger" />

        <Text className="text-center text-xs text-slate-400 mt-8">
          Resumeow v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
