import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { Sheet } from './ui/sheet.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import type { TaskItem } from './KanbanCard.tsx';

interface TaskDetailSheetProps {
  task: TaskItem | null;
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

export function TaskDetailSheet({ task, open, onOpenChange, disabled }: TaskDetailSheetProps) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const { data: comments = [] } = useQuery<CommentItem[]>({
    queryKey: ['comments', task?._id],
    queryFn: async () => (await api.get(`/comments?taskId=${task?._id}`)).data.comments,
    enabled: !!task?._id && open,
  });

  const updateTask = useMutation({
    mutationFn: async (updates: Partial<TaskItem>) => (await api.patch(`/tasks/${task?._id}`, updates)).data.task,
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

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Task Details">
      <div className="space-y-5">
        <div className="space-y-3">
          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block">Title</label>
          <Input
            defaultValue={task.title}
            disabled={disabled}
            onBlur={(e) => {
              if (e.target.value !== task.title && e.target.value.trim()) updateTask.mutate({ title: e.target.value.trim() });
            }}
          />

          <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block mt-2">Description</label>
          <textarea
            className="w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors duration-150"
            rows={3}
            defaultValue={task.description || ''}
            disabled={disabled}
            placeholder="Add description..."
            onBlur={(e) => {
              if (e.target.value !== (task.description || '')) updateTask.mutate({ description: e.target.value });
            }}
          />

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground block mb-1">Status</label>
              <select
                className="w-full h-9 rounded-lg border border-input bg-card px-2 font-mono text-[11px] uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors duration-150"
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
                className="w-full h-9 rounded-lg border border-input bg-card px-2 font-mono text-[11px] uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 transition-colors duration-150"
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
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground mb-3">Comments</h3>
          <div className="space-y-2.5 mb-4">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c._id} className="rounded-lg border border-border bg-card p-3 text-xs shadow-none">
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
      </div>
    </Sheet>
  );
}
