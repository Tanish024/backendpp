import { cn } from '../../lib/utils.ts';

export type StatusType = 'todo' | 'in_progress' | 'in_review' | 'done';
export type PriorityType = 'low' | 'medium' | 'high' | 'urgent';

interface BadgeProps {
  status?: StatusType;
  priority?: PriorityType;
  label?: string;
  className?: string;
}

const statusDotColors: Record<StatusType, string> = {
  todo: 'bg-zinc-500',
  in_progress: 'bg-blue-500',
  in_review: 'bg-amber-500',
  done: 'bg-[#22c55e]',
};

const statusLabels: Record<StatusType, string> = {
  todo: 'todo',
  in_progress: 'in_progress',
  in_review: 'in_review',
  done: 'done',
};

const priorityDotColors: Record<PriorityType, string> = {
  low: 'bg-zinc-500',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-[#ef4444]',
};

const priorityLabels: Record<PriorityType, string> = {
  low: 'low',
  medium: 'med',
  high: 'high',
  urgent: 'urgent',
};

export function StatusBadge({ status, className }: { status: StatusType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', statusDotColors[status])} />
      {statusLabels[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: PriorityType; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', priorityDotColors[priority])} />
      {priorityLabels[priority]}
    </span>
  );
}

export function NeutralBadge({ label, dotColor, className }: BadgeProps & { dotColor?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-transparent font-mono text-[11px] uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      {dotColor && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)} />}
      {label}
    </span>
  );
}
