import { View, Text, TouchableOpacity } from 'react-native';
import { useTokens } from '../../hooks/useTokens';

interface Props {
  onPress?: () => void;
}

export function TokenBadge({ onPress }: Props) {
  const { profile } = useTokens();

  if (!profile) return null;

  const pct = profile.tokensAllocated > 0
    ? profile.tokensRemaining / profile.tokensAllocated
    : 0;

  const colorClass =
    pct > 0.4 ? 'bg-emerald-50 border-emerald-200' :
    pct > 0.15 ? 'bg-amber-50 border-amber-200' :
    'bg-red-50 border-red-200';

  const textClass =
    pct > 0.4 ? 'text-emerald-700' :
    pct > 0.15 ? 'text-amber-700' :
    'text-red-700';

  const dotClass =
    pct > 0.4 ? 'bg-emerald-500' :
    pct > 0.15 ? 'bg-amber-500' :
    'bg-red-500';

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${colorClass}`}>
        <View className={`w-2 h-2 rounded-full ${dotClass}`} />
        <Text className={`text-sm font-semibold ${textClass}`}>
          {profile.tokensRemaining} tokens
        </Text>
      </View>
    </TouchableOpacity>
  );
}
