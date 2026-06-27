import { View, Text, ScrollView } from 'react-native';
import { Card } from './ui/Card';

interface Props {
  title: string;
  content: string;
  icon?: string;
}

export function AIResultCard({ title, content, icon }: Props) {
  const paragraphs = content.split('\n').filter(Boolean);

  return (
    <Card>
      <View className="flex-row items-center gap-2 mb-3">
        {icon ? <Text className="text-xl">{icon}</Text> : null}
        <Text className="text-base font-bold text-slate-800">{title}</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {paragraphs.map((line, i) => {
          const isBold = line.startsWith('**') || line.startsWith('#');
          const cleaned = line.replace(/^#{1,3}\s*/, '').replace(/\*\*/g, '');
          return (
            <Text
              key={i}
              className={`mb-1 leading-relaxed ${isBold ? 'font-semibold text-slate-800 text-sm' : 'text-slate-600 text-sm'}`}
            >
              {cleaned}
            </Text>
          );
        })}
      </ScrollView>
    </Card>
  );
}
