import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FolderKanban, Users, Menu, LogOut, Building2 } from 'lucide-react';
import { useAuthStore } from '../lib/store.ts';
import { useSocket } from '../lib/useSocket.ts';
import { Button } from './ui/button.tsx';
import { Sheet } from './ui/sheet.tsx';
import { cn } from '../lib/utils.ts';

export function AppLayout() {
  const { isConnected } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Projects', to: '/projects', icon: FolderKanban },
    { name: 'Members', to: '/members', icon: Users },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-3.5">
      <div className="space-y-4">
        <div className="px-2 py-1 flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-muted-foreground tracking-wider">bpp_</span>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-r-md text-sm transition-colors duration-150',
                  isActive
                    ? 'bg-muted text-primary font-medium border-l-2 border-primary'
                    : 'text-muted-foreground border-l-2 border-transparent hover:bg-muted/40 hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4 stroke-[1.5]" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <div className="px-2.5 py-1">
          <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
          <p className="text-xs font-mono text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-muted-foreground hover:text-destructive"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut className="h-3.5 w-3.5 mr-2 stroke-[1.5]" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card">
        {sidebarContent}
      </aside>

      {/* Mobile sheet sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} side="left" className="max-w-[240px] p-0">
        {sidebarContent}
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 border-b border-border px-4 md:px-6 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4 stroke-[1.5]" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 font-mono text-xs text-foreground px-2.5 rounded-full border-border bg-card flex items-center gap-1.5"
              onClick={() => navigate('/workspaces')}
            >
              <Building2 className="h-3.5 w-3.5 stroke-[1.5] text-muted-foreground" />
              <span>{activeWorkspace?.name}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full border border-border inline-flex items-center gap-1.5 bg-card">
              <span className={isConnected ? 'text-[#22c55e]' : 'text-zinc-500'}>
                {isConnected ? '●' : '○'}
              </span>
              <span className={isConnected ? 'text-foreground' : 'text-muted-foreground'}>
                {isConnected ? 'live' : 'offline'}
              </span>
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md border border-border text-muted-foreground uppercase tracking-wider">
              {activeWorkspace?.role}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-6xl w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
