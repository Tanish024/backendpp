import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Dialog } from './ui/dialog.tsx';

interface CreateSprintDialogProps {
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSprintDialog({ projectId, open, onOpenChange }: CreateSprintDialogProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const queryClient = useQueryClient();

  const createSprint = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { projectId, name: name.trim() };
      if (startDate) payload.startDate = new Date(startDate);
      if (endDate) payload.endDate = new Date(endDate);
      const res = await api.post('/sprints', payload);
      return res.data.sprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      onOpenChange(false);
      setName('');
      setStartDate('');
      setEndDate('');
      toast.success('Sprint created');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create sprint';
      toast.error(msg);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Sprint"
      description="Define a new iteration cycle for this project"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createSprint.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Sprint Name</label>
          <Input
            required
            placeholder="Sprint 1 — Alpha Release"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-2.5 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-2.5 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={createSprint.isPending || !name.trim()}>
            {createSprint.isPending ? 'Creating...' : 'Create Sprint'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
