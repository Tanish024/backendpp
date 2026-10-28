import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, closestCorners,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, ArrowLeft, Search, Calendar, Play, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { useAuthStore } from '../lib/store.ts';
import { can } from '../lib/permissions.ts';
import { Button } from '../components/ui/button.tsx';
import { KanbanColumn } from '../components/KanbanColumn.tsx';
import { KanbanCard, type TaskItem } from '../components/KanbanCard.tsx';
import { TaskDetailSheet } from '../components/TaskDetailSheet.tsx';
import { CreateTaskDialog } from '../components/CreateTaskDialog.tsx';
import { CreateSprintDialog } from '../components/CreateSprintDialog.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';

const COLUMNS: { id: TaskItem['status']; title: string }[] = [
  { id: 'todo', title: 'Todo' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
];

interface SprintItem {
  _id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
  startDate?: string;
  endDate?: string;
}

export function ProjectBoardPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const user = useAuthStore((s) => s.user);
  const isGuest = activeWorkspace?.role === 'guest';
  const canCreateTask = can(activeWorkspace?.role, 'task:create');
  const canManageSprint = can(activeWorkspace?.role, 'sprint:create');

  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data.project,
    enabled: !!projectId,
  });

  const { data: sprints = [] } = useQuery<SprintItem[]>({
    queryKey: ['sprints', projectId],
    queryFn: async () => (await api.get(`/sprints?projectId=${projectId}`)).data.sprints,
    enabled: !!projectId,
  });

  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ['tasks', projectId],
    queryFn: async () => (await api.get(`/tasks?projectId=${projectId}`)).data.tasks,
    enabled: !!projectId,
  });

  const currentSprint = sprints.find((s) => s._id === selectedSprintFilter);

  const updateSprintStatus = useMutation({
    mutationFn: async ({ sprintId, status }: { sprintId: string; status: 'active' | 'completed' }) => {
      return (await api.patch(`/sprints/${sprintId}`, { status })).data.sprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      toast.success('Sprint status updated');
    },
    onError: () => toast.error('Failed to update sprint'),
  });

  // Client-side filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Sprint filter
      if (selectedSprintFilter === 'active_only') {
        const activeSprintIds = sprints.filter((s) => s.status === 'active').map((s) => s._id);
        if (!t.sprintId || !activeSprintIds.includes(t.sprintId)) return false;
      } else if (selectedSprintFilter === 'backlog') {
        if (t.sprintId) return false;
      } else if (selectedSprintFilter !== 'all') {
        if (t.sprintId !== selectedSprintFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      // Assignee filter
      if (assigneeFilter === 'me') {
        if (t.assigneeId?._id !== user?._id) return false;
      } else if (assigneeFilter === 'unassigned') {
        if (t.assigneeId) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [tasks, selectedSprintFilter, sprints, priorityFilter, assigneeFilter, user?._id, searchQuery]);

  const columns = useMemo(() => {
    const map: Record<TaskItem['status'], TaskItem[]> = { todo: [], in_progress: [], in_review: [], done: [] };
    for (const t of filteredTasks) if (map[t.status]) map[t.status].push(t);
    return map;
  }, [filteredTasks]);

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
            aria-label="Back"
          >
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

        <div className="flex items-center gap-2">
          {canManageSprint && (
            <Button variant="outline" size="sm" onClick={() => setCreateSprintOpen(true)}>
              <Calendar className="h-3.5 w-3.5 mr-1.5 stroke-[1.5]" />
              New Sprint
            </Button>
          )}
          {canCreateTask && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5 stroke-[1.5]" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Sprint Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground stroke-[1.5]" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Sprint Selector */}
          <select
            value={selectedSprintFilter}
            onChange={(e) => setSelectedSprintFilter(e.target.value)}
            className="h-8 px-2.5 text-xs font-mono rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Sprint: All Tasks</option>
            <option value="active_only">Sprint: Active Only</option>
            <option value="backlog">Backlog (No Sprint)</option>
            {sprints.map((s) => (
              <option key={s._id} value={s._id}>
                Sprint: {s.name} ({s.status})
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2 text-xs font-mono uppercase rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Priority: All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Assignee: All</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {/* Sprint Status Action */}
        {currentSprint && canManageSprint && (
          <div className="flex items-center gap-2">
            {currentSprint.status === 'planned' && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-mono"
                onClick={() => updateSprintStatus.mutate({ sprintId: currentSprint._id, status: 'active' })}
              >
                <Play className="h-3 w-3 mr-1 text-emerald-500 fill-emerald-500" />
                Start Sprint
              </Button>
            )}
            {currentSprint.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-mono"
                onClick={() => updateSprintStatus.mutate({ sprintId: currentSprint._id, status: 'completed' })}
              >
                <CheckCircle2 className="h-3 w-3 mr-1 text-blue-500" />
                Complete Sprint
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => <Skeleton key={col.id} className="w-72 h-96 shrink-0 rounded-lg" />)}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => {
            if (!isGuest) setActiveTask(tasks.find((t) => t._id === e.active.id) || null);
          }}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={columns[col.id]}
                projectKey={project?.key}
                disabled={isGuest}
                onCardClick={(t) => {
                  setSelectedTask(t);
                  setSheetOpen(true);
                }}
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

      <TaskDetailSheet
        task={selectedTask}
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        disabled={isGuest}
      />
      <CreateTaskDialog
        projectId={projectId}
        defaultSprintId={selectedSprintFilter !== 'all' && selectedSprintFilter !== 'active_only' && selectedSprintFilter !== 'backlog' ? selectedSprintFilter : null}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <CreateSprintDialog
        projectId={projectId}
        open={createSprintOpen}
        onOpenChange={setCreateSprintOpen}
      />
    </div>
  );
}
