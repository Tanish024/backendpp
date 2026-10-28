import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Dialog } from './ui/dialog.tsx';

interface CreateTaskDialogProps {
  projectId?: string;
  defaultSprintId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberItem {
  _id: string;
  userId: { _id: string; name: string; email: string };
}

interface SprintItem {
  _id: string;
  name: string;
}

export function CreateTaskDialog({ projectId, defaultSprintId, open, onOpenChange }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState(defaultSprintId || '');
  const [estimateHours, setEstimateHours] = useState('');

  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery<MemberItem[]>({
    queryKey: ['members'],
    queryFn: async () => (await api.get('/members')).data.members,
    enabled: open,
  });

  const { data: sprints = [] } = useQuery<SprintItem[]>({
    queryKey: ['sprints', projectId],
    queryFn: async () => (await api.get(`/sprints?projectId=${projectId}`)).data.sprints,
    enabled: !!projectId && open,
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assigneeId || undefined,
        sprintId: sprintId || undefined,
        estimateHours: estimateHours ? parseFloat(estimateHours) : undefined,
      };
      const res = await api.post('/tasks', payload);
      return res.data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setAssigneeId('');
      setEstimateHours('');
      toast.success('Task created');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create task';
      toast.error(msg);
    },
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
        className="space-y-3.5"
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

        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Description (optional)</label>
          <textarea
            className="w-full rounded-lg border border-input bg-card p-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
            rows={2}
            placeholder="Describe what needs to be done..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Priority</label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-card px-2 font-mono text-[11px] uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
            >
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
              <option value="urgent">URGENT</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Estimate (Hours)</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g. 3"
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
              className="h-8 font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Assignee</label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m.userId?._id}>
                  {m.userId?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground">Sprint</label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
            >
              <option value="">No Sprint (Backlog)</option>
              {sprints.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
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
