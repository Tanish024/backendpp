import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Dialog } from './ui/dialog.tsx';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createProj = useMutation({
    mutationFn: async () => (await api.post('/projects', { name, key: key.toUpperCase() })).data.project,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onOpenChange(false);
      setName('');
      setKey('');
      toast.success('Project created');
      navigate(`/projects/${project._id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create project';
      toast.error(msg);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Project"
      description="Add a new project board to your workspace"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createProj.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Project Name</label>
          <Input
            required
            placeholder="Mobile Redesign"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!key) {
                const autoKey = e.target.value.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 5);
                setKey(autoKey);
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Key (Short Code)</label>
          <Input
            required
            maxLength={10}
            placeholder="MR"
            value={key}
            className="font-mono uppercase"
            onChange={(e) => setKey(e.target.value.toUpperCase())}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={createProj.isPending}>
            {createProj.isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
