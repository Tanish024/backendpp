import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, ArrowRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { useAuthStore, type Workspace } from '../lib/store.ts';
import { Button } from '../components/ui/button.tsx';
import { CreateWorkspaceDialog } from '../components/CreateWorkspaceDialog.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';

interface WorkspaceItem {
  _id: string;
  name: string;
  slug: string;
}

export function WorkspacesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const setWorkspace = useAuthStore((s) => s.setWorkspace);

  const { data: workspaces = [], isLoading } = useQuery<WorkspaceItem[]>({
    queryKey: ['workspaces'],
    queryFn: async () => (await api.get('/workspaces')).data.workspaces,
  });

  const selectWorkspace = useMutation({
    mutationFn: async (ws: WorkspaceItem) => {
      const res = await api.post(`/workspaces/${ws._id}/switch`);
      return { token: res.data.token, role: res.data.role, ws };
    },
    onSuccess: ({ token, role, ws }) => {
      const active: Workspace = { _id: ws._id, name: ws.name, slug: ws.slug, role };
      setWorkspace(token, active);
      toast.success(`Switched to ${ws.name}`);
      navigate('/projects');
    },
    onError: () => toast.error('Failed to switch workspace'),
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background bg-dotted-grid">
      <div className="w-full max-w-md">
        <div className="text-center mb-3">
          <span className="font-mono text-xs font-semibold text-muted-foreground tracking-widest uppercase">bpp_</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-none space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">Workspaces</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Select a workspace to continue</p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1 stroke-[1.5]" />
              New
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="rounded-lg border border-border p-6 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground mb-3">No workspaces found</p>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                Create a workspace
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <div
                  key={ws._id}
                  onClick={() => selectWorkspace.mutate(ws)}
                  className="group flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:border-primary/50 cursor-pointer transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors duration-150">
                      <Building2 className="h-4 w-4 stroke-[1.5]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-medium text-foreground">{ws.name}</h2>
                      <p className="font-mono text-[11px] text-muted-foreground">/{ws.slug}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
                </div>
              ))}
            </div>
          )}
        </div>

        <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </div>
  );
}
