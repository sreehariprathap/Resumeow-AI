import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from './ui/Card';

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: 'Applied' | 'Interview' | 'Offer' | 'Rejected';
  dateApplied: string;
  notes?: string;
}

const statusConfig = {
  Applied:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Applied' },
  Interview: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Interview' },
  Offer:     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Offer' },
  Rejected:  { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Rejected' },
};

interface Props {
  application: JobApplication;
  onPress?: () => void;
}

export function JobCard({ application, onPress }: Props) {
  const s = statusConfig[application.status];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
              {application.company}
            </Text>
            <Text className="text-sm text-slate-500 mt-0.5" numberOfLines={1}>
              {application.role}
            </Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full ${s.bg}`}>
            <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
          </View>
        </View>
        <Text className="text-xs text-slate-400 mt-2">
          Applied {new Date(application.dateApplied).toLocaleDateString()}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}
