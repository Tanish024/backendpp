import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Dialog } from './ui/dialog.tsx';

interface CreateTaskDialogProps {
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskDialog({ projectId, open, onOpenChange }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await api.post('/tasks', { projectId, title });
      return res.data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onOpenChange(false);
      setTitle('');
      toast.success('Task created');
    },
    onError: () => toast.error('Failed to create task'),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Task"
      description="Add a new task to this project board"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) createTask.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Task Title</label>
          <Input
            required
            placeholder="Fix navigation alignment..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={createTask.isPending || !title.trim()}>
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
