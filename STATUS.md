# STATUS

| # | Item | Status | Files |
|---|------|--------|-------|
| 1 | Server scaffold & client scaffold | DONE | `server/src/app.js`, `client/src/App.tsx`, etc. |
| 2 | Core auth, tenancy, workspaces, members, invites & tests | DONE | `server/src/modules/auth.routes.js`, `server/src/modules/workspace.routes.js`, `server/src/modules/member.routes.js`, `server/src/modules/invite.routes.js`, `server/src/lib/tenant-plugin.js`, `server/src/lib/permissions.js` |
| 3 | Domain API (projects, sprints, tasks + fractional-indexing move, comments + @mentions/notifications, timelogs, activities) & tests | DONE | `server/src/models/{Project,Sprint,Task,Comment,Activity,TimeLog,Notification}.js`, `server/src/lib/activity.js`, `server/src/modules/{project,sprint,task,comment,timelog,activity,notification}.routes.js`, `server/tests/domain.test.js` |
| 4 | Socket.io (workspace room isolation, real-time events) & Reports API (burndown, velocity, workload, overdue) & tests | DONE | `server/src/lib/socket.js`, `server/src/modules/reports.routes.js`, `server/tests/socket-and-reports.test.js` |
| 5 | Client MVP (Auth, Workspaces, Projects, Kanban Board, Members, Socket Sync, Minimalist Design System) | DONE | `client/src/pages/*`, `client/src/components/*`, `client/src/lib/*`, `client/src/App.tsx` |
| 6 | Client techy minimal restyle & component transparency fix | DONE | `client/index.html`, `client/src/index.css`, `client/src/components/*`, `client/src/pages/*` |
| 7 | Mailer verify on startup, invite URL fallback, invite dialog copy-link UI | DONE | `server/src/lib/mailer.js`, `server/src/server.js`, `server/src/modules/invite.routes.js`, `server/tests/invite.test.js`, `client/src/components/InviteMemberDialog.tsx` |

## Files Created in Client MVP
- `client/src/lib/permissions.ts`: Typed copy of permissions matrix and `can` helper
- `client/src/lib/store.ts`: Persisted Zustand store for userToken, workspaceToken, and activeWorkspace
- `client/src/lib/api.ts`: Axios client attaching active token and socket id, redirects to /login on 401
- `client/src/lib/useSocket.ts`: Socket hook connecting with workspaceToken and syncing TanStack Query cache
- `client/src/components/ui/*`: Minimalist UI primitives (button, input, badge, dialog, sheet, skeleton)
- `client/src/components/AppLayout.tsx`: Slim left sidebar and top chrome with workspace switcher and user menu
- `client/src/components/KanbanColumn.tsx` & `KanbanCard.tsx`: Dnd-kit sortable columns and cards with guest restrictions
- `client/src/components/TaskDetailSheet.tsx`: Task details drawer with field edits and comments with @mentions
- `client/src/pages/LoginPage.tsx` & `RegisterPage.tsx`: Centered minimal auth pages
- `client/src/pages/WorkspacesPage.tsx`: Workspace selection and creation with switch
- `client/src/pages/AcceptInvitePage.tsx`: Auto-accept workspace invite route
- `client/src/pages/ProjectsPage.tsx`: Project list and create dialog
- `client/src/pages/ProjectBoardPage.tsx`: Kanban board with optimistic drag-and-drop and real-time sync
- `client/src/pages/MembersPage.tsx`: Member roster table with role select and invite dialog

## Known Issues
- None

## NEXT
- Verification and end-to-end testing
