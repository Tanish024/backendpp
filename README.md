# Project 13 – Multi-Tenant Project Management SaaS

Jira / Asana-style project management tool built for a college demo.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Server | Node 20, Express, Mongoose, Socket.io, Pino |
| Client | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| DB | MongoDB (Atlas in prod) |

## Getting Started

```bash
# server
cd server && cp .env.example .env && npm install && npm run dev

# client
cd client && cp .env.example .env && npm install && npm run dev
```

## Multi-Tenancy

Shared database, shared schema. Every tenant-owned document carries an indexed `workspaceId` injected via a central Mongoose plugin + `AsyncLocalStorage`. The workspace context comes exclusively from the verified JWT — never from request body, query or params.
