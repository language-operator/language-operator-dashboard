# k3s stores imported images with the docker.io/library/ prefix
DEV_IMAGE  := docker.io/library/language-operator-dashboard-dev
GIT_SHA    := $(shell git rev-parse --short HEAD)
SRC_PATH   := $(shell pwd)
NAMESPACE  := language-operator

CHART_RELEASE := language-operator-dashboard

.PHONY: dev dev-image dev-secrets dev-apply dev-forward dev-down dev-logs dev-rebuild dev-supervisor install

# Full dev startup: build image, create secrets, apply manifests, port-forward
dev: dev-image dev-secrets dev-apply dev-forward

# Build dev image and load into k3s (no registry needed)
dev-image:
	docker build -f Dockerfile.dev -t $(DEV_IMAGE):$(GIT_SHA) .
	docker save $(DEV_IMAGE):$(GIT_SHA) | sudo k3s ctr images import -
	sudo k3s ctr images tag $(DEV_IMAGE):$(GIT_SHA) $(DEV_IMAGE):dev

# Create/update the dev config secret
dev-secrets:
	kubectl create secret generic dashboard-dev-config \
		--from-literal=NEXTAUTH_SECRET="dev-secret-not-for-production" \
		--from-literal=NEXTAUTH_URL="http://localhost:3000" \
		--from-literal=NODE_ENV="development" \
		--namespace=$(NAMESPACE) \
		--dry-run=client -o yaml | kubectl apply -f -

# Apply RBAC and deployment manifests, then wait for rollout
dev-apply:
	kubectl apply -f k8s/dev/rbac.yaml
	sed "s|SRC_PATH_PLACEHOLDER|$(SRC_PATH)|g" k8s/dev/deployment.yaml | kubectl apply -f -
	kubectl rollout restart deployment/dashboard-dev -n $(NAMESPACE)
	kubectl rollout status deployment/dashboard-dev -n $(NAMESPACE) --timeout=5m

# Port-forward to localhost:3000 (blocks; run in a separate terminal or use & to background)
dev-forward:
	@echo "Dashboard available at http://localhost:3000"
	kubectl port-forward -n $(NAMESPACE) deployment/dashboard-dev 3000:3000

# Remove dev resources from the cluster
dev-down:
	kubectl delete deployment dashboard-dev -n $(NAMESPACE) --ignore-not-found
	kubectl delete secret dashboard-dev-config -n $(NAMESPACE) --ignore-not-found
	kubectl delete -f k8s/dev/rbac.yaml --ignore-not-found

# Tail logs from the dev pod
dev-logs:
	kubectl logs -n $(NAMESPACE) -l app=dashboard-dev -f --tail=100

# Rebuild image and redeploy (use after dependency changes)
dev-rebuild: dev-image dev-apply

# Install or upgrade the chart using chart/values.local.yaml for local overrides
install:
	helm upgrade --install $(CHART_RELEASE) ./chart \
		--namespace $(NAMESPACE) \
		--create-namespace \
		$(if $(wildcard chart/values.local.yaml),--values chart/values.local.yaml,) \
		--wait

dev-supervisor:
	claude "/delegate"

dev-worker-%:
	claude "/watch $*"

# Show help
help:
	@echo "Targets:"
	@echo "  dev          - Full dev startup (build, secrets, deploy, port-forward)"
	@echo "  dev-image    - Build dev image and load into k3s"
	@echo "  dev-secrets  - Create/update dev config secret"
	@echo "  dev-apply    - Apply RBAC and deployment manifests"
	@echo "  dev-forward  - Port-forward dashboard to localhost:3000"
	@echo "  dev-logs     - Tail logs from the dev pod"
	@echo "  dev-down     - Remove dev resources from the cluster"
	@echo "  dev-rebuild  - Rebuild image and redeploy (after dependency changes)"
	@echo "  install      - Helm install/upgrade using chart/values.local.yaml"
	@echo "  dev-supervisor   - Run the supervisor agent (triage issues into queues)"
	@echo "  dev-worker-N     - Run worker agent for queue N (0, 1, or 2)"
