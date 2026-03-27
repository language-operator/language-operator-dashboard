# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Language Operator Dashboard is a Next.js web application that provides a management interface for Language Operator Kubernetes clusters, agents, models, and other resources. It combines multi-tenant organization management with direct Kubernetes API integration.

## Development Commands

### Setup and Running
```bash
# Start development environment — runs dashboard in k3s with FS mounts for hot reload
make dev

# Rebuild after dependency changes (package.json / package-lock.json)
make dev-rebuild

# Tail logs from the dev pod
make dev-logs

# Tear down dev resources from the cluster
make dev-down

# Database migrations (run inside the cluster via init container, or locally):
npm run db:migrate      # Push schema changes to database
npm run db:generate     # Generate Prisma client
npm run db:seed         # Seed database with initial data
npm run dev:seed        # Seed development data
```

### Testing
```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report
npm run test:organization   # Run organization-specific tests
```

### Building
```bash
npm run build          # Build production bundle (runs prebuild script first)
npm run start          # Start production server
```

### Scripts
```bash
npm run migrate:namespaces      # Migrate organization namespaces
npm run initialize-tenant       # Initialize tenant setup
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js with email/password and OAuth
- **State Management**: Zustand with persistence
- **UI**: Radix UI + Tailwind CSS (custom Marfa design system)
- **Kubernetes**: @kubernetes/client-node for direct K8s API access
- **Analytics**: ClickHouse for telemetry data

### Multi-Tenancy Model

Organizations map to Kubernetes namespaces with UUID-based naming:
- **Database**: `Organization.namespace` stores the K8s namespace (`org-xxxxxxxx` format)
- **URL Structure**: `/:org_id/...` for all organization-scoped routes
- **K8s Resources**: Scoped to organization's namespace
- **RBAC**: Role-based access (owner, admin, editor, viewer)

### Kubernetes Integration

The dashboard talks directly to Kubernetes clusters via three configuration modes:

1. **Environment Variables** (production):
   - `KUBERNETES_SERVER_URL` - K8s API server URL
   - `KUBERNETES_TOKEN` - Service account token
   - `KUBERNETES_SKIP_TLS_VERIFY` - Skip TLS verification (dev only)

2. **In-cluster** (k3s dev + production deployment):
   - Uses service account auto-mounted at `/var/run/secrets/kubernetes.io/serviceaccount/`
   - Detected automatically when running as a pod (even in `NODE_ENV=development`)
   - Loaded via `kc.loadFromCluster()`

3. **Local kubeconfig** (running `npm run dev` directly on host):
   - Loads `~/.kube/config` when `NODE_ENV=development` and not running in a pod
   - Used only for host-side testing, not the recommended dev path

See `src/lib/k8s-client.ts` for the singleton client implementation.

### API Architecture

**Organization-Scoped APIs**:
- Pattern: `/api/:org_id/...` (e.g., `/api/:org_id/clusters`)
- Organization context embedded in URL
- Middleware validates membership in `src/proxy.ts`

**Global APIs**:
- `/api/organizations` - List/create organizations
- `/api/auth/*` - Authentication endpoints
- `/api/invites/*` - Organization invitations

**Key API Routes**:
- `/api/:org_id/clusters/:name/*` - Cluster resources (agents, models, tools)
- `/api/:org_id/dashboard/counts` - Dashboard statistics
- `/api/:org_id/quota` - Organization resource quotas
- `/api/organizations/:id/members` - Team management
- `/api/watch/*` - Server-sent events for K8s resource watching

### State Management

**Zustand Stores**:
- `organization-store.ts` - Organizations, active org, members, invites (persisted)
- `sidebar-state.ts` - UI state for collapsible sidebar

**Organization Context**:
- `organization-provider.tsx` - React context provider
- `organization-context.ts` - Server-side utilities with caching
- `getOrgUrl()` - Helper to build org-scoped URLs (critical for navigation)

### Navigation Pattern

**Always use `getOrgUrl()` for organization-scoped routes:**
```typescript
import { useOrganization } from '@/components/organization-provider'

const { getOrgUrl } = useOrganization()
router.push(getOrgUrl('/settings/organizations'))  // ✓ Correct
router.push('/settings/organizations')              // ✗ Wrong - breaks org context
```

This pattern is critical because the app uses `/:org_id/...` URL structure. Hardcoded paths will cause 404 errors.

### Database Schema

**Core Models** (see `prisma/schema.prisma`):
- `User` - Authentication and user data
- `Account` / `Session` - NextAuth.js OAuth and sessions
- `Organization` - Multi-tenant organizations with K8s namespace mapping
- `OrganizationMember` - Team membership with RBAC roles
- `OrganizationInvite` - Email-based team invitations
- `Conversation` / `ConversationMessage` - Agent chat history

**Key Patterns**:
- Organizations have unique `namespace` field mapping to K8s namespace
- Organization slug is user-friendly identifier
- Cascade deletes configured for cleanup

### Workspace Management

The `WorkspaceManager` (`src/lib/workspace-manager.ts`) enables file browsing and terminal access to agent workspace pods. It uses Kubernetes exec API for running commands inside pods.

### Design System

Custom "Marfa" design system inspired by Donald Judd's minimalism and West Texas aesthetic. See `DESIGN_SYSTEM.md` for full details.

**Key Principles**:
- Extended letter-spacing for sculptural typography
- Stone/amber color palette (warm earth tones)
- Light font weight (300) only
- Generous spacing (48px padding)
- No rounded corners (pure geometry)
- Gradients that reveal warmth on interaction
- Supports light (desert day) and dark (desert night) modes

**Common Components** (Radix UI based):
- `src/components/ui/` - Base UI primitives
- `src/components/forms/` - Form components
- `src/components/agents/` - Agent-specific UI
- `src/components/organization/` - Organization management UI

## Key Patterns

### Catalog Manifest Transformation

Tool catalog entries must be transformed from flat manifest format to nested LanguageTool CRD format:

**Catalog Format** (flat):
```yaml
egress:
  - ports: [443]
    dns: ["api.example.com"]
```

**CRD Format** (nested):
```yaml
egress:
  - ports: [443]
    to:
      dns: ["api.example.com"]
```

See `src/lib/tool-catalog.ts:transformCatalogEntryToLanguageTool()` for implementation. The `to` field must wrap DNS/CIDR rules or the operator will skip them.

### Error Handling

**TypeScript Pattern**:
```typescript
try {
  // operation
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message)
  }
  // handle error
}
```

Always use `error instanceof Error` checks - never rely on implicit any.

### API Response Handling

K8s client returns different structures in demo vs live mode:
- **Demo mode**: `{ body: { items: [...] } }`
- **Live mode**: `{ data: { items: [] } }`

The k8s-client handles this normalization. Check implementation before writing API consumers.

### Watch Service (SSE)

Server-sent events for real-time K8s resource updates:
```typescript
// src/lib/watch-service.ts
// Manages WebSocket-like connections for resource watching
// Uses k8s.Watch with retry logic and error recovery
```

Used for live-updating lists of agents, models, clusters, etc.

## Development Workflow

### Environment Setup

**Environment variables** are managed by `make dev-secrets`, which reads `DATABASE_URL` from the Helm chart's secret and injects dev-specific values. No `.env` file is needed for k8s dev.

For running `npm run dev` directly on the host (rare), you'd need:
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname?schema=public"
NEXTAUTH_SECRET="random-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### Running the App

**Preferred Method - Kubernetes (k3s)**:
```bash
# Requires: language-operator Helm chart deployed in k3s
make dev
```
Builds the dev image, loads into k3s, deploys with source code mounted via hostPath for hot reload, runs migrations, and port-forwards to `localhost:3000`.

**Login**: `james@theryans.io` / `password123`

**Common Issues**:
- Port-forward conflict: port 3000 already in use — check with `netstat -tulpn | grep :3000`
- Helm chart not deployed: `make dev-secrets` will fail — deploy with `helm upgrade --install language-operator ../language-operator/chart -n language-operator --values ../language-operator/chart/values.local.yaml` first
- Pod CrashLoop: check init container logs with `kubectl logs -n language-operator -l app=dashboard-dev --previous`
- Dependency changes: run `make dev-rebuild` to rebuild the image with updated `node_modules`

### Testing Strategy

Manual testing before commits is critical. For UI changes, use Playwright tests in `.playwright-mcp/`.

Test cluster-scoped CRUD workflows at: `/:org_id/clusters/:name/{resource}/new`

Verify CI builds with: `gh run watch`

### Deployment

Never run `npm run build` or `npm run dev` directly on the host for development — use `make dev` so the process runs in-cluster with access to in-cluster services.

## Critical Patterns from MEMORY.md

### Navigation Anti-patterns
**Never hardcode organization paths**. This is the most common bug:
```typescript
// ✗ Wrong - breaks organization context
router.push('/settings/organizations')

// ✓ Correct - maintains org context
import { useOrganization } from '@/components/organization-provider'
const { getOrgUrl } = useOrganization()
router.push(getOrgUrl('/settings/organizations'))
```

Search codebase for `router.push('/settings` to find violations.

### NetworkPolicy Egress Rules
When working with NetworkPolicy or LanguageTool CRDs:
- Egress rules MUST have both `ports` AND `to` fields
- Missing `to` field causes operator to skip the rule silently
- Use parentheses carefully: `((rule.dns && rule.dns.length > 0) || rule.cidr) && {...}`

### Infrastructure Debugging
Never invent explanations for unexpected behavior. Always investigate:
```bash
# Port conflicts
netstat -tulpn | grep :3000
pgrep -f "npm run dev"

# Process inspection
lsof -i :3000
```

### TypeScript Strictness
This project uses strict TypeScript mode:
- No implicit `any` types allowed
- Always use `error instanceof Error` checks
- Proper null safety required

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup, invites)
│   ├── [org_id]/          # Organization-scoped pages
│   │   └── (dashboard)/   # Main dashboard routes
│   └── api/               # API routes (REST + SSE)
├── components/            # React components
│   ├── ui/               # Base UI primitives (Radix UI)
│   ├── agents/           # Agent management UI
│   ├── organization/     # Org management components
│   └── ...               # Domain-specific components
├── lib/                   # Core utilities
│   ├── k8s-client.ts     # Kubernetes client singleton
│   ├── workspace-manager.ts  # Pod exec and file browsing
│   ├── organization-context.ts  # Server-side org utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   └── ...               # Domain utilities
├── hooks/                 # React hooks
├── store/                 # Zustand stores
├── types/                 # TypeScript type definitions
└── scripts/              # Utility scripts

prisma/
└── schema.prisma         # Database schema

requirements/             # Design docs and personas
├── MEMORY.md            # Critical development patterns
├── personas/            # User persona definitions
└── tasks/              # Task templates
```

## Custom Resource Definitions (CRDs)

The dashboard manages several Language Operator CRDs:
- **LanguageAgent** - AI agent instances
- **LanguageModel** - Model configurations
- **LanguageTool** - External tool integrations
- **LanguagePersona** - Agent personality templates

All resources are namespace-scoped to organizations.
