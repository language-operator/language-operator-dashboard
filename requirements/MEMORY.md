# Agent Memory Bank

## Development Environment

### Running the App
- **Start**: `make dev` — builds image, loads into k3s, deploys with hostPath mounts, port-forwards to `localhost:3000`
- **Rebuild after dep changes**: `make dev-rebuild` (when `package.json` / `package-lock.json` changed)
- **Logs**: `make dev-logs`
- **Tear down**: `make dev-down`
- **Login**: `james@theryans.io` / `password123`
- ❌ **NEVER**: `npm run build` or `npm run dev` directly on the host (port conflicts, memory bloat)

### Port Conflict Debugging
- **Symptom**: Dashboard starts on port 3001 instead of 3000
- **Debug**: `netstat -tulpn | grep :3000`
- **Resolution**: `pgrep -f "npm run dev"` to find blocking processes

### Testing Protocol
- ✅ Manual testing before commit (Playwright for UI changes)
- ✅ Verify CI builds pass via `gh run watch`
- ✅ Test cluster-scoped CRUD workflows: `/clusters/[name]/{resource}/new`
- ❌ **NEVER commit untested code**

## Architecture Patterns

### API Structure
- All routes cluster-scoped: `/api/clusters/[name]/...` (no org prefix)
- k8s-client.ts triple-fallback: `response?.body?.items ?? response?.data?.items ?? response?.items ?? []`
- Error handling: Use `error instanceof Error`, avoid implicit any
- TypeScript: Strict mode compliance required

### Namespace Strategy
- **LanguageCluster** lives in `OPERATOR_NAMESPACE` (`process.env.OPERATOR_NAMESPACE || 'language-operator'`)
- **All sub-resources** (LanguageAgent, LanguageModel, LanguageTool, LanguagePersona, LanguageAgentSelfConfig) live in namespace named after their cluster (`clusterName`)
- **LanguageAgentRuntime** is cluster-scoped — use `listClusterCustomObject` / `createClusterCustomObject` etc.
- `validateClusterExists` always uses `OPERATOR_NAMESPACE` for cluster lookups

### NetworkPolicy Rules
- **Egress requirements**: Must have both `ports` AND `to` fields
- **Operator behavior**: Skips rules with `rule.To == nil`
- **Catalog vs CRD Format**: Tool catalog manifests have flat structure (`dns: []`), but CRD requires nesting (`to: { dns: [] }`)
- **Transformation**: `transformCatalogEntryToLanguageTool()` in `src/lib/tool-catalog.ts` handles this
- **Boolean Precedence**: Use `((rule.dns && rule.dns.length > 0) || rule.cidr) && {...}`

## Dev Environment Details

### Standalone Dev Postgres
- **Change**: Helm chart no longer provisions PostgreSQL; `make dev` now deploys its own Postgres pod (`k8s/dev/postgres.yaml`)
- **Connection**: `postgresql://dashboard:devpassword@dashboard-dev-postgres.language-operator.svc.cluster.local:5432/dashboard`

## RBAC

### Dev ClusterRole (`k8s/dev/rbac.yaml`)
- Service account `dashboard-dev` needs every langop CRD explicitly listed under `langop.io` resources
- `languageagentruntimes` added in issue #12 — new CRDs must be added here to work in dev
- `languageagentselfconfigs` added in issue #13
- Apply with `kubectl apply -f k8s/dev/rbac.yaml` after editing

## Common Issue Patterns

### TypeScript Errors
- **Pattern**: Null safety violations, implicit any usage
- **Solution**: Strict mode compliance, proper error type handling
- **Check**: `error instanceof Error` pattern for error handling

### Issue Investigation Thoroughness
- **Common mistake**: Fixing only the obvious symptom (e.g., Cancel button)
- **Complete fix**: Test all related navigation paths (e.g., Back arrow, breadcrumbs)
- **Pattern**: UI issues often affect multiple components sharing the same broken pattern

### Catalog Manifest Architecture
- **Anti-pattern**: Custom manifest formats that differ from CRD specs
- **Problem**: Requires error-prone transformation code (e.g., catalog format → LanguageTool CRD)
- **Root cause example**: Dashboard bug #7 - DNS fields stripped during catalog-to-CRD transformation
- **Better approach**: Store catalog manifests as valid CRD specs directly (filed in language-tools#9)
- **Principle**: Avoid abstraction layers between user input and Kubernetes when CRD format is sufficient
