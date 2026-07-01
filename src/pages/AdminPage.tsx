import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useTokens } from '@/lib/tokenContext';
import { getAllUserProfiles, adminUpdateUserProfile, getTokenRequests, resolveTokenRequest, type UserProfile, type TokenRequest } from '@/lib/firebaseWeb';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminEditModal } from '@/components/AdminEditModal';
import { LLMHealthCheckModal } from '@/components/LLMHealthCheckModal';
import { toast } from 'sonner';
import { Users, Zap, ArrowLeft, RefreshCw, AlertCircle, FlaskConical } from 'lucide-react';
import { log } from '@/lib/logger';

export function AdminPage() {
  const { currentUser } = useAuth();
  const { isAdmin, isLoading: tokensLoading } = useTokens();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [llmHealthOpen, setLlmHealthOpen] = useState(false);
  const [tokenRequests, setTokenRequests] = useState<TokenRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [grantAmounts, setGrantAmounts] = useState<Record<string, string>>({});

  const isAllowed = isAdmin || currentUser?.email === 'srhari615@gmail.com';

  useEffect(() => {
    if (!tokensLoading && !isAllowed) navigate('/', { replace: true });
  }, [isAllowed, tokensLoading, navigate]);

  const fetchTokenRequests = async () => {
    setRequestsLoading(true);
    try {
      const reqs = await getTokenRequests('pending');
      setTokenRequests(reqs);
      log.info('admin: token requests loaded', { count: reqs.length });
    } catch (err) {
      log.error('admin: getTokenRequests failed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleResolve = async (req: TokenRequest, approved: boolean) => {
    if (!req.id) return;
    const tokensToGrant = approved ? parseInt(grantAmounts[req.id] ?? String(req.requestedTokens), 10) : 0;
    setResolvingId(req.id);
    try {
      await resolveTokenRequest(req.id, approved, tokensToGrant, currentUser?.email ?? '');
      log.info('admin: token request resolved', { id: req.id, approved, tokensToGrant });
      toast.success(approved ? `Granted ${tokensToGrant} tokens to ${req.displayName}` : `Rejected request from ${req.displayName}`);
      setTokenRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err) {
      log.error('admin: resolve failed', { id: req.id, error: err instanceof Error ? err.message : String(err) });
      toast.error('Failed to resolve request');
    } finally {
      setResolvingId(null);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    log.info('admin: fetching all user profiles', { uid: currentUser?.uid, email: currentUser?.email, isAdmin });
    try {
      const all = await getAllUserProfiles();
      log.info('admin: loaded users', { count: all.length });
      setUsers(all);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('admin: getAllUserProfiles failed', { error: msg, uid: currentUser?.uid });
      setFetchError(msg);
      toast.error('Failed to load users — see error below');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      void fetchUsers();
      void fetchTokenRequests();
    }
  }, [isAllowed]);

  const handleQuickPlanChange = async (uid: string, newPlan: 'free' | 'pro') => {
    log.info('admin: quick plan change', { uid, newPlan });
    try {
      await adminUpdateUserProfile(uid, { plan: newPlan });
      toast.success(newPlan === 'pro' ? 'User promoted to Pro' : 'User moved to Free');
      await fetchUsers();
    } catch (err) {
      log.error('admin: quick plan change failed', { uid, error: err instanceof Error ? err.message : String(err) });
      toast.error('Plan update failed');
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLlmHealthOpen(true)}
              className="gap-1.5"
            >
              <FlaskConical className="h-4 w-4" /> Test LLM
            </Button>
            <Button variant="outline" size="sm" onClick={() => { void fetchUsers(); void fetchTokenRequests(); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
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

        {/* Token requests — always visible */}
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <div className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Pending Token Requests
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-bold px-2 py-0.5 min-w-[1.5rem]">
                {tokenRequests.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : tokenRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Zap className="h-8 w-8 opacity-30" />
                <span className="text-sm">No pending requests. You&apos;re all caught up ✓</span>
              </div>
            ) : (
              <div className="space-y-3">
                {tokenRequests.map(req => (
                  <div key={req.id} className="flex items-start justify-between gap-4 p-3 rounded-md bg-background border">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-medium text-sm">{req.displayName}</div>
                      <div className="text-xs text-muted-foreground">{req.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Requested <span className="font-medium text-foreground">{req.requestedTokens} tokens</span> · {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs italic text-muted-foreground">"{req.reason}"</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        className="h-7 w-20 text-xs font-mono"
                        value={grantAmounts[req.id!] ?? String(req.requestedTokens)}
                        onChange={e => setGrantAmounts(prev => ({ ...prev, [req.id!]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={resolvingId === req.id || parseInt(grantAmounts[req.id!] ?? String(req.requestedTokens), 10) < 1}
                        onClick={() => void handleResolve(req, true)}
                      >
                        {resolvingId === req.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={resolvingId === req.id}
                        onClick={() => void handleResolve(req, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {fetchError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Failed to load users</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono break-all">{fetchError}</p>
              <p className="text-xs text-muted-foreground">
                This is likely a Firestore permissions error. To fix: open{' '}
                <strong>Firebase Console → Firestore → userProfiles → {currentUser?.uid}</strong>{' '}
                and set <code className="bg-muted px-1 rounded">isAdmin: true</code> on your profile document.
              </p>
              <Button size="sm" variant="outline" onClick={() => void fetchUsers()}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

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
                    return (
                      <tr key={u.uid} className="py-3">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{u.displayName}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={u.plan === 'admin' ? 'destructive' : u.plan === 'pro' ? 'default' : 'secondary'}>
                            {u.plan}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 font-mono">
                          {u.tokensAllocated.toLocaleString()}
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
                          <div className="flex gap-1 flex-wrap">
                            {/* Quick promote / demote — not shown for admin accounts */}
                            {u.plan === 'free' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => void handleQuickPlanChange(u.uid, 'pro')}
                              >
                                → Pro
                              </Button>
                            )}
                            {u.plan === 'pro' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => void handleQuickPlanChange(u.uid, 'free')}
                              >
                                → Free
                              </Button>
                            )}
                            {/* Edit button — opens modal */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setEditingUser(u)}
                            >
                              Edit
                            </Button>
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

      {/* Edit user modal */}
      <AdminEditModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => void fetchUsers()}
      />

      {/* LLM health check modal */}
      <LLMHealthCheckModal
        open={llmHealthOpen}
        onClose={() => setLlmHealthOpen(false)}
      />
    </div>
  );
}
