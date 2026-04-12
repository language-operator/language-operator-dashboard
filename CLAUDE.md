# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Language Operator Dashboard is a Next.js web application that manages Language Operator Kubernetes clusters, agents, models, tools, and personas. It uses K8s RBAC (Rancher/Kubeflow model) for access control — no application-level organization system.

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

# Database migrations:
npm run db:migrate      # Push schema changes to database
npm run db:generate     # Generate Prisma client
npm run db:seed         # Seed database with initial data
```

### Testing
```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report
```

### Building
```bash
npm run build          # Build production bundle
npm run initialize-tenant   # Create admin user + K8s ClusterRoleBinding
```

### Running the App

**Preferred method** — Kubernetes (k3s):
```bash
# Requires: language-operator Helm chart deployed in k3s
make dev
```
Builds the dev image, loads into k3s, deploys a standalone Postgres pod (`dashboard-dev-postgres`), runs migrations, port-forwards to `localhost:3000`.

**Login**: `james@theryans.io` / `password123`

**Common Issues**:
- Port-forward conflict: `netstat -tulpn | grep :3000`
- Pod CrashLoop: `kubectl logs -n language-operator -l app=dashboard-dev --previous`
- Dependency changes: `make dev-rebuild`

Never run `npm run build` or `npm run dev` directly on the host for development.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM (User/Account/Session only — no org tables; dev uses a standalone in-cluster Postgres pod)
- **Auth**: NextAuth.js with email/password and OAuth
- **State Management**: Zustand (`src/store/sidebar-state.ts` only)
- **UI**: Radix UI + Tailwind CSS (custom Marfa design system — see `DESIGN_SYSTEM.md`)
- **Kubernetes**: @kubernetes/client-node for direct K8s API access

### Access Control Model

K8s RBAC via impersonation (no application-level roles):
- Every K8s API call is made impersonating the logged-in user's email address
- `src/lib/user-context.ts` — `getAuthenticatedUser(request)` returns `{ userId, email }` from session
- `src/lib/k8s-client.ts` — `k8sClient.forUser(email)` returns an impersonating client
- All API routes authenticate then call K8s as that user; K8s RBAC enforces what they can do
- `src/scripts/initialize-tenant.ts` — creates admin user in DB and binds their email to `langop-admin` ClusterRole

Required Helm chart ClusterRoles (managed in separate `language-operator` repo):
- `langop-admin` — full access to all `langop.io` resources cluster-wide
- `langop-cluster-admin` — full access in a cluster's namespace (created per-cluster by operator)
- `langop-cluster-viewer` — read-only in a cluster's namespace (created per-cluster by operator)

### Namespace Strategy

This is the most important architectural constraint:

- **LanguageCluster** resources live in `OPERATOR_NAMESPACE` (`process.env.OPERATOR_NAMESPACE || 'language-operator'`)
- **All sub-resources** (LanguageAgent, LanguageModel, LanguageTool, LanguagePersona) live in a namespace named after their cluster (i.e., `clusterName`)
- `validateClusterExists` and `validateClusterForResourceCreation` always use `OPERATOR_NAMESPACE` for cluster lookups
- All `listLanguage*`, `createLanguage*`, `getLanguage*`, etc. calls for sub-resources use `clusterName`

### Kubernetes Integration

Three config modes (checked in order in `src/lib/k8s-client.ts`):
1. **Env vars** (`KUBERNETES_SERVER_URL` + `KUBERNETES_TOKEN`) — production override
2. **In-cluster** — auto-detected when `/var/run/secrets/kubernetes.io/serviceaccount/` exists (k3s dev + production)
3. **Local kubeconfig** (`~/.kube/config`) — fallback when `NODE_ENV=development` and not in a pod

### API Architecture

All routes are flat — no org prefix:
- `GET/POST /api/clusters` — list/create LanguageClusters
- `/api/clusters/[name]/agents` — agents in that cluster's namespace
- `/api/clusters/[name]/models` — models
- `/api/clusters/[name]/tools` — tools
- `/api/clusters/[name]/personas` — personas
- `/api/clusters/[name]/counts` — resource counts
- `/api/watch/*` — SSE for real-time K8s resource watching
- `/api/auth/*` — NextAuth.js endpoints
- `/api/admin/*` — admin operations

`src/proxy.ts` — auth-only middleware; no org validation.

### K8s Client Response Handling

The k8s client returns different structures depending on mode. Always handle all three:
```typescript
const items = response?.body?.items      // live k8s
           ?? response?.data?.items      // alternate live
           ?? response?.items            // direct
           ?? []
```

### Watch Service (SSE)

`src/lib/watch-service.ts` manages real-time K8s resource updates via Server-Sent Events. Used by list pages for live updates. `src/lib/sse-watch-helper.ts` provides route-level helpers.

### Workspace Management

`src/lib/workspace-manager.ts` + `src/lib/workspace-client.ts` enable file browsing and terminal access inside agent pods via the Kubernetes exec API.

### Database Schema

Minimal — authentication only:
- `User`, `Account`, `Session`, `VerificationToken` (standard NextAuth.js models)
- No organization, membership, or invitation tables

## Key Patterns

### Catalog Manifest → CRD Transformation

Tool catalog entries use flat format; LanguageTool CRD requires nested `to` field:

```yaml
# Catalog (flat)           →    # CRD (nested)
egress:                          egress:
  - ports: [443]                   - ports: [443]
    dns: ["api.example.com"]         to:
                                       dns: ["api.example.com"]
```

`src/lib/tool-catalog.ts:transformCatalogEntryToLanguageTool()` handles this. Missing `to` field causes the operator to silently skip the rule.

### Egress Rule Validation

```typescript
// Always check both conditions — ports AND to.dns/to.cidr
((rule.dns && rule.dns.length > 0) || rule.cidr) && { to: { ... } }
```

### API Client

`src/lib/api-client.ts` — simple fetch wrappers, no org context. Use `fetch('/api/...')` directly or via `useApiClient()` hook. `fetchWithOrganization` and `fetchWithOrgUrl` still exist for backwards compatibility but are plain `fetch`.

### TypeScript Strictness

Strict mode is enabled. Always use `error instanceof Error` checks. No implicit `any`.

## CRDs Managed

- **LanguageCluster** — cluster definition (in operator namespace)
- **LanguageAgent** — AI agent instances (in cluster's namespace)
- **LanguageModel** — model configurations (in cluster's namespace)
- **LanguageTool** — external tool integrations with egress rules (in cluster's namespace)
- **LanguagePersona** — agent personality templates (in cluster's namespace)

## CI

Verify builds with: `gh run watch`
