import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { RequireAuth, RequireWorkspace, PublicOnly } from './components/RouteGuards.tsx';
import { AppLayout } from './components/AppLayout.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { WorkspacesPage } from './pages/WorkspacesPage.tsx';
import { AcceptInvitePage } from './pages/AcceptInvitePage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { ProjectBoardPage } from './pages/ProjectBoardPage.tsx';
import { MembersPage } from './pages/MembersPage.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public-only routes */}
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Accept invite */}
          <Route path="/invite" element={<AcceptInvitePage />} />

          {/* User authenticated, workspace selection */}
          <Route element={<RequireAuth />}>
            <Route path="/workspaces" element={<WorkspacesPage />} />
          </Route>

          {/* Workspace scoped routes */}
          <Route element={<RequireWorkspace />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectBoardPage />} />
              <Route path="/members" element={<MembersPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster richColors position="top-right" closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
