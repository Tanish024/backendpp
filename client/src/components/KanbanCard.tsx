import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils.ts';
import type { PriorityType } from './ui/badge.tsx';

export interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: PriorityType;
  order: string;
  dueDate?: string | null;
  estimateHours?: number | null;
  taskNumber?: number | string | null;
  assigneeId?: { _id: string; name: string; email: string } | null;
}

interface KanbanCardProps {
  task: TaskItem;
  disabled?: boolean;
  projectKey?: string;
  onClick: () => void;
}

const priorityDotColors: Record<PriorityType, string> = {
  low: 'bg-zinc-500',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-[#ef4444]',
};

export function KanbanCard({ task, disabled, projectKey, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    disabled,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const initials = task.assigneeId?.name
    ? task.assigneeId.name.slice(0, 2).toUpperCase()
    : null;

  const keyDisplay = projectKey
    ? task.taskNumber
      ? `${projectKey}-${task.taskNumber}`
      : `${projectKey}`
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group relative rounded-lg border border-border bg-card p-3 select-none cursor-pointer transition-colors duration-150 hover:border-primary/50 shadow-none',
        isDragging && 'opacity-50 ring-2 ring-primary/40 border-primary z-10',
        disabled && 'cursor-default',
      )}
    >
      {keyDisplay && (
        <div className="font-mono text-[11px] text-muted-foreground mb-1 tracking-wider uppercase">
          {keyDisplay}
        </div>
      )}
      <p className="text-sm font-normal text-foreground leading-snug mb-2">{task.title}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-1.5 w-1.5 rounded-full inline-block shrink-0', priorityDotColors[task.priority] || 'bg-zinc-500')}
            title={`Priority: ${task.priority}`}
          />
          {task.dueDate && (
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Calendar className="h-3 w-3 stroke-[1.5]" />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {task.estimateHours != null && (
            <span className="font-mono text-[11px]">{task.estimateHours}h</span>
          )}
        </div>

        {initials && (
          <div
            className="h-5 w-5 rounded-full bg-muted flex items-center justify-center font-mono text-[10px] font-medium text-muted-foreground"
            title={task.assigneeId?.name}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}
