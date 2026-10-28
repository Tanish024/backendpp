import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { useAuthStore } from '../lib/store.ts';
import { can, type Role } from '../lib/permissions.ts';
import { Button } from '../components/ui/button.tsx';
import { InviteMemberDialog } from '../components/InviteMemberDialog.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';

interface MemberItem {
  _id: string;
  role: Role;
  userId: { _id: string; name: string; email: string };
}

export function MembersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);

  const canInvite = can(activeWorkspace?.role, 'invite:create');
  const canUpdateRole = can(activeWorkspace?.role, 'member:updateRole');
  const canRemove = can(activeWorkspace?.role, 'member:remove');

  const { data: members = [], isLoading } = useQuery<MemberItem[]>({
    queryKey: ['members'],
    queryFn: async () => (await api.get('/members')).data.members,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: Role }) => {
      return (await api.patch(`/members/${userId}/role`, { role: newRole })).data.member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member role updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update role';
      toast.error(msg);
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => (await api.delete(`/members/${userId}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member removed');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to remove member';
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Workspace Members</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage permissions and team access</p>
        </div>
        {canInvite && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5 stroke-[1.5]" />
            Invite Member
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-none">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/20 font-mono text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                {canRemove && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => {
                const isOwner = m.role === 'owner';
                const initials = m.userId?.name?.slice(0, 2).toUpperCase() || 'U';

                return (
                  <tr key={m._id} className="hover:bg-muted/20 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-mono text-[10px] font-medium text-muted-foreground">
                          {initials}
                        </div>
                        <span className="font-medium text-foreground text-sm">{m.userId?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{m.userId?.email}</td>
                    <td className="px-4 py-3">
                      {isOwner || !canUpdateRole ? (
                        <span className="font-mono text-[11px] tracking-wider uppercase px-2 py-0.5 rounded border border-border bg-transparent text-muted-foreground">
                          {m.role}
                        </span>
                      ) : (
                        <select
                          className="h-7 rounded-lg border border-input bg-card px-2 font-mono text-[11px] uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors duration-150"
                          value={m.role}
                          onChange={(e) => updateRole.mutate({ userId: m.userId._id, newRole: e.target.value as Role })}
                        >
                          <option value="admin">ADMIN</option>
                          <option value="member">MEMBER</option>
                          <option value="guest">GUEST</option>
                        </select>
                      )}
                    </td>
                    {canRemove && (
                      <td className="px-4 py-3 text-right">
                        {!isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMember.mutate(m.userId._id)}
                            aria-label={`Remove ${m.userId?.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
