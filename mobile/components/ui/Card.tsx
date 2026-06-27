import { View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';

interface Props extends ViewProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...rest }: Props) {
  return (
    <View
      className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
