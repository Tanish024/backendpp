import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, MessageSquare, Activity as ActivityIcon, X, Plus } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Sheet } from './ui/sheet.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { cn } from '../lib/utils.ts';
import type { TaskItem } from './KanbanCard.tsx';

interface TaskDetailSheetProps {
  task: TaskItem | null;
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

interface CommentItem {
  _id: string;
  body: string;
  authorId: { _id: string; name: string; email: string };
  createdAt: string;
}

interface MemberItem {
  _id: string;
  userId: { _id: string; name: string; email: string };
}

interface SprintItem {
  _id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
}

interface TimeLogItem {
  _id: string;
  hours: number;
  date: string;
  note?: string;
  userId: { _id: string; name: string; email: string };
}

interface ActivityItem {
  _id: string;
  action: string;
  actorId: { _id: string; name: string; email: string };
  createdAt: string;
  meta?: Record<string, unknown>;
}

export function TaskDetailSheet({ task, projectId, open, onOpenChange, disabled }: TaskDetailSheetProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'comments' | 'timelogs' | 'activity'>('comments');
  const [commentText, setCommentText] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showAddLabel, setShowAddLabel] = useState(false);

  // Time logging inputs
  const [logHours, setLogHours] = useState('');
  const [logNote, setLogNote] = useState('');

  // Fetch workspace members for assignee picker
  const { data: members = [] } = useQuery<MemberItem[]>({
    queryKey: ['members'],
    queryFn: async () => (await api.get('/members')).data.members,
    enabled: open,
  });

  // Fetch project sprints
  const { data: sprints = [] } = useQuery<SprintItem[]>({
    queryKey: ['sprints', projectId],
    queryFn: async () => (await api.get(`/sprints?projectId=${projectId}`)).data.sprints,
    enabled: !!projectId && open,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery<CommentItem[]>({
    queryKey: ['comments', task?._id],
    queryFn: async () => (await api.get(`/comments?taskId=${task?._id}`)).data.comments,
    enabled: !!task?._id && open && activeTab === 'comments',
  });

  // Fetch timelogs
  const { data: timeLogs = [] } = useQuery<TimeLogItem[]>({
    queryKey: ['timelogs', task?._id],
    queryFn: async () => (await api.get(`/timelogs?taskId=${task?._id}`)).data.timeLogs,
    enabled: !!task?._id && open && activeTab === 'timelogs',
  });

  // Fetch activities
  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ['activities', task?._id],
    queryFn: async () => (await api.get(`/activities?entityId=${task?._id}`)).data.activities,
    enabled: !!task?._id && open && activeTab === 'activity',
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<TaskItem> | Record<string, unknown>) =>
      (await api.patch(`/tasks/${task?._id}`, updates)).data.task,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const addComment = useMutation({
    mutationFn: async (body: string) => (await api.post('/comments', { taskId: task?._id, body })).data.comment,
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', task?._id] });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const addTimeLog = useMutation({
    mutationFn: async () => {
      return (
        await api.post('/timelogs', {
          taskId: task?._id,
          hours: parseFloat(logHours),
          note: logNote.trim() || undefined,
        })
      ).data.timeLog;
    },
    onSuccess: () => {
      setLogHours('');
      setLogNote('');
      queryClient.invalidateQueries({ queryKey: ['timelogs', task?._id] });
      toast.success('Time logged successfully');
    },
    onError: () => toast.error('Failed to log time'),
  });

  if (!task) return null;

  const totalLoggedHours = timeLogs.reduce((acc, curr) => acc + (curr.hours || 0), 0);
  const formattedDueDate = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '';

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const currentLabels = task.labels || [];
    if (!currentLabels.includes(newLabel.trim())) {
      updateTask.mutate({ labels: [...currentLabels, newLabel.trim()] });
    }
    setNewLabel('');
    setShowAddLabel(false);
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const currentLabels = task.labels || [];
    updateTask.mutate({ labels: currentLabels.filter((l) => l !== labelToRemove) });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Task Details" className="sm:max-w-md w-full">
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block">Title</label>
          <Input
            defaultValue={task.title}
            disabled={disabled}
            onBlur={(e) => {
              if (e.target.value !== task.title && e.target.value.trim()) {
                updateTask.mutate({ title: e.target.value.trim() });
              }
            }}
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block">Description</label>
          <textarea
            className="w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors duration-150"
            rows={2}
            defaultValue={task.description || ''}
            disabled={disabled}
            placeholder="Add description..."
            onBlur={(e) => {
              if (e.target.value !== (task.description || '')) {
                updateTask.mutate({ description: e.target.value });
              }
            }}
          />
        </div>

        {/* Grid for Status, Priority, Assignee, Sprint */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block mb-1">Status</label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-card px-2 font-mono text-[11px] uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors"
              value={task.status}
              disabled={disabled}
              onChange={(e) => updateTask.mutate({ status: e.target.value as TaskItem['status'] })}
            >
              <option value="todo">TODO</option>
              <option value="in_progress">IN PROGRESS</option>
              <option value="in_review">IN REVIEW</option>
              <option value="done">DONE</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block mb-1">Priority</label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-card px-2 font-mono text-[11px] uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors"
              value={task.priority}
              disabled={disabled}
              onChange={(e) => updateTask.mutate({ priority: e.target.value as TaskItem['priority'] })}
            >
              <option value="low">LOW</option>
              <option value="medium">MED</option>
              <option value="high">HIGH</option>
              <option value="urgent">URGENT</option>
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block mb-1">Assignee</label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors"
              value={task.assigneeId?._id || ''}
              disabled={disabled}
              onChange={(e) => updateTask.mutate({ assigneeId: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m.userId?._id}>
                  {m.userId?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block mb-1">Sprint</label>
            <select
              className="w-full h-8 rounded-lg border border-input bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors"
              value={task.sprintId || ''}
              disabled={disabled}
              onChange={(e) => updateTask.mutate({ sprintId: e.target.value || null })}
            >
              <option value="">No Sprint (Backlog)</option>
              {sprints.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block mb-1">Due Date</label>
            <input
              type="date"
              defaultValue={formattedDueDate}
              disabled={disabled}
              className="w-full h-8 rounded-lg border border-input bg-card px-2 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors"
              onChange={(e) => updateTask.mutate({ dueDate: e.target.value ? new Date(e.target.value) : null })}
            />
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block mb-1">Estimate (Hours)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder="e.g. 4.5"
              defaultValue={task.estimateHours ?? ''}
              disabled={disabled}
              className="w-full h-8 rounded-lg border border-input bg-card px-2 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors"
              onBlur={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : null;
                if (val !== task.estimateHours) updateTask.mutate({ estimateHours: val });
              }}
            />
          </div>
        </div>

        {/* Labels / Tags */}
        <div className="space-y-1.5 pt-1">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block">Labels</label>
          <div className="flex flex-wrap items-center gap-1.5">
            {(task.labels || []).map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground border border-border"
              >
                {label}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(label)}
                    className="hover:text-destructive"
                    aria-label={`Remove label ${label}`}
                  >
                    <X className="h-3 w-3 stroke-[1.5]" />
                  </button>
                )}
              </span>
            ))}
            {!disabled && !showAddLabel && (
              <button
                type="button"
                onClick={() => setShowAddLabel(true)}
                className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
              >
                <Plus className="h-3 w-3 stroke-[1.5]" />
                Add tag
              </button>
            )}
            {showAddLabel && (
              <form onSubmit={handleAddLabel} className="inline-flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="tag name..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onBlur={() => {
                    if (!newLabel.trim()) setShowAddLabel(false);
                  }}
                  className="h-6 w-24 rounded border border-input bg-card px-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="h-6 px-1.5 rounded bg-primary text-primary-foreground font-mono text-[10px]"
                >
                  Add
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Tab switchers: Comments, Time Tracking, Activity */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-4 border-b border-border mb-3 pb-1">
            <button
              onClick={() => setActiveTab('comments')}
              className={cn(
                'flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider pb-1 transition-colors relative',
                activeTab === 'comments'
                  ? 'text-primary font-semibold border-b-2 border-primary -mb-[5px]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 stroke-[1.5]" />
              Comments ({comments.length})
            </button>
            <button
              onClick={() => setActiveTab('timelogs')}
              className={cn(
                'flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider pb-1 transition-colors relative',
                activeTab === 'timelogs'
                  ? 'text-primary font-semibold border-b-2 border-primary -mb-[5px]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Clock className="h-3.5 w-3.5 stroke-[1.5]" />
              Time ({timeLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                'flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider pb-1 transition-colors relative',
                activeTab === 'activity'
                  ? 'text-primary font-semibold border-b-2 border-primary -mb-[5px]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ActivityIcon className="h-3.5 w-3.5 stroke-[1.5]" />
              History
            </button>
          </div>

          {/* Comments Panel */}
          {activeTab === 'comments' && (
            <div className="space-y-3">
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No comments yet.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c._id} className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-none">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">{c.authorId?.name}</span>
                        <span className="font-mono text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))
                )}
              </div>

              {!disabled && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (commentText.trim()) addComment.mutate(commentText.trim());
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Write a comment, use @name..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <Button size="sm" type="submit" disabled={!commentText.trim() || addComment.isPending}>
                    Post
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Time Tracking Panel */}
          {activeTab === 'timelogs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 font-mono text-xs">
                <span className="text-muted-foreground">Logged vs Estimate:</span>
                <span className="font-semibold text-foreground">
                  {totalLoggedHours}h / {task.estimateHours ? `${task.estimateHours}h` : 'No estimate'}
                </span>
              </div>

              {!disabled && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (parseFloat(logHours) > 0) addTimeLog.mutate();
                  }}
                  className="space-y-2 p-2.5 rounded-lg border border-border bg-card text-xs"
                >
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Log Work</div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.25"
                      min="0.1"
                      placeholder="Hours..."
                      value={logHours}
                      onChange={(e) => setLogHours(e.target.value)}
                      className="w-24 font-mono text-xs"
                      required
                    />
                    <Input
                      placeholder="What did you work on? (optional)"
                      value={logNote}
                      onChange={(e) => setLogNote(e.target.value)}
                      className="text-xs"
                    />
                    <Button size="sm" type="submit" disabled={!logHours || addTimeLog.isPending}>
                      Log
                    </Button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {timeLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No time logged yet.</p>
                ) : (
                  timeLogs.map((tl) => (
                    <div key={tl._id} className="flex items-center justify-between p-2 rounded border border-border text-xs">
                      <div>
                        <span className="font-medium text-foreground">{tl.userId?.name}</span>
                        {tl.note && <span className="text-muted-foreground ml-2">— {tl.note}</span>}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="font-semibold text-primary">{tl.hours}h</span>
                        <span className="text-muted-foreground">{new Date(tl.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Activity / Audit History Panel */}
          {activeTab === 'activity' && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No activity recorded yet.</p>
              ) : (
                activities.map((a) => (
                  <div key={a._id} className="p-2 rounded border border-border bg-card text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{a.actorId?.name || 'User'}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground capitalize">
                      {a.action} task
                      {a.meta && Object.keys(a.meta).length > 0 && ` (${Object.keys(a.meta).join(', ')})`}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
