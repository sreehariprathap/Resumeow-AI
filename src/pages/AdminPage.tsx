import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useTokens } from '@/lib/tokenContext';
import { getAllUserProfiles, adminUpdateUserTokens, type UserProfile } from '@/lib/firebaseWeb';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Zap, ArrowLeft, RefreshCw } from 'lucide-react';

export function AdminPage() {
  const { currentUser } = useAuth();
  const { isAdmin, isLoading: tokensLoading } = useTokens();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ uid: string; tokens: string; plan: string } | null>(null);

  useEffect(() => {
    if (!tokensLoading && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, tokensLoading, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const all = await getAllUserProfiles();
      setUsers(all);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) void fetchUsers(); }, [isAdmin]);

  const handleSave = async (uid: string) => {
    if (!editing || editing.uid !== uid) return;
    const tokens = parseInt(editing.tokens, 10);
    if (isNaN(tokens) || tokens < 0) { toast.error('Invalid token count'); return; }
    try {
      await adminUpdateUserTokens(uid, tokens, editing.plan as 'free' | 'pro' | 'admin');
      toast.success('User updated');
      setEditing(null);
      await fetchUsers();
    } catch {
      toast.error('Update failed');
    }
  };

  const totalUsers = users.length;
  const totalTokensAllocated = users.reduce((s, u) => s + u.tokensAllocated, 0);
  const totalTokensUsed = users.reduce((s, u) => s + u.tokensUsed, 0);

  if (tokensLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" /> Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Manage users and token allocations</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchUsers()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{totalUsers}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-500">{totalTokensAllocated.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1">Tokens Allocated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-500">{totalTokensUsed.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1">Tokens Consumed</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="font-semibold">All Users ({totalUsers})</div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-3 pr-4 font-medium">User</th>
                    <th className="pb-3 pr-4 font-medium">Plan</th>
                    <th className="pb-3 pr-4 font-medium">Allocated</th>
                    <th className="pb-3 pr-4 font-medium">Used</th>
                    <th className="pb-3 pr-4 font-medium">Remaining</th>
                    <th className="pb-3 pr-4 font-medium">Joined</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(u => {
                    const pct = u.tokensAllocated > 0 ? u.tokensRemaining / u.tokensAllocated : 0;
                    const tokenColor = pct > 0.4 ? 'text-green-500' : pct > 0.15 ? 'text-yellow-500' : 'text-red-500';
                    const isEditingThis = editing?.uid === u.uid;
                    return (
                      <tr key={u.uid} className="py-3">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{u.displayName}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="py-3 pr-4">
                          {isEditingThis ? (
                            <Select
                              value={editing.plan}
                              onValueChange={v => setEditing(e => e ? { ...e, plan: v } : e)}
                            >
                              <SelectTrigger className="h-8 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={u.plan === 'admin' ? 'destructive' : u.plan === 'pro' ? 'default' : 'secondary'}>
                              {u.plan}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono">
                          {isEditingThis ? (
                            <Input
                              className="h-8 w-24 font-mono text-sm"
                              value={editing.tokens}
                              onChange={e => setEditing(ed => ed ? { ...ed, tokens: e.target.value } : ed)}
                              type="number"
                              min={0}
                            />
                          ) : (
                            u.tokensAllocated.toLocaleString()
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono text-muted-foreground">
                          {u.tokensUsed.toLocaleString()}
                        </td>
                        <td className={`py-3 pr-4 font-mono font-medium ${tokenColor}`}>
                          {u.isAdmin ? '∞' : u.tokensRemaining.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {isEditingThis ? (
                              <>
                                <Button size="sm" onClick={() => void handleSave(u.uid)}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing({ uid: u.uid, tokens: String(u.tokensAllocated), plan: u.plan })}
                              >
                                <Zap className="h-3 w-3 mr-1" /> Edit
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No users yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Logged in as {currentUser?.email} · Admin view
        </p>
      </div>
    </div>
  );
}
