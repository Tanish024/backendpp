import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { useAuthStore } from '../lib/store.ts';
import { can } from '../lib/permissions.ts';
import { Button } from '../components/ui/button.tsx';
import { KanbanColumn } from '../components/KanbanColumn.tsx';
import { KanbanCard, type TaskItem } from '../components/KanbanCard.tsx';
import { TaskDetailSheet } from '../components/TaskDetailSheet.tsx';
import { CreateTaskDialog } from '../components/CreateTaskDialog.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';

const COLUMNS: { id: TaskItem['status']; title: string }[] = [
  { id: 'todo', title: 'Todo' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
];

export function ProjectBoardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const isGuest = activeWorkspace?.role === 'guest';
  const canCreateTask = can(activeWorkspace?.role, 'task:create');

  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data.project,
    enabled: !!projectId,
  });

  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ['tasks', projectId],
    queryFn: async () => (await api.get(`/tasks?projectId=${projectId}`)).data.tasks,
    enabled: !!projectId,
  });

  const columns = useMemo(() => {
    const map: Record<TaskItem['status'], TaskItem[]> = { todo: [], in_progress: [], in_review: [], done: [] };
    for (const t of tasks) if (map[t.status]) map[t.status].push(t);
    return map;
  }, [tasks]);

  const moveTask = useMutation({
    mutationFn: async (payload: { taskId: string; status: string; beforeId?: string; afterId?: string }) => {
      return (await api.patch(`/tasks/${payload.taskId}/move`, payload)).data.task;
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.error('Failed to move task. Reverting.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    if (isGuest || !e.over) return;
    const activeId = e.active.id as string;
    const overId = e.over.id as string;
    const dragged = tasks.find((t) => t._id === activeId);
    if (!dragged) return;

    const isCol = COLUMNS.some((c) => c.id === overId);
    const targetStatus = isCol ? (overId as TaskItem['status']) : (tasks.find((t) => t._id === overId)?.status || dragged.status);
    const list = tasks.filter((t) => t.status === targetStatus && t._id !== activeId);
    const idx = isCol ? list.length : Math.max(0, list.findIndex((t) => t._id === overId));

    const beforeId = list[idx - 1]?._id;
    const afterId = list[idx]?._id;

    queryClient.setQueryData(['tasks', projectId], tasks.map((t) => (t._id === activeId ? { ...t, status: targetStatus } : t)));
    moveTask.mutate({ taskId: activeId, status: targetStatus, beforeId, afterId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150" aria-label="Back">
            <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {project?.name || 'Project Board'}
            </h1>
            {project?.key && (
              <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border border-border bg-card text-muted-foreground">
                {project.key}
              </span>
            )}
          </div>
        </div>
        {canCreateTask && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5 stroke-[1.5]" />
            New Task
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => <Skeleton key={col.id} className="w-72 h-96 shrink-0 rounded-lg" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => {
          if (!isGuest) setActiveTask(tasks.find((t) => t._id === e.active.id) || null);
        }} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={columns[col.id]}
                projectKey={project?.key}
                disabled={isGuest}
                onCardClick={(t) => { setSelectedTask(t); setSheetOpen(true); }}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="w-72 opacity-80">
                <KanbanCard task={activeTask} projectKey={project?.key} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <TaskDetailSheet task={selectedTask} open={sheetOpen} onOpenChange={setSheetOpen} disabled={isGuest} />
      <CreateTaskDialog projectId={projectId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
