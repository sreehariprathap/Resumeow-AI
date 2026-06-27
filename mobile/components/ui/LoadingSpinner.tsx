import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';

interface Props {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'small', color = Colors.primary, fullScreen }: Props) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={color} />;
}
