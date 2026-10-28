import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { useAuthStore, type Workspace } from '../lib/store.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Dialog } from './ui/dialog.tsx';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isManualSlug, setIsManualSlug] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setWorkspace = useAuthStore((s) => s.setWorkspace);

  const createWs = useMutation({
    mutationFn: async () => (await api.post('/workspaces', { name, slug })).data,
    onSuccess: (data) => {
      const ws = data.workspace;
      const active: Workspace = { _id: ws._id, name: ws.name, slug: ws.slug, role: 'owner' };
      setWorkspace(data.token, active);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      onOpenChange(false);
      setName('');
      setSlug('');
      setIsManualSlug(false);
      toast.success('Workspace created');
      navigate('/projects');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create';
      toast.error(msg);
    },
  });

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isManualSlug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Workspace"
      description="A workspace contains your team projects and members"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createWs.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Workspace Name</label>
          <Input
            required
            placeholder="Acme Corp"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Slug (URL)</label>
          <div className="flex items-center h-9 w-full rounded-lg border border-input bg-card px-3 text-sm focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-colors duration-150">
            <span className="font-mono text-xs text-muted-foreground mr-1.5 select-none">/</span>
            <input
              required
              className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="acme-corp"
              value={slug}
              onChange={(e) => {
                setIsManualSlug(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={createWs.isPending}>
            {createWs.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
