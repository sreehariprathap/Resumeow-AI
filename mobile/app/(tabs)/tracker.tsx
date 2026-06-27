import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { JobCard, type JobApplication } from '../../components/JobCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const STATUSES: JobApplication['status'][] = ['Applied', 'Interview', 'Offer', 'Rejected'];

export default function TrackerScreen() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [filter, setFilter] = useState<JobApplication['status'] | 'All'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<JobApplication | null>(null);
  const [form, setForm] = useState({ company: '', role: '', status: 'Applied' as JobApplication['status'], notes: '' });
  const [saving, setSaving] = useState(false);

  const loadApplications = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'applications', 'data'));
      if (snap.exists()) {
        const data = snap.data() as { items?: JobApplication[] };
        setApplications(data.items ?? []);
      }
    } catch { /* empty on first load */ }
  };

  useEffect(() => { loadApplications(); }, [user]);

  const saveApplications = async (items: JobApplication[]) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'applications', 'data'), { items });
    setApplications(items);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ company: '', role: '', status: 'Applied', notes: '' });
    setShowModal(true);
  };

  const openEdit = (app: JobApplication) => {
    setEditTarget(app);
    setForm({ company: app.company, role: app.role, status: app.status, notes: app.notes ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.company.trim() || !form.role.trim()) {
      Alert.alert('Missing Fields', 'Company and role are required.');
      return;
    }
    setSaving(true);
    try {
      let updated: JobApplication[];
      if (editTarget) {
        updated = applications.map((a) =>
          a.id === editTarget.id ? { ...a, ...form } : a
        );
      } else {
        updated = [
          { id: Date.now().toString(), dateApplied: new Date().toISOString(), ...form },
          ...applications,
        ];
      }
      await saveApplications(updated);
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Application', 'Remove this application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await saveApplications(applications.filter((a) => a.id !== id));
        },
      },
    ]);
  };

  const filtered = filter === 'All' ? applications : applications.filter((a) => a.status === filter);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-4 pt-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-slate-800">Job Tracker</Text>
          <TouchableOpacity
            onPress={openAdd}
            className="bg-primary w-10 h-10 rounded-full items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2 pr-4">
            {(['All', ...STATUSES] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setFilter(s)}
                className={`px-4 py-2 rounded-full border ${
                  filter === s
                    ? 'bg-primary border-primary'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-sm font-semibold ${filter === s ? 'text-white' : 'text-slate-600'}`}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {filtered.length === 0 ? (
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">📋</Text>
            <Text className="text-slate-500 text-sm">
              {filter === 'All' ? 'No applications yet. Add your first one!' : `No ${filter} applications.`}
            </Text>
          </Card>
        ) : (
          filtered.map((app) => (
            <TouchableOpacity
              key={app.id}
              onLongPress={() => handleDelete(app.id)}
              delayLongPress={600}
            >
              <JobCard application={app} onPress={() => openEdit(app)} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text className="text-slate-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-slate-800">
              {editTarget ? 'Edit Application' : 'New Application'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text className="text-primary font-semibold">Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {(
              [
                { label: 'Company', key: 'company', placeholder: 'Acme Corp' },
                { label: 'Role', key: 'role', placeholder: 'Software Engineer' },
              ] as const
            ).map(({ label, key, placeholder }) => (
              <View key={key}>
                <Text className="text-sm font-medium text-slate-700 mb-1.5">{label}</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800"
                  placeholder={placeholder}
                  placeholderTextColor="#94a3b8"
                  value={form[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                />
              </View>
            ))}

            <View>
              <Text className="text-sm font-medium text-slate-700 mb-1.5">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setForm((f) => ({ ...f, status: s }))}
                    className={`px-4 py-2 rounded-full border ${
                      form.status === s ? 'bg-primary border-primary' : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${form.status === s ? 'text-white' : 'text-slate-600'}`}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 min-h-20"
                placeholder="Interview date, contact name, etc."
                placeholderTextColor="#94a3b8"
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                multiline
                textAlignVertical="top"
              />
            </View>

            <Button label={editTarget ? 'Save Changes' : 'Add Application'} onPress={handleSave} loading={saving} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
