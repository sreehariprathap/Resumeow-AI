import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const styles: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary rounded-xl items-center justify-center',
    text: 'text-white font-semibold',
  },
  secondary: {
    container: 'bg-slate-100 rounded-xl items-center justify-center',
    text: 'text-slate-800 font-semibold',
  },
  outline: {
    container: 'border border-primary rounded-xl items-center justify-center bg-transparent',
    text: 'text-primary font-semibold',
  },
  ghost: {
    container: 'rounded-xl items-center justify-center bg-transparent',
    text: 'text-primary font-medium',
  },
  danger: {
    container: 'bg-red-500 rounded-xl items-center justify-center',
    text: 'text-white font-semibold',
  },
};

const sizes = {
  sm: { container: 'px-3 py-2', text: 'text-sm' },
  md: { container: 'px-4 py-3', text: 'text-base' },
  lg: { container: 'px-6 py-4', text: 'text-lg' },
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, size = 'md' }: Props) {
  const s = styles[variant];
  const sz = sizes[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`${s.container} ${sz.container} ${isDisabled ? 'opacity-50' : ''}`}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? Colors.primary : '#fff'} />
      ) : (
        <Text className={`${s.text} ${sz.text}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
