import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard, type TaskItem } from './KanbanCard.tsx';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: TaskItem[];
  disabled?: boolean;
  projectKey?: string;
  onCardClick: (task: TaskItem) => void;
}

export function KanbanColumn({ id, title, tasks, disabled, projectKey, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { columnId: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-lg bg-white/[0.02] border border-border p-2.5 min-h-[500px] transition-colors duration-150 ${
        isOver ? 'border-primary/50 bg-white/[0.04]' : ''
      }`}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground font-medium">
          {title}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{tasks.length}</span>
      </div>

      <SortableContext
        id={id}
        items={tasks.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 min-h-[100px]">
          {tasks.map((task) => (
            <KanbanCard
              key={task._id}
              task={task}
              projectKey={projectKey}
              disabled={disabled}
              onClick={() => onCardClick(task)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
