import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Briefcase, MapPin, Calendar, Trash2, BarChart2, TrendingUp, Target } from 'lucide-react';
import { useApplicationTracker } from '@/hooks/useApplicationTracker';
import type { ApplicationStatus, TrackedApplication } from '@/types/tracker';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'tracked', label: 'Tracked' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  tracked: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  applied: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  interview: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
  offer: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-500 border-red-500/30',
  withdrawn: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
};

function ScorePill({ value, type }: { value?: number; type: 'ats' | 'fit' }) {
  if (value === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  const color = value >= 80 ? 'text-emerald-500' : value >= 60 ? 'text-yellow-500' : 'text-red-500';
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {value}%{type === 'ats' ? ' ATS' : ' fit'}
    </span>
  );
}

function SkillsAnalytics({ applications }: { applications: TrackedApplication[] }) {
  const skillFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    applications.forEach(app => {
      app.skills.forEach(skill => {
        const key = skill.toLowerCase().trim();
        freq[key] = (freq[key] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }));
  }, [applications]);

  const max = skillFrequency[0]?.count ?? 1;

  if (skillFrequency.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Most In-Demand Skills
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            across {applications.length} application{applications.length !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {skillFrequency.map(({ skill, count }) => (
            <div key={skill} className="flex items-center gap-3">
              <span className="text-xs w-36 truncate capitalize">{skill}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {count}×
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ApplicationTracker() {
  const { applications, isLoading, updateStatus, deleteApplication } = useApplicationTracker();
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');

  const filtered = useMemo(() =>
    filterStatus === 'all' ? applications : applications.filter(a => a.status === filterStatus),
    [applications, filterStatus]
  );

  const thisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return applications.filter(a => new Date(a.createdAt).getTime() > cutoff).length;
  }, [applications]);

  const avgAts = useMemo(() => {
    const scored = applications.filter(a => a.atsScore !== undefined);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, a) => s + (a.atsScore ?? 0), 0) / scored.length);
  }, [applications]);

  const topSkill = useMemo(() => {
    const freq: Record<string, number> = {};
    applications.forEach(a => a.skills.forEach(s => { freq[s.toLowerCase()] = (freq[s.toLowerCase()] || 0) + 1; }));
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  }, [applications]);

  if (isLoading) {
    return (
      <div className="container py-8 text-center text-muted-foreground text-sm">
        Loading applications…
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Application Tracker</h1>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as ApplicationStatus | 'all')}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: <Briefcase className="h-4 w-4" />, label: 'Total', value: applications.length },
          { icon: <Calendar className="h-4 w-4" />, label: 'This week', value: thisWeek },
          { icon: <BarChart2 className="h-4 w-4" />, label: 'Avg ATS', value: avgAts !== null ? `${avgAts}%` : '—' },
          { icon: <Target className="h-4 w-4" />, label: 'Top skill', value: topSkill ? <span className="capitalize">{topSkill}</span> : '—' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {s.icon}
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="text-lg font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applications table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {applications.length === 0
              ? 'No applications tracked yet. Generate a prompt to start tracking.'
              : 'No applications match this filter.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(app => (
            <Card key={app.id} className="hover:bg-muted/20 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  {/* Main info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{app.role}</span>
                      <span className="text-xs text-muted-foreground">@ {app.company}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {app.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {app.promptType}
                      </Badge>
                    </div>

                    {/* Skills */}
                    {app.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {app.skills.slice(0, 8).map(skill => (
                          <span key={skill} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {skill}
                          </span>
                        ))}
                        {app.skills.length > 8 && (
                          <span className="text-[10px] text-muted-foreground">+{app.skills.length - 8}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Scores + status */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <ScorePill value={app.atsScore} type="ats" />
                      <ScorePill value={app.jobFitScore} type="fit" />
                    </div>
                    <Select
                      value={app.status}
                      onValueChange={v => updateStatus(app.id, v as ApplicationStatus)}
                    >
                      <SelectTrigger className={`h-6 text-[11px] px-2 border rounded-full w-28 ${STATUS_STYLE[app.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteApplication(app.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Skills analytics */}
      <SkillsAnalytics applications={applications} />
    </div>
  );
}
