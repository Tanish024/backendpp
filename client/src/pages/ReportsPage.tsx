import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart3, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Skeleton } from '../components/ui/skeleton.tsx';
import { format } from 'date-fns';

interface ProjectItem {
  _id: string;
  name: string;
  key: string;
}

interface SprintItem {
  _id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
}


interface VelocityItem {
  sprintId: string;
  sprintName: string;
  completedHours: number;
  taskCount: number;
}

interface WorkloadItem {
  assigneeId?: string;
  assigneeName: string;
  assigneeEmail?: string;
  openHours: number;
  taskCount: number;
}

interface OverdueTask {
  _id: string;
  title: string;
  dueDate: string;
  priority: string;
  assigneeId?: { name: string; email: string };
  projectId?: { name: string; key: string };
}

export function ReportsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  // 1. Fetch projects
  const { data: projects = [] } = useQuery<ProjectItem[]>({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/projects')).data.projects,
  });

  const activeProjectId = selectedProjectId || projects[0]?._id;

  // 2. Fetch sprints for selected project
  const { data: sprints = [] } = useQuery<SprintItem[]>({
    queryKey: ['sprints', activeProjectId],
    queryFn: async () => (await api.get(`/sprints?projectId=${activeProjectId}`)).data.sprints,
    enabled: !!activeProjectId,
  });

  const activeSprintId = selectedSprintId || sprints[0]?._id;

  // 3. Fetch Burndown for selected sprint
  const { data: burndownData, isLoading: isBurndownLoading } = useQuery({
    queryKey: ['report-burndown', activeSprintId],
    queryFn: async () => (await api.get(`/reports/burndown?sprintId=${activeSprintId}`)).data,
    enabled: !!activeSprintId,
  });

  // 4. Fetch Velocity for selected project
  const { data: velocityData } = useQuery<{ velocity: VelocityItem[] }>({
    queryKey: ['report-velocity', activeProjectId],
    queryFn: async () => (await api.get(`/reports/velocity?projectId=${activeProjectId}`)).data,
    enabled: !!activeProjectId,
  });

  // 5. Fetch Workload
  const { data: workloadData, isLoading: isWorkloadLoading } = useQuery<{ workload: WorkloadItem[] }>({
    queryKey: ['report-workload'],
    queryFn: async () => (await api.get('/reports/workload')).data,
  });

  // 6. Fetch Overdue tasks
  const { data: overdueData, isLoading: isOverdueLoading } = useQuery<{ tasks: OverdueTask[] }>({
    queryKey: ['report-overdue'],
    queryFn: async () => (await api.get('/reports/overdue')).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 stroke-[1.5] text-primary" />
            Analytics & Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sprint velocity, burn-down trends, and team capacity tracking
          </p>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs text-muted-foreground">Project:</label>
            <select
              value={activeProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedSprintId('');
              }}
              className="h-8 rounded-lg border border-input bg-card px-2.5 font-mono text-xs text-foreground focus-visible:outline-none focus:ring-1 focus:ring-primary"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid: Burndown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burndown Card */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary stroke-[1.5]" />
              <h2 className="text-sm font-semibold text-foreground">Sprint Burndown</h2>
            </div>

            {sprints.length > 0 && (
              <select
                value={activeSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                className="h-7 rounded border border-input bg-background px-2 font-mono text-[11px] text-foreground focus:outline-none"
              >
                {sprints.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {isBurndownLoading ? (
            <Skeleton className="h-64 w-full rounded" />
          ) : !activeSprintId || !burndownData?.burndown?.length ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No sprint data available to chart.</p>
              <p className="font-mono text-[10px] mt-1">Create a sprint and add task estimates to view burndown.</p>
            </div>
          ) : (
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndownData.burndown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="idealRemaining"
                    name="Ideal Burn"
                    stroke="#71717a"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="remainingEstimateHours"
                    name="Actual Remaining (hrs)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Velocity Card */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-none">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary stroke-[1.5]" />
            <h2 className="text-sm font-semibold text-foreground">Completed Sprints Velocity</h2>
          </div>

          {!velocityData?.velocity?.length ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No completed sprints yet.</p>
              <p className="font-mono text-[10px] mt-1">Complete a sprint to see historical delivery velocity.</p>
            </div>
          ) : (
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData.velocity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="sprintName" stroke="#71717a" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="completedHours" name="Completed Hours" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="taskCount" name="Completed Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Team Workload & Overdue Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-none">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary stroke-[1.5]" />
            <h2 className="text-sm font-semibold text-foreground">Team Member Workload (Open Tasks)</h2>
          </div>

          {isWorkloadLoading ? (
            <Skeleton className="h-48 w-full rounded" />
          ) : !workloadData?.workload?.length ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No active workload data.</p>
          ) : (
            <div className="space-y-3">
              {workloadData.workload.map((w) => (
                <div key={w.assigneeName} className="p-2.5 rounded-lg border border-border bg-background space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{w.assigneeName}</span>
                    <span className="font-mono text-muted-foreground">
                      {w.openHours}h remaining ({w.taskCount} tasks)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(10, w.openHours * 3))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Tasks */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-none">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 stroke-[1.5]" />
            <h2 className="text-sm font-semibold text-foreground">Overdue Tasks</h2>
          </div>

          {isOverdueLoading ? (
            <Skeleton className="h-48 w-full rounded" />
          ) : !overdueData?.tasks?.length ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              🎉 No overdue tasks! All assignments are on schedule.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {overdueData.tasks.map((task) => (
                <div
                  key={task._id}
                  className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <p className="font-medium text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span>{task.projectId?.key}</span>
                      <span>•</span>
                      <span>Assignee: {task.assigneeId?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[11px] text-destructive font-medium block">
                      {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
