import { useState, useEffect } from 'react';
import { adminUpdateUserProfile, type UserProfile } from '@/lib/firebaseWeb';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AdminEditModalProps {
  /** The user to edit. Pass null to close the modal. */
  user: UserProfile | null;
  onClose: () => void;
  /** Called after a successful save — parent should re-fetch the user list. */
  onSaved: () => void;
}

export function AdminEditModal({ user, onClose, onSaved }: AdminEditModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [tokensAllocated, setTokensAllocated] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro' | 'admin'>('free');
  const [saving, setSaving] = useState(false);

  // Sync form fields whenever the selected user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setTokensAllocated(String(user.tokensAllocated));
      setPlan(user.plan);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const tokens = parseInt(tokensAllocated, 10);
    if (isNaN(tokens) || tokens < 0) {
      toast.error('Token allocation must be a non-negative number');
      return;
    }
    setSaving(true);
    try {
      await adminUpdateUserProfile(user.uid, {
        displayName: displayName.trim() || user.displayName,
        tokensAllocated: tokens,
        plan,
      });
      toast.success(`${displayName.trim() || user.displayName} updated`);
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="admin-edit-display-name">Display name</Label>
            <Input
              id="admin-edit-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
            />
          </div>

          {/* Email — read-only, Firebase Auth owns it */}
          <div className="space-y-1.5">
            <Label htmlFor="admin-edit-email">Email</Label>
            <Input
              id="admin-edit-email"
              value={user?.email ?? ''}
              readOnly
              disabled
              className="opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email is managed by Firebase Auth and cannot be changed here.
            </p>
          </div>

          {/* Tokens allocated */}
          <div className="space-y-1.5">
            <Label htmlFor="admin-edit-tokens">Tokens allocated</Label>
            <Input
              id="admin-edit-tokens"
              type="number"
              min={0}
              value={tokensAllocated}
              onChange={(e) => setTokensAllocated(e.target.value)}
            />
          </div>

          {/* Plan */}
          <div className="space-y-1.5">
            <Label htmlFor="admin-edit-plan">Plan</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as 'free' | 'pro' | 'admin')}>
              <SelectTrigger id="admin-edit-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
