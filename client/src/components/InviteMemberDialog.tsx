import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { api } from '../lib/api.ts';
import type { Role } from '../lib/permissions.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Dialog } from './ui/dialog.tsx';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InviteResult {
  message: string;
  emailSent: boolean;
  inviteUrl?: string;
  sentToEmail?: string;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const sendInvite = useMutation({
    mutationFn: async () => (await api.post('/invites', { email, role })).data as InviteResult,
    onSuccess: (data) => {
      setResult({ ...data, sentToEmail: email });
      setEmail('');
      setRole('member');
      if (data.emailSent) toast.success('Invitation sent');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send invite';
      toast.error(msg);
    },
  });

  const handleClose = (v: boolean) => {
    if (!v) { setResult(null); setCopied(false); }
    onOpenChange(v);
  };

  const handleCopy = async () => {
    if (!result?.inviteUrl) return;
    await navigator.clipboard.writeText(result.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Invite Team Member" description="Send an email invitation to join this workspace">
      {result ? (
        <div className="space-y-3">
          <p className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">
            {result.emailSent
              ? `Email sent to ${result.sentToEmail}`
              : 'Email not configured, share this link'}
          </p>
          {!result.emailSent && result.inviteUrl && (
            <div className="flex gap-2">
              <Input readOnly value={result.inviteUrl} className="font-mono text-[11px] text-muted-foreground" />
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                {copied
                  ? <><Check className="h-3.5 w-3.5 mr-1 stroke-[1.5]" />Copied</>
                  : <><Copy className="h-3.5 w-3.5 mr-1 stroke-[1.5]" />Copy link</>}
              </Button>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); sendInvite.mutate(); }} className="space-y-4">
          <div className="space-y-1">
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Email Address</label>
            <Input type="email" required placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Role</label>
            <select
              className="w-full h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors duration-150"
              value={role} onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="admin">Admin (full access, can manage members)</option>
              <option value="member">Member (can create & edit tasks)</option>
              <option value="guest">Guest (read-only view)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={sendInvite.isPending}>
              {sendInvite.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
