import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, FolderKanban } from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuthStore } from '../lib/store.ts';
import { can } from '../lib/permissions.ts';
import { Button } from '../components/ui/button.tsx';
import { CreateProjectDialog } from '../components/CreateProjectDialog.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';

interface ProjectItem {
  _id: string;
  name: string;
  key: string;
  status: string;
}

export function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const canCreate = can(activeWorkspace?.role, 'project:create');

  const { data: projects = [], isLoading } = useQuery<ProjectItem[]>({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/projects')).data.projects,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage tasks and track project workflows</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5 stroke-[1.5]" />
            New Project
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center bg-card shadow-none">
          <p className="text-xs text-muted-foreground mb-4">No projects found in this workspace.</p>
          {canCreate && (
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj._id}
              onClick={() => navigate(`/projects/${proj._id}`)}
              className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 cursor-pointer space-y-3 transition-colors duration-150 shadow-none"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium tracking-wider uppercase px-2 py-0.5 rounded border border-border bg-transparent text-muted-foreground">
                  {proj.key}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {proj.status}
                </span>
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-150 leading-tight">
                {proj.name}
              </h2>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground pt-2 border-t border-border">
                <FolderKanban className="h-3.5 w-3.5 stroke-[1.5]" />
                <span>Open Kanban Board</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
