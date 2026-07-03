import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Zap, Clock, TrendingUp } from 'lucide-react';
import { adminGetUserApplications, adminGetUserAIActivity, type UserProfile } from '@/lib/firebaseWeb';
import type { TrackedApplication } from '@/types/tracker';

interface UserActivityModalProps {
  user: UserProfile | null;
  open: boolean;
  onClose: () => void;
}

export function UserActivityModal({ user, open, onClose }: UserActivityModalProps) {
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [aiActivity, setAiActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    Promise.all([
      adminGetUserApplications(user.uid),
      adminGetUserAIActivity(user.uid),
    ]).then(([apps, ai]) => {
      setApplications(apps);
      setAiActivity(ai);
    }).finally(() => setLoading(false));
  }, [open, user]);

  if (!user) return null;

  const statusColors: Record<string, string> = {
    tracked: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    interview: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    offer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm font-semibold text-indigo-600 dark:text-indigo-300">
              {user.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div>{user.displayName}</div>
              <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="applications" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="applications" className="gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Applications
              {applications.length > 0 && (
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{applications.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Token Usage
            </TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="flex-1 overflow-y-auto mt-4 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-10">
                <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No applications tracked yet</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <span key={status} className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[status] ?? ''}`}>
                      {status}: {count}
                    </span>
                  ))}
                </div>

                {applications.map((app, i) => (
                  <Card key={app.id ?? i} className="border border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{app.role}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColors[app.status] ?? ''}`}>
                              {app.status}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {app.company}{app.location && ` · ${app.location}`}
                          </div>
                          {app.createdAt && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                              <Clock className="h-3 w-3" />
                              {new Date(app.createdAt).toLocaleDateString()}
                            </div>
                          )}
                          {app.skills?.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{app.skills.join(', ')}</p>
                          )}
                        </div>
                        {(app.atsScore != null || app.jobFitScore != null) && (
                          <div className="shrink-0 text-right text-xs text-muted-foreground">
                            {app.atsScore != null && <div>ATS: {app.atsScore}%</div>}
                            {app.jobFitScore != null && <div>Fit: {app.jobFitScore}%</div>}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Token Usage Tab */}
          <TabsContent value="tokens" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-bold text-indigo-500">{user.tokensAllocated.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Allocated</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl font-bold text-orange-500">{user.tokensUsed.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Consumed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className={`text-2xl font-bold ${user.tokensRemaining / user.tokensAllocated > 0.4 ? 'text-green-500' : user.tokensRemaining / user.tokensAllocated > 0.15 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {user.isAdmin ? '∞' : user.tokensRemaining.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Remaining</div>
                </CardContent>
              </Card>
            </div>

            {!user.isAdmin && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Usage</span>
                  <span>{Math.round((user.tokensUsed / user.tokensAllocated) * 100)}% used</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((user.tokensUsed / user.tokensAllocated) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 text-sm">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant={user.plan === 'admin' ? 'destructive' : user.plan === 'pro' ? 'default' : 'secondary'}>
                {user.plan}
              </Badge>
            </div>

            {aiActivity.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Recent AI Activity
                </div>
                <div className="space-y-2">
                  {aiActivity.slice(0, 5).map((match: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-muted/20 text-xs">
                      <div>
                        <span className="font-medium">JD Analysis</span>
                        {(match.role || match.company) && (
                          <span className="text-muted-foreground ml-1.5">
                            · {[match.role, match.company].filter(Boolean).join(' @ ')}
                          </span>
                        )}
                      </div>
                      <span className={`font-mono font-medium ${match.overallScore >= 70 ? 'text-green-500' : match.overallScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {match.overallScore ?? '—'}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiActivity.length === 0 && !loading && (
              <div className="text-center py-6">
                <Zap className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No AI activity recorded yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
